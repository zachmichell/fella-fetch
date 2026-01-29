import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { storefrontApiRequest } from '@/lib/shopify';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Scissors, CalendarClock } from 'lucide-react';

interface GroomingVariant {
  id: string;
  title: string;
  price: string;
}

interface GroomingProduct {
  id: string;
  title: string;
  variants: GroomingVariant[];
}

interface PetGroomingPreferencesEditorProps {
  petId: string;
  petName: string;
  onSaved?: () => void;
}

export const PetGroomingPreferencesEditor = ({
  petId,
  petName,
  onSaved,
}: PetGroomingPreferencesEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantTitle, setSelectedVariantTitle] = useState<string | null>(null);
  const [frequencyNumber, setFrequencyNumber] = useState<string>('');
  const [frequencyUnit, setFrequencyUnit] = useState<string>('weeks');
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

  // Fetch grooming products from Shopify
  const { data: groomingProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['grooming-products-shopify'],
    queryFn: async () => {
      const query = `
        query GetGroomProducts {
          products(first: 50, query: "product_type:Groom") {
            edges {
              node {
                id
                title
                productType
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await storefrontApiRequest(query, {});
      if (!response?.data?.products?.edges) return [];

      // Filter to only actual grooming services (exclude tips, retail, etc.)
      return response.data.products.edges
        .filter((edge: any) => {
          const title = edge.node.title.toLowerCase();
          // Include products that are likely grooming services
          return !title.includes('tip') && 
                 !title.includes('brush') &&
                 edge.node.productType?.toLowerCase() === 'groom';
        })
        .map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          variants: edge.node.variants.edges.map((v: any) => ({
            id: v.node.id,
            title: v.node.title,
            price: v.node.price.amount,
          })),
        })) as GroomingProduct[];
    },
  });

  // Get variants for selected product
  const selectedProduct = groomingProducts?.find(p => p.id === selectedProductId);
  const availableVariants = selectedProduct?.variants || [];

  // Parse frequency from stored value (e.g., "6 weeks" -> { number: 6, unit: "weeks" })
  const parseFrequency = (freq: string | null): { number: string; unit: string } => {
    if (!freq) return { number: '', unit: 'weeks' };
    const match = freq.match(/^(\d+)\s*(weeks?|months?)$/i);
    if (match) {
      return { 
        number: match[1], 
        unit: match[2].toLowerCase().endsWith('s') ? match[2].toLowerCase() : match[2].toLowerCase() + 's'
      };
    }
    return { number: '', unit: 'weeks' };
  };

  // Initialize state from pet data
  useEffect(() => {
    if (pet) {
      setSelectedProductId(pet.grooming_product_id || null);
      
      // Find the product to get the variant title if we have a stored product
      if (pet.grooming_product_id && groomingProducts) {
        const product = groomingProducts.find(p => p.id === pet.grooming_product_id);
        if (product && pet.grooming_product_title) {
          // The stored title might be the variant title
          const variant = product.variants.find(v => v.title === pet.grooming_product_title);
          if (variant) {
            setSelectedVariantTitle(variant.title);
          }
        }
      }
      
      const parsed = parseFrequency(pet.grooming_frequency);
      setFrequencyNumber(parsed.number);
      setFrequencyUnit(parsed.unit);
      setHasChanges(false);
    }
  }, [pet, groomingProducts]);

  // Reset variant when product changes
  useEffect(() => {
    if (selectedProductId && pet?.grooming_product_id !== selectedProductId) {
      setSelectedVariantTitle(null);
    }
  }, [selectedProductId, pet?.grooming_product_id]);

  // Track changes
  useEffect(() => {
    if (pet) {
      const productChanged = selectedProductId !== (pet.grooming_product_id || null);
      
      const currentFreq = parseFrequency(pet.grooming_frequency);
      const newFreq = frequencyNumber && frequencyUnit 
        ? `${frequencyNumber} ${frequencyUnit}`
        : null;
      const frequencyChanged = (pet.grooming_frequency || null) !== newFreq;
      
      setHasChanges(productChanged || frequencyChanged || selectedVariantTitle !== null);
    }
  }, [selectedProductId, selectedVariantTitle, frequencyNumber, frequencyUnit, pet]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const frequency = frequencyNumber && frequencyUnit 
        ? `${frequencyNumber} ${frequencyUnit}` 
        : null;

      // Store the variant title as the product title for display
      const displayTitle = selectedVariantTitle 
        ? `${selectedProduct?.title} - ${selectedVariantTitle}`
        : selectedProduct?.title || null;

      const { error } = await supabase
        .from('pets')
        .update({
          grooming_product_id: selectedProductId,
          grooming_product_title: displayTitle,
          grooming_frequency: frequency,
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
      {/* Product Selection */}
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
            {groomingProducts?.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Variant Selection - only show when a product is selected */}
      {selectedProductId && availableVariants.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Preferred Size/Variant</Label>
          <Select
            value={selectedVariantTitle || '__none__'}
            onValueChange={(v) => setSelectedVariantTitle(v === '__none__' ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select variant..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No preference</SelectItem>
              {availableVariants.map((variant) => (
                <SelectItem key={variant.id} value={variant.title}>
                  {variant.title} - ${parseFloat(variant.price).toFixed(0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Frequency Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Grooming Frequency
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="number"
              min="1"
              max="52"
              placeholder="e.g. 6"
              value={frequencyNumber}
              onChange={(e) => setFrequencyNumber(e.target.value)}
              className="w-full"
            />
          </div>
          <Select
            value={frequencyUnit}
            onValueChange={setFrequencyUnit}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weeks">weeks</SelectItem>
              <SelectItem value="months">months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {frequencyNumber && (
          <p className="text-xs text-muted-foreground">
            Every {frequencyNumber} {frequencyUnit}
          </p>
        )}
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