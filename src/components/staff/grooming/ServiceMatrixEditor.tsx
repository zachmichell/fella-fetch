import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface GroomingProduct {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groomerId: string;
  groomerName: string;
}

// Extract numeric ID from Shopify GID
function getNumericId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

export function ServiceMatrixEditor({ open, onOpenChange, groomerId, groomerName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch grooming products from Shopify via collection mappings (services category = GROOM)
  const { data: groomingProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['grooming-collection-products'],
    queryFn: async () => {
      // Get the services collection mappings (where GROOM is mapped)
      const { data: mappings, error } = await supabase
        .from('shopify_collection_mappings')
        .select('shopify_collection_id, shopify_collection_title')
        .eq('category', 'services');
      if (error) throw error;
      if (!mappings || mappings.length === 0) return [];

      const allProducts: GroomingProduct[] = [];
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
                    }
                  }
                }
              }
            }
          }
        `, { id: gid });

        const products = result?.data?.node?.products?.edges || [];
        for (const p of products) {
          const numericId = getNumericId(p.node.id);
          if (!seenIds.has(numericId)) {
            seenIds.add(numericId);
            allProducts.push({ id: numericId, title: p.node.title });
          }
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

  const [selectedProduct, setSelectedProduct] = useState('');
  const [entries, setEntries] = useState<MatrixEntry[]>([]);

  // Build a grid of all size/level combos for the selected product
  useEffect(() => {
    if (!selectedProduct || !existingEntries) return;

    const productEntries = existingEntries.filter(
      e => e.shopify_product_id === selectedProduct
    );

    // Build full grid
    const grid: MatrixEntry[] = [];
    for (const size of PET_SIZES) {
      for (const level of GROOM_LEVELS) {
        const existing = productEntries.find(
          e => e.pet_size === size && e.groom_level === level
        );
        grid.push(existing || {
          groomer_id: groomerId,
          shopify_product_id: selectedProduct,
          shopify_variant_id: selectedProduct, // use product id as variant fallback
          pet_size: size,
          groom_level: level,
          duration_minutes: 60,
        });
      }
    }
    setEntries(grid);
  }, [selectedProduct, existingEntries, groomerId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing entries for this product
      await supabase
        .from('groomer_service_matrix')
        .delete()
        .eq('groomer_id', groomerId)
        .eq('shopify_product_id', selectedProduct);

      // Insert all entries
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Service Duration Matrix — {groomerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grooming Service</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grooming service..." />
              </SelectTrigger>
              <SelectContent>
                {groomingProducts?.map(p => (
                  <SelectItem key={p.shopify_product_id} value={p.shopify_product_id}>
                    {p.shopify_product_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
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
                          <TableHead key={l} className="text-center">{LEVEL_LABELS[l]}</TableHead>
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

          {!groomingProducts?.length && !isLoading && (
            <p className="text-sm text-muted-foreground">
              No grooming services mapped. Map Shopify grooming products in Shopify Settings first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
