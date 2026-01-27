import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchShopifyProducts, 
  fetchShopifyCollections, 
  fetchCollectionProducts,
  getProductIdFromGid, 
  getCollectionIdFromGid,
  type ShopifyProduct,
  type ShopifyCollection 
} from '@/lib/shopify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, X, Package } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceTypeProduct {
  id: string;
  service_type_id: string;
  shopify_product_id: string;
  shopify_product_title: string;
  credit_value: number;
  created_at: string;
}

interface ShopifyProductSelectorProps {
  serviceTypeId: string | null;
  serviceTypeName: string;
}

export function ShopifyProductSelector({ serviceTypeId, serviceTypeName }: ShopifyProductSelectorProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedCollectionHandle, setSelectedCollectionHandle] = useState<string>('all');
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch linked products for this service type
  const { data: linkedProducts = [], isLoading: isLoadingLinked } = useQuery({
    queryKey: ['service-type-products', serviceTypeId],
    queryFn: async () => {
      if (!serviceTypeId) return [];
      const { data, error } = await supabase
        .from('service_type_products')
        .select('*')
        .eq('service_type_id', serviceTypeId);
      
      if (error) throw error;
      return data as ServiceTypeProduct[];
    },
    enabled: !!serviceTypeId,
  });

  // Load collections on mount
  useEffect(() => {
    const loadCollections = async () => {
      setIsLoadingCollections(true);
      try {
        const result = await fetchShopifyCollections(100);
        if (result?.edges) {
          setCollections(result.edges);
        }
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setIsLoadingCollections(false);
      }
    };
    loadCollections();
  }, []);

  // Fetch Shopify products based on collection and search
  const loadProducts = async (query?: string, collectionHandle?: string) => {
    setIsLoadingProducts(true);
    try {
      // Always fetch all products and filter client-side for better results
      // The Storefront API search has limitations with special characters and wildcards
      const result = await fetchShopifyProducts(250);
      
      if (result?.edges) {
        let products = result.edges;
        
        // Filter by collection if selected (client-side since collection products may be incomplete)
        if (collectionHandle && collectionHandle !== 'all') {
          // Also fetch collection products to know which product types match
          const collectionProducts = await fetchCollectionProducts(collectionHandle, 100);
          const collectionProductIds = new Set(
            collectionProducts.map((p: ShopifyProduct) => p.node.id)
          );
          
          // Filter by product type matching collection title OR if product is in collection
          const selectedCollection = collections.find(c => c.node.handle === collectionHandle);
          const collectionTitle = selectedCollection?.node.title?.toUpperCase();
          
          products = products.filter((p: ShopifyProduct) => 
            collectionProductIds.has(p.node.id) || 
            p.node.productType?.toUpperCase() === collectionTitle
          );
        }
        
        // Filter by search query (client-side for better matching)
        if (query) {
          const lowerQuery = query.toLowerCase();
          products = products.filter((p: ShopifyProduct) => 
            p.node.title.toLowerCase().includes(lowerQuery) ||
            p.node.description?.toLowerCase().includes(lowerQuery)
          );
        }
        
        setShopifyProducts(products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts(debouncedSearch || undefined, selectedCollectionHandle);
  }, [debouncedSearch, selectedCollectionHandle]);

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (product: ShopifyProduct) => {
      if (!serviceTypeId) throw new Error('Service type not saved yet');
      
      const productId = getProductIdFromGid(product.node.id);
      const { error } = await supabase.from('service_type_products').insert({
        service_type_id: serviceTypeId,
        shopify_product_id: productId,
        shopify_product_title: product.node.title,
        credit_value: 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-type-products', serviceTypeId] });
      toast.success('Product linked');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This product is already linked');
      } else {
        toast.error('Failed to link product');
      }
    },
  });

  // Remove product mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('service_type_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-type-products', serviceTypeId] });
      toast.success('Product unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink product');
    },
  });

  const linkedProductIds = new Set(linkedProducts.map(p => p.shopify_product_id));

  const isProductLinked = (product: ShopifyProduct) => {
    const productId = getProductIdFromGid(product.node.id);
    return linkedProductIds.has(productId);
  };

  const handleToggleProduct = (product: ShopifyProduct) => {
    const productId = getProductIdFromGid(product.node.id);
    const existingLink = linkedProducts.find(p => p.shopify_product_id === productId);
    
    if (existingLink) {
      removeProductMutation.mutate(existingLink.id);
    } else {
      addProductMutation.mutate(product);
    }
  };

  if (!serviceTypeId) {
    return (
      <div className="space-y-2">
        <Label>Linked Shopify Products</Label>
        <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-center">Save the service type first to link Shopify products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Linked Shopify Products</Label>
      
      {/* Currently linked products */}
      {linkedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
          {linkedProducts.map((linked) => (
            <Badge key={linked.id} variant="secondary" className="gap-1 pr-1">
              {linked.shopify_product_title}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-destructive/20"
                onClick={() => removeProductMutation.mutate(linked.id)}
                disabled={removeProductMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Collection filter and search */}
      <div className="flex gap-2">
        <Select value={selectedCollectionHandle} onValueChange={setSelectedCollectionHandle}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Collections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.node.id} value={collection.node.handle}>
                {collection.node.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[200px] border rounded-md">
        {isLoadingProducts || isLoadingLinked ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : shopifyProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No products found
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {shopifyProducts.map((product) => {
              const isLinked = isProductLinked(product);
              return (
                <div
                  key={product.node.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                    isLinked ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleToggleProduct(product)}
                >
                  <Checkbox
                    checked={isLinked}
                    onCheckedChange={() => handleToggleProduct(product)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.node.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                      {product.node.productType && ` · ${product.node.productType}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
