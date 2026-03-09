import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { storefrontApiRequest } from '@/lib/shopify';

interface MatrixEntry {
  id?: string;
  groomer_id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  pet_size: string;
  groom_level: number;
  duration_minutes: number;
}

interface ShopifyVariant {
  id: string;           // full GID
  numericId: string;    // numeric ID
  title: string;        // e.g. "Small / Level 1"
  price: { amount: string; currencyCode: string };
  selectedOptions: Array<{ name: string; value: string }>;
}

interface ShopifyProductData {
  productId: string;
  productTitle: string;
  options: Array<{ name: string; values: string[] }>;
  variants: ShopifyVariant[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groomerId: string;
  groomerName: string;
}

function getNumericId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

export function ServiceMatrixEditor({ open, onOpenChange, groomerId, groomerName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch grooming products + variants + options from Shopify
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['grooming-collection-products-full'],
    queryFn: async () => {
      const { data: mappings, error } = await supabase
        .from('shopify_collection_mappings')
        .select('shopify_collection_id')
        .eq('category', 'services');
      if (error) throw error;
      if (!mappings || mappings.length === 0) return [];

      const allProducts: ShopifyProductData[] = [];
      const seenIds = new Set<string>();

      for (const mapping of mappings) {
        const gid = `gid://shopify/Collection/${mapping.shopify_collection_id}`;
        const result = await storefrontApiRequest(`
          query GetCollectionProducts($id: ID!) {
            node(id: $id) {
              ... on Collection {
                products(first: 50) {
                  edges {
                    node {
                      id
                      title
                      options { name values }
                      variants(first: 100) {
                        edges {
                          node {
                            id
                            title
                            price { amount currencyCode }
                            selectedOptions { name value }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `, { id: gid });

        const edges = result?.data?.node?.products?.edges || [];
        for (const p of edges) {
          const productId = getNumericId(p.node.id);
          if (seenIds.has(productId)) continue;
          seenIds.add(productId);

          allProducts.push({
            productId,
            productTitle: p.node.title,
            options: p.node.options || [],
            variants: (p.node.variants?.edges || []).map((v: any) => ({
              id: v.node.id,
              numericId: getNumericId(v.node.id),
              title: v.node.title,
              price: v.node.price,
              selectedOptions: v.node.selectedOptions || [],
            })),
          });
        }
      }
      return allProducts;
    },
    enabled: open,
  });

