import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShoppingCart, Sun, BedDouble, Plus, Minus } from 'lucide-react';
import { storefrontApiRequest } from '@/lib/shopify';

interface SendCreditPurchaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSend: (content: string, data: CreditPurchaseData) => Promise<void>;
}

export interface CreditPurchaseData {
  type: 'credit_purchase';
  products: CreditProduct[];
  message?: string;
  status: 'pending' | 'purchased';
}

export interface CreditProduct {
  shopifyProductId: string;
  shopifyProductTitle: string;
  shopifyVariantId: string;
  shopifyVariantTitle: string;
  price: string;
  currencyCode: string;
  creditType: 'daycare' | 'half_daycare' | 'boarding';
  creditValue: number;
  quantity: number;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
}

interface ShopifyProductNode {
  id: string;
  title: string;
  variants: { edges: Array<{ node: ShopifyVariant }> };
}

interface ServiceMapping {
  id: string;
  service_type: 'daycare' | 'boarding' | 'grooming' | 'training';
  shopify_product_id: string;
  shopify_product_title: string;
  credit_value: number | null;
}

interface SelectedProduct {
  variantId: string;
  quantity: number;
}

export function SendCreditPurchase({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName,
  onSend 
}: SendCreditPurchaseProps) {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch service mappings for daycare and boarding
  const { data: serviceMappings = [], isLoading: isMappingsLoading } = useQuery({
    queryKey: ['credit-service-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_service_mappings')
        .select('*')
        .in('service_type', ['daycare', 'boarding']);
      
      if (error) throw error;
      return data as ServiceMapping[];
    },
    enabled: open,
  });

  // Fetch Shopify product details for mapped products
  const { data: shopifyProducts = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['shopify-credit-products', serviceMappings.map(m => m.shopify_product_id)],
    queryFn: async () => {
      if (!serviceMappings.length) return [];

      // Extract numeric IDs
      const productIds = serviceMappings.map(m => {
        const match = m.shopify_product_id.match(/Product\/(\d+)/);
        return match ? match[1] : m.shopify_product_id;
      });

      const query = `
        query GetProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      `;

      const gids = productIds.map(id => `gid://shopify/Product/${id}`);
      const data = await storefrontApiRequest(query, { ids: gids });
      return (data?.data?.nodes || []).filter(Boolean) as ShopifyProductNode[];
    },
    enabled: open && serviceMappings.length > 0,
  });

  // Build list of available credit products
  const creditProducts: Omit<CreditProduct, 'quantity'>[] = [];
  
  serviceMappings.forEach(mapping => {
    const product = shopifyProducts.find(p => {
      const mappingNumericId = mapping.shopify_product_id.match(/Product\/(\d+)/)?.[1] || mapping.shopify_product_id;
      const productNumericId = p.id.match(/Product\/(\d+)/)?.[1] || p.id;
      return mappingNumericId === productNumericId;
    });

    if (product) {
      product.variants.edges.forEach(({ node: variant }) => {
        // Determine credit type based on service type and variant title
        let creditType: 'daycare' | 'half_daycare' | 'boarding' = mapping.service_type as any;
        if (mapping.service_type === 'daycare') {
          // Check if it's a half day variant
          const isHalfDay = variant.title.toLowerCase().includes('half') || 
                           product.title.toLowerCase().includes('half');
          creditType = isHalfDay ? 'half_daycare' : 'daycare';
        }

        creditProducts.push({
          shopifyProductId: product.id,
          shopifyProductTitle: product.title,
          shopifyVariantId: variant.id,
          shopifyVariantTitle: variant.title,
          price: variant.price.amount,
          currencyCode: variant.price.currencyCode,
          creditType,
          creditValue: mapping.credit_value || 1,
        });
      });
    }
  });

  const toggleProduct = (variantId: string) => {
    const newSelected = new Map(selectedProducts);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.set(variantId, 1);
    }
    setSelectedProducts(newSelected);
  };

  const updateQuantity = (variantId: string, delta: number) => {
    const newSelected = new Map(selectedProducts);
    const currentQty = newSelected.get(variantId) || 1;
    const newQty = Math.max(1, currentQty + delta);
    newSelected.set(variantId, newQty);
    setSelectedProducts(newSelected);
  };

  const setQuantity = (variantId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts);
    newSelected.set(variantId, Math.max(1, quantity));
    setSelectedProducts(newSelected);
  };

  const handleSend = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'No products selected',
        description: 'Please select at least one credit package to send',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const products: CreditProduct[] = creditProducts
        .filter(p => selectedProducts.has(p.shopifyVariantId))
        .map(p => ({
          ...p,
          quantity: selectedProducts.get(p.shopifyVariantId) || 1,
        }));
      
      const purchaseData: CreditPurchaseData = {
        type: 'credit_purchase',
        products,
        message: message || undefined,
        status: 'pending',
      };

      await onSend('', purchaseData);
      onOpenChange(false);
      
      // Reset form
      setSelectedProducts(new Map());
      setMessage('');

      toast({
        title: 'Credit purchase card sent',
        description: `${clientName} can now purchase credits directly from the chat.`,
      });
    } catch (error) {
      console.error('Error sending credit purchase:', error);
      toast({
        title: 'Error',
        description: 'Failed to send credit purchase card',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCreditTypeIcon = (type: 'daycare' | 'half_daycare' | 'boarding') => {
    switch (type) {
      case 'boarding':
        return <BedDouble className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const getCreditTypeLabel = (type: 'daycare' | 'half_daycare' | 'boarding') => {
    switch (type) {
      case 'daycare':
        return 'Full Day Daycare';
      case 'half_daycare':
        return 'Half Day Daycare';
      case 'boarding':
        return 'Boarding';
    }
  };

  const isLoading = isMappingsLoading || isProductsLoading;

  // Calculate total
  const totalPrice = creditProducts
    .filter(p => selectedProducts.has(p.shopifyVariantId))
    .reduce((sum, p) => sum + parseFloat(p.price) * (selectedProducts.get(p.shopifyVariantId) || 1), 0);

  const totalCredits = creditProducts
    .filter(p => selectedProducts.has(p.shopifyVariantId))
    .reduce((sum, p) => sum + p.creditValue * (selectedProducts.get(p.shopifyVariantId) || 1), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Send Credit Purchase to {clientName}
          </DialogTitle>
          <DialogDescription>
            Select credit packages and set quantities for the client to purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : creditProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No credit products are configured.</p>
              <p className="text-sm mt-1">
                Map Shopify products to daycare or boarding in the Shopify Settings.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Credit Packages</Label>
                <p className="text-sm text-muted-foreground">
                  Choose packages and specify quantities. The client will be able to purchase directly from the chat.
                </p>
              </div>

              <ScrollArea className="h-[280px] border rounded-lg p-3">
                <div className="space-y-2">
                  {creditProducts.map((product) => {
                    const isSelected = selectedProducts.has(product.shopifyVariantId);
                    const quantity = selectedProducts.get(product.shopifyVariantId) || 1;
                    
                    return (
                      <div
                        key={product.shopifyVariantId}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => toggleProduct(product.shopifyVariantId)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProduct(product.shopifyVariantId)}
                          />
                          <div className={`p-1.5 rounded-full ${
                            product.creditType === 'boarding' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {getCreditTypeIcon(product.creditType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {product.shopifyProductTitle}
                              {product.shopifyVariantTitle !== 'Default Title' && ` - ${product.shopifyVariantTitle}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getCreditTypeLabel(product.creditType)} • {product.creditValue} credit{product.creditValue !== 1 ? 's' : ''} each
                            </p>
                          </div>
                          <p className="font-semibold text-sm">
                            ${parseFloat(product.price).toFixed(2)}
                          </p>
                        </div>
                        
                        {/* Quantity selector - only shown when selected */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Quantity:</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.shopifyVariantId, -1);
                                }}
                                disabled={quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setQuantity(product.shopifyVariantId, parseInt(e.target.value) || 1);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 h-8 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.shopifyVariantId, 1);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium ml-2">
                                = ${(parseFloat(product.price) * quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Summary */}
              {selectedProducts.size > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Credits:</span>
                    <span className="font-medium">{totalCredits} credit{totalCredits !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="Add a personalized message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSubmitting || selectedProducts.size === 0 || isLoading}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Send to {clientName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}