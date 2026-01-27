import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Clock, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'fella-fetch.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'a04512bd10f188f5e1fe71bf8bb4517f';

interface GroomerDurationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groomerId: string;
  groomerName: string;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
}

interface ShopifyProduct {
  id: string;
  title: string;
  variants: { edges: Array<{ node: ShopifyVariant }> };
}

interface DurationEntry {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  duration: number;
  hasChanged: boolean;
}

const COLLECTION_PRODUCTS_QUERY = `
  query GetCollectionProducts($handle: String!) {
    collection(handle: $handle) {
      products(first: 100) {
        edges {
          node {
            id
            title
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchGroomProducts(): Promise<ShopifyProduct[]> {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ 
      query: COLLECTION_PRODUCTS_QUERY,
      variables: { handle: 'groom' }
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Shopify error: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return data.data.collection?.products?.edges?.map((edge: { node: ShopifyProduct }) => edge.node) || [];
}

export function GroomerDurationsDialog({
  open,
  onOpenChange,
  groomerId,
  groomerName,
}: GroomerDurationsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [durations, setDurations] = useState<Record<string, DurationEntry>>({});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Shopify products
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['shopify-groom-products'],
    queryFn: fetchGroomProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch existing durations for this groomer
  const { data: existingDurations, isLoading: isLoadingDurations } = useQuery({
    queryKey: ['groomer-durations', groomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groomer_service_durations')
        .select('*')
        .eq('groomer_id', groomerId);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!groomerId,
  });

  // Initialize durations when data loads
  useEffect(() => {
    if (products && existingDurations !== undefined) {
      const durationMap: Record<string, DurationEntry> = {};
      
      products.forEach((product) => {
        product.variants.edges.forEach(({ node: variant }) => {
          const existing = existingDurations?.find(
            (d) => d.shopify_variant_id === variant.id
          );
          
          durationMap[variant.id] = {
            variantId: variant.id,
            productId: product.id,
            productTitle: product.title,
            variantTitle: variant.title,
            duration: existing?.duration_minutes ?? 60,
            hasChanged: false,
          };
        });
      });
      
      setDurations(durationMap);
      
      // Auto-expand all products initially
      setExpandedProducts(new Set(products.map((p) => p.id)));
    }
  }, [products, existingDurations]);

  const handleDurationChange = (variantId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setDurations((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        duration: numValue,
        hasChanged: true,
      },
    }));
  };

  const handleSave = async () => {
    const changedEntries = Object.values(durations).filter((d) => d.hasChanged);
    if (changedEntries.length === 0) {
      toast({ title: 'No changes', description: 'No durations were modified' });
      return;
    }

    setIsSaving(true);
    try {
      // Upsert all changed durations
      for (const entry of changedEntries) {
        const existing = existingDurations?.find(
          (d) => d.shopify_variant_id === entry.variantId
        );

        if (existing) {
          await supabase
            .from('groomer_service_durations')
            .update({ duration_minutes: entry.duration })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('groomer_service_durations')
            .insert({
              groomer_id: groomerId,
              shopify_product_id: entry.productId,
              shopify_variant_id: entry.variantId,
              duration_minutes: entry.duration,
            });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['groomer-durations', groomerId] });
      toast({ title: 'Saved', description: `Updated ${changedEntries.length} duration(s)` });
      
      // Reset changed flags
      setDurations((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = { ...updated[key], hasChanged: false };
        });
        return updated;
      });
    } catch (error) {
      console.error('Error saving durations:', error);
      toast({ title: 'Error', description: 'Failed to save durations', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const hasChanges = Object.values(durations).some((d) => d.hasChanged);
  const isLoading = isLoadingProducts || isLoadingDurations;

  // Group durations by product
  const groupedByProduct = products?.map((product) => ({
    product,
    variants: product.variants.edges.map(({ node }) => ({
      ...node,
      entry: durations[node.id],
    })),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Service Durations for {groomerName}
          </DialogTitle>
          <DialogDescription>
            Set how long each grooming service typically takes for this groomer. 
            These durations will be used when booking appointments.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-2">
                {groupedByProduct?.map(({ product, variants }) => (
                  <Collapsible
                    key={product.id}
                    open={expandedProducts.has(product.id)}
                    onOpenChange={() => toggleProduct(product.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {expandedProducts.has(product.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{product.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {variants.length} variant{variants.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {variants.some((v) => v.entry?.hasChanged) && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Modified
                          </Badge>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-2 border-l-2 border-muted pl-4 pb-2">
                        {variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between gap-4 py-2 px-3 rounded-md hover:bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {variant.title === 'Default Title' ? product.title : variant.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ${parseFloat(variant.price.amount).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`duration-${variant.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                Duration:
                              </Label>
                              <Input
                                id={`duration-${variant.id}`}
                                type="number"
                                min={5}
                                max={480}
                                step={5}
                                value={variant.entry?.duration ?? 60}
                                onChange={(e) => handleDurationChange(variant.id, e.target.value)}
                                className={`w-20 h-8 text-center ${variant.entry?.hasChanged ? 'border-amber-400 bg-amber-50' : ''}`}
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