  // Fetch existing matrix entries for this groomer
  const { data: existingEntries, isLoading } = useQuery({
    queryKey: ['service-matrix', groomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomer_service_matrix')
        .select('*')
        .eq('groomer_id', groomerId);
      if (error) throw error;
      return data as MatrixEntry[];
    },
    enabled: open && !!groomerId,
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  // Map of variantNumericId -> duration_minutes
  const [durationMap, setDurationMap] = useState<Record<string, number>>({});

  const selectedProduct = products?.find(p => p.productId === selectedProductId) || null;

  // Derive matrix axes from product options
  const rowOption = selectedProduct?.options[0]; // e.g. Size
  const colOption = selectedProduct?.options[1]; // e.g. Difficulty/Level

  // Build duration map when product changes
  useEffect(() => {
    if (!selectedProduct || !existingEntries) return;

    const map: Record<string, number> = {};
    for (const variant of selectedProduct.variants) {
      const existing = existingEntries.find(
        e => e.shopify_product_id === selectedProduct.productId && e.shopify_variant_id === variant.numericId
      );
      map[variant.numericId] = existing?.duration_minutes ?? 60;
    }
    setDurationMap(map);
  }, [selectedProductId, selectedProduct, existingEntries, groomerId]);

  // Find variant by option values
  const findVariant = (rowValue: string, colValue?: string): ShopifyVariant | undefined => {
    if (!selectedProduct) return undefined;
    return selectedProduct.variants.find(v => {
      if (!rowOption) return false;
      const hasRow = v.selectedOptions.some(o => o.name === rowOption.name && o.value === rowValue);
      if (!colOption || !colValue) return hasRow;
      const hasCol = v.selectedOptions.some(o => o.name === colOption.name && o.value === colValue);
      return hasRow && hasCol;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error('No product selected');

      // Delete existing entries for this product
      await supabase
        .from('groomer_service_matrix')
        .delete()
        .eq('groomer_id', groomerId)
        .eq('shopify_product_id', selectedProduct.productId);

      // Build insert rows — we store option1 value in pet_size and option2 index+1 in groom_level for compatibility
      const rows = selectedProduct.variants.map(v => {
        const opt1 = rowOption ? v.selectedOptions.find(o => o.name === rowOption.name)?.value || '' : '';
        const opt2 = colOption ? v.selectedOptions.find(o => o.name === colOption.name)?.value || '' : '';
        const levelIndex = colOption ? colOption.values.indexOf(opt2) + 1 : 1;

        return {
          groomer_id: groomerId,
          shopify_product_id: selectedProduct.productId,
          shopify_variant_id: v.numericId,
          pet_size: opt1,
          groom_level: levelIndex,
          duration_minutes: durationMap[v.numericId] ?? 60,
        };
      });

      const { error } = await supabase.from('groomer_service_matrix').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-matrix', groomerId] });
      toast({ title: 'Matrix Saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const hasExistingEntries = (productId: string) => {
    return existingEntries?.some(e => e.shopify_product_id === productId);
  };

  // Render the matrix: single-option products get a simple list, two-option products get a grid
  const renderMatrix = () => {
    if (!selectedProduct || !rowOption) return null;

    // Single option product — simple table with one column for duration
    if (!colOption) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{rowOption.name}</TableHead>
              <TableHead className="text-center">Duration (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowOption.values.map(rowVal => {
              const variant = findVariant(rowVal);
              if (!variant) return null;
              return (
                <TableRow key={variant.numericId}>
                  <TableCell className="font-medium">{rowVal}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number" min={15} max={480} step={15}
                      className="w-20 mx-auto text-center"
                      value={durationMap[variant.numericId] ?? 60}
                      onChange={(e) => setDurationMap(prev => ({
                        ...prev,
                        [variant.numericId]: parseInt(e.target.value) || 60,
                      }))}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    }

    // Two option product — full grid
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{rowOption.name} / {colOption.name}</TableHead>
            {colOption.values.map(colVal => (
              <TableHead key={colVal} className="text-center text-xs">{colVal}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowOption.values.map(rowVal => (
            <TableRow key={rowVal}>
              <TableCell className="font-medium">{rowVal}</TableCell>
              {colOption.values.map(colVal => {
                const variant = findVariant(rowVal, colVal);
                if (!variant) {
                  return <TableCell key={colVal} className="text-center text-muted-foreground text-xs">—</TableCell>;
                }
                return (
                  <TableCell key={colVal} className="text-center">
                    <Input
                      type="number" min={15} max={480} step={15}
                      className="w-20 mx-auto text-center"
                      value={durationMap[variant.numericId] ?? 60}
                      onChange={(e) => setDurationMap(prev => ({
                        ...prev,
                        [variant.numericId]: parseInt(e.target.value) || 60,
                      }))}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Duration Matrix — {groomerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grooming Service</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grooming service..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingProducts ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  products?.map(p => (
                    <SelectItem key={p.productId} value={p.productId}>
                      <span className="flex items-center gap-2">
                        {p.productTitle}
                        <span className="text-xs text-muted-foreground">
                          ({p.variants.length} variant{p.variants.length !== 1 ? 's' : ''})
                        </span>
                        {hasExistingEntries(p.productId) && (
                          <span className="text-xs text-primary">✓</span>
                        )}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
              <p className="text-sm text-muted-foreground">
                Set duration (minutes) for each variant of{' '}
                <span className="font-medium text-foreground">{selectedProduct.productTitle}</span>
              </p>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {renderMatrix()}
                  <p className="text-xs text-muted-foreground mt-2">All values in minutes.</p>
                </div>
              )}

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Matrix
              </Button>
            </>
          )}

          {!isLoadingProducts && !products?.length && (
            <p className="text-sm text-muted-foreground">
              No grooming services mapped. Map Shopify grooming products in Shopify Settings first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
