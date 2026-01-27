import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCollectionProducts, type ShopifyProduct } from '@/lib/shopify';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  onAddServices: (services: SelectedService[], notes: string) => void;
}

export interface SelectedService {
  id: string;
  title: string;
  price: number;
  variantId: string;
}

interface CollectionMapping {
  id: string;
  shopify_collection_id: string;
  shopify_collection_title: string;
  category: string;
}

export function AddServiceDialog({
  open,
  onOpenChange,
  petName,
  onAddServices,
}: AddServiceDialogProps) {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [notes, setNotes] = useState('');

  // Fetch collection mappings for services category
  const { data: serviceMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['shopify-service-collection-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_collection_mappings')
        .select('*')
        .eq('category', 'services');
      
      if (error) throw error;
      return data as CollectionMapping[];
    },
    enabled: open,
  });

  // Fetch products from mapped collections
  const { data: serviceProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['shopify-service-products', serviceMappings?.map(m => m.shopify_collection_id)],
    queryFn: async () => {
      if (!serviceMappings || serviceMappings.length === 0) return [];

      // Need to get collection handles - fetch all collections and match by ID
      const { storefrontApiRequest } = await import('@/lib/shopify');
      
      // Fetch products from each collection
      const allProducts: ShopifyProduct[] = [];
      const seenProductIds = new Set<string>();
      
      for (const mapping of serviceMappings) {
        try {
          // We need to get the handle from the collection - fetch by ID
          const collectionQuery = `
            query GetCollectionById($id: ID!) {
              node(id: $id) {
                ... on Collection {
                  handle
                  products(first: 50) {
                    edges {
                      node {
                        id
                        title
                        description
                        handle
                        productType
                        vendor
                        priceRange {
                          minVariantPrice {
                            amount
                            currencyCode
                          }
                        }
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                        variants(first: 10) {
                          edges {
                            node {
                              id
                              title
                              price {
                                amount
                                currencyCode
                              }
                              availableForSale
                              selectedOptions {
                                name
                                value
                              }
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
          
          const gid = `gid://shopify/Collection/${mapping.shopify_collection_id}`;
          const result = await storefrontApiRequest(collectionQuery, { id: gid });
          const products = result?.data?.node?.products?.edges || [];
          
          for (const product of products) {
            if (!seenProductIds.has(product.node.id)) {
              seenProductIds.add(product.node.id);
              allProducts.push(product);
            }
          }
        } catch (error) {
          console.error(`Error fetching products for collection ${mapping.shopify_collection_title}:`, error);
        }
      }
      
      return allProducts;
    },
    enabled: open && !!serviceMappings && serviceMappings.length > 0,
  });

  const isLoading = isLoadingMappings || isLoadingProducts;

  const toggleService = (product: ShopifyProduct) => {
    const productId = product.node.id;
    const isSelected = selectedServices.some(s => s.id === productId);
    
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== productId));
    } else {
      const variant = product.node.variants.edges[0]?.node;
      const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
      
      setSelectedServices(prev => [...prev, {
        id: productId,
        title: product.node.title,
        price,
        variantId: variant?.id || '',
      }]);
    }
  };

  const handleSubmit = () => {
    onAddServices(selectedServices, notes);
    setSelectedServices([]);
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedServices([]);
    setNotes('');
    onOpenChange(false);
  };

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Services for {petName}</DialogTitle>
          <DialogDescription>
            Select additional services to add to this reservation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !serviceProducts || serviceProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services available</p>
              <p className="text-sm mt-1">
                Add services to a Shopify collection and categorize it as "Services" in settings.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 gap-3">
                {serviceProducts.map((product) => {
                  const isSelected = selectedServices.some(s => s.id === product.node.id);
                  const price = product.node.priceRange.minVariantPrice;
                  const imageUrl = product.node.images.edges[0]?.node.url;
                  
                  return (
                    <div 
                      key={product.node.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleService(product)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={product.node.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleService(product)}
                        />
                        {imageUrl && (
                          <img 
                            src={imageUrl} 
                            alt={product.node.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <Label htmlFor={product.node.id} className="cursor-pointer font-medium">
                            {product.node.title}
                          </Label>
                          {product.node.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.node.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(price.amount, price.currencyCode)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Special Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions for these services..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                }).format(totalPrice)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedServices.length === 0}
          >
            Add {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}