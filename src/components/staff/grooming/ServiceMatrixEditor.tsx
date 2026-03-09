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

const PET_SIZES = ['Small', 'Medium', 'Large', 'XL'] as const;
const GROOM_LEVELS = [1, 2, 3, 4] as const;
const LEVEL_LABELS: Record<number, string> = {
  1: 'L1 — Well maintained',
  2: 'L2 — Minor tangles',
  3: 'L3 — Matted',
  4: 'L4 — Severely matted',
};

interface MatrixEntry {
  id?: string;
  groomer_id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  pet_size: string;
  groom_level: number;
  duration_minutes: number;
}

interface GroomingVariant {
  variantId: string;       // numeric Shopify variant ID
  variantTitle: string;
  productId: string;       // numeric Shopify product ID
  productTitle: string;
  price: string;
  currencyCode: string;
}

interface GroomingProductGroup {
  productId: string;
  productTitle: string;
  variants: GroomingVariant[];
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

  // Fetch grooming products + variants from Shopify via collection mappings
  const { data: productGroups, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['grooming-collection-products-variants'],
    queryFn: async () => {
      const { data: mappings, error } = await supabase
        .from('shopify_collection_mappings')
        .select('shopify_collection_id, shopify_collection_title')
        .eq('category', 'services');
      if (error) throw error;
      if (!mappings || mappings.length === 0) return [];

      const groups: GroomingProductGroup[] = [];
      const seenProductIds = new Set<string>();

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
                      variants(first: 50) {
                        edges {
                          node {
                            id
                            title
                            price { amount currencyCode }
                            availableForSale
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

        const products = result?.data?.node?.products?.edges || [];
        for (const p of products) {
          const productId = getNumericId(p.node.id);
          if (seenProductIds.has(productId)) continue;
          seenProductIds.add(productId);

          const variants: GroomingVariant[] = (p.node.variants?.edges || []).map((v: any) => ({
            variantId: getNumericId(v.node.id),
            variantTitle: v.node.title,
            productId,
            productTitle: p.node.title,
            price: v.node.price?.amount || '0',
            currencyCode: v.node.price?.currencyCode || 'CAD',
          }));

          groups.push({
            productId,
            productTitle: p.node.title,
            variants,
          });
        }
      }
      return groups;
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

  // Selected variant key: "productId::variantId"
  const [selectedKey, setSelectedKey] = useState('');
  const [entries, setEntries] = useState<MatrixEntry[]>([]);

  const selectedVariant = (() => {
    if (!selectedKey || !productGroups) return null;
    const [productId, variantId] = selectedKey.split('::');
    for (const group of productGroups) {
      if (group.productId === productId) {
        return group.variants.find(v => v.variantId === variantId) || null;
      }
    }
    return null;
  })();

  // Build grid when variant is selected
  useEffect(() => {
    if (!selectedVariant || !existingEntries) return;

    const variantEntries = existingEntries.filter(
      e => e.shopify_product_id === selectedVariant.productId && e.shopify_variant_id === selectedVariant.variantId
    );

    const grid: MatrixEntry[] = [];
    for (const size of PET_SIZES) {
      for (const level of GROOM_LEVELS) {
        const existing = variantEntries.find(
          e => e.pet_size === size && e.groom_level === level
        );
        grid.push(existing || {
          groomer_id: groomerId,
          shopify_product_id: selectedVariant.productId,
          shopify_variant_id: selectedVariant.variantId,
          pet_size: size,
          groom_level: level,
          duration_minutes: 60,
        });
      }
    }
    setEntries(grid);
  }, [selectedKey, selectedVariant, existingEntries, groomerId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVariant) throw new Error('No variant selected');

      // Delete existing entries for this product+variant
      await supabase
        .from('groomer_service_matrix')
        .delete()
        .eq('groomer_id', groomerId)
        .eq('shopify_product_id', selectedVariant.productId)
        .eq('shopify_variant_id', selectedVariant.variantId);

      const { error } = await supabase
        .from('groomer_service_matrix')
        .insert(entries.map(e => ({
          groomer_id: e.groomer_id,
          shopify_product_id: e.shopify_product_id,
          shopify_variant_id: e.shopify_variant_id,
          pet_size: e.pet_size,
          groom_level: e.groom_level,
          duration_minutes: e.duration_minutes,
        })));
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

  const updateDuration = (size: string, level: number, mins: number) => {
    setEntries(prev => prev.map(e =>
      e.pet_size === size && e.groom_level === level
        ? { ...e, duration_minutes: mins }
        : e
    ));
  };

  // Count how many variants already have matrix entries for this groomer
  const getVariantEntryCount = (productId: string, variantId: string) => {
    if (!existingEntries) return 0;
    return existingEntries.filter(e => e.shopify_product_id === productId && e.shopify_variant_id === variantId).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Duration Matrix — {groomerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grooming Service (Product / Variant)</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service variant..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingProducts ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  productGroups?.map(group => (
                    <SelectGroup key={group.productId}>
                      <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.productTitle}
                      </SelectLabel>
                      {group.variants.map(v => {
                        const key = `${v.productId}::${v.variantId}`;
                        const entryCount = getVariantEntryCount(v.productId, v.variantId);
                        const hasEntries = entryCount > 0;
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {v.variantTitle === 'Default Title' ? group.productTitle : v.variantTitle}
                              <span className="text-muted-foreground text-xs">
                                ${parseFloat(v.price).toFixed(2)}
                              </span>
                              {hasEntries && (
                                <span className="text-xs text-primary">✓</span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedVariant && (
            <>
              <p className="text-sm text-muted-foreground">
                Configuring durations for <span className="font-medium text-foreground">{selectedVariant.productTitle}</span>
                {selectedVariant.variantTitle !== 'Default Title' && (
                  <> — <span className="font-medium text-foreground">{selectedVariant.variantTitle}</span></>
                )}
                {' '}(${parseFloat(selectedVariant.price).toFixed(2)} {selectedVariant.currencyCode})
              </p>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size / Level</TableHead>
                        {GROOM_LEVELS.map(l => (
                          <TableHead key={l} className="text-center text-xs">{LEVEL_LABELS[l]}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PET_SIZES.map(size => (
                        <TableRow key={size}>
                          <TableCell className="font-medium">{size}</TableCell>
                          {GROOM_LEVELS.map(level => {
                            const entry = entries.find(e => e.pet_size === size && e.groom_level === level);
                            return (
                              <TableCell key={level} className="text-center">
                                <Input
                                  type="number"
                                  min={15}
                                  max={480}
                                  step={15}
                                  className="w-20 mx-auto text-center"
                                  value={entry?.duration_minutes || 60}
                                  onChange={(e) => updateDuration(size, level, parseInt(e.target.value) || 60)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

          {!isLoadingProducts && !productGroups?.length && (
            <p className="text-sm text-muted-foreground">
              No grooming services mapped. Map Shopify grooming products in Shopify Settings first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
