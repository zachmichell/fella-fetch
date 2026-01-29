import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchCollectionProducts, ShopifyProduct } from '@/lib/shopify';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Scissors, CalendarClock } from 'lucide-react';

interface PetGroomingPreferencesEditorProps {
  petId: string;
  petName: string;
  onSaved?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: '2 weeks', label: 'Every 2 weeks' },
  { value: '3 weeks', label: 'Every 3 weeks' },
  { value: '4 weeks', label: 'Every 4 weeks' },
  { value: '5 weeks', label: 'Every 5 weeks' },
  { value: '6 weeks', label: 'Every 6 weeks' },
  { value: '8 weeks', label: 'Every 8 weeks' },
  { value: '10 weeks', label: 'Every 10 weeks' },
  { value: '12 weeks', label: 'Every 12 weeks' },
];

export const PetGroomingPreferencesEditor = ({
  petId,
  petName,
  onSaved,
}: PetGroomingPreferencesEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current pet grooming preferences
  const { data: pet, isLoading: loadingPet } = useQuery({
    queryKey: ['pet-grooming-prefs', petId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('grooming_product_id, grooming_product_title, grooming_frequency')
        .eq('id', petId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch grooming collection mapping to get products
  const { data: groomingCollectionMapping } = useQuery({
    queryKey: ['grooming-collection-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_collection_mappings')
        .select('shopify_collection_id, shopify_collection_title')
        .or('category.eq.services,category.eq.addons')
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch grooming products from Shopify
  const { data: groomingProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['grooming-products-for-prefs'],
    queryFn: async () => {
      // Try to fetch from a grooming collection, or fetch all products with "groom" in title
      const allProducts: ShopifyProduct[] = [];
      
      // Fetch products - we'll filter for grooming-related ones
      const products = await fetchCollectionProducts('groom', 50);
      if (products && products.length > 0) {
        allProducts.push(...products);
      }
      
      // If no collection found, try fetching products with grooming keywords
      if (allProducts.length === 0) {
        const { fetchShopifyProducts } = await import('@/lib/shopify');
        const result = await fetchShopifyProducts(100);
        if (result?.edges) {
          const groomingKeywords = ['groom', 'bath', 'brush', 'haircut', 'trim', 'wash', 'spa'];
          const filtered = result.edges.filter((p: ShopifyProduct) => 
            groomingKeywords.some(kw => 
              p.node.title.toLowerCase().includes(kw) ||
              p.node.productType?.toLowerCase().includes(kw)
            )
          );
          allProducts.push(...filtered);
        }
      }
      
      return allProducts;
    },
  });

  // Initialize state from pet data
  useEffect(() => {
    if (pet) {
      setSelectedProductId(pet.grooming_product_id || null);
      setSelectedFrequency(pet.grooming_frequency || null);
      setHasChanges(false);
    }
  }, [pet]);

  // Track changes
  useEffect(() => {
    if (pet) {
      const productChanged = selectedProductId !== (pet.grooming_product_id || null);
      const frequencyChanged = selectedFrequency !== (pet.grooming_frequency || null);
      setHasChanges(productChanged || frequencyChanged);
    }
  }, [selectedProductId, selectedFrequency, pet]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedProduct = groomingProducts?.find(
        (p: ShopifyProduct) => p.node.id === selectedProductId
      );

      const { error } = await supabase
        .from('pets')
        .update({
          grooming_product_id: selectedProductId,
          grooming_product_title: selectedProduct?.node.title || null,
          grooming_frequency: selectedFrequency,
        })
        .eq('id', petId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-grooming-prefs', petId] });
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      toast({
        title: 'Preferences saved',
        description: `Grooming preferences updated for ${petName}`,
      });
      setHasChanges(false);
      onSaved?.();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save grooming preferences',
        variant: 'destructive',
      });
    },
  });

  if (loadingPet) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          Recommended Groom Type
        </Label>
        <Select
          value={selectedProductId || '__none__'}
          onValueChange={(v) => setSelectedProductId(v === '__none__' ? null : v)}
          disabled={loadingProducts}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingProducts ? "Loading..." : "Select groom type..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No preference</SelectItem>
            {groomingProducts?.map((product: ShopifyProduct) => (
              <SelectItem key={product.node.id} value={product.node.id}>
                {product.node.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pet?.grooming_product_title && !selectedProductId && (
          <p className="text-xs text-muted-foreground">
            Previously: {pet.grooming_product_title}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Grooming Frequency
        </Label>
        <Select
          value={selectedFrequency || '__none__'}
          onValueChange={(v) => setSelectedFrequency(v === '__none__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No preference</SelectItem>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasChanges && (
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Preferences
        </Button>
      )}
    </div>
  );
};
