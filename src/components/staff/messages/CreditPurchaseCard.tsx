import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sun, BedDouble, Check, ExternalLink, Loader2 } from 'lucide-react';
import { CreditPurchaseData, CreditProduct } from './SendCreditPurchase';
import { storefrontApiRequest } from '@/lib/shopify';

interface CreditPurchaseCardProps {
  data: CreditPurchaseData;
  isClientView?: boolean;
  onPurchaseComplete?: () => void;
}

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors { field message }
    }
  }
`;

function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

export function CreditPurchaseCard({
  data,
  isClientView = false,
  onPurchaseComplete,
}: CreditPurchaseCardProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(data.products.map(p => p.shopifyVariantId))
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const isPurchased = data.status === 'purchased';

  const toggleProduct = (variantId: string) => {
    if (!isClientView || isPurchased) return;
    
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedProducts(newSelected);
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
        return 'Full Day';
      case 'half_daycare':
        return 'Half Day';
      case 'boarding':
        return 'Boarding';
    }
  };

  const handleCheckout = async () => {
    const selectedItems = data.products.filter(p => selectedProducts.has(p.shopifyVariantId));
    if (selectedItems.length === 0) return;

    setIsCheckingOut(true);
    try {
      const lines = selectedItems.map(product => ({
        quantity: 1,
        merchandiseId: product.shopifyVariantId,
      }));

      const result = await storefrontApiRequest(CART_CREATE_MUTATION, {
        input: { lines },
      });

      if (result?.data?.cartCreate?.userErrors?.length > 0) {
        console.error('Cart creation failed:', result.data.cartCreate.userErrors);
        return;
      }

      const checkoutUrl = result?.data?.cartCreate?.cart?.checkoutUrl;
      if (checkoutUrl) {
        window.open(formatCheckoutUrl(checkoutUrl), '_blank');
        onPurchaseComplete?.();
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const selectedTotal = data.products
    .filter(p => selectedProducts.has(p.shopifyVariantId))
    .reduce((sum, p) => sum + parseFloat(p.price), 0);

  return (
    <Card className={`border-2 ${
      isPurchased 
        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
        : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'
    }`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold">Credit Packages</span>
          </div>
          <Badge 
            variant={isPurchased ? 'default' : 'secondary'}
            className={isPurchased ? 'bg-green-500' : ''}
          >
            {isPurchased ? 'Purchased' : 'Available'}
          </Badge>
        </div>

        {/* Message */}
        {data.message && (
          <p className="text-sm text-muted-foreground italic">
            {data.message}
          </p>
        )}

        {/* Products */}
        <div className="space-y-2">
          {data.products.map((product) => {
            const isSelected = selectedProducts.has(product.shopifyVariantId);
            return (
              <div
                key={product.shopifyVariantId}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isClientView && !isPurchased ? 'cursor-pointer' : ''
                } ${
                  isSelected && !isPurchased
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-background/50 border border-transparent'
                }`}
                onClick={() => toggleProduct(product.shopifyVariantId)}
              >
                {isClientView && !isPurchased && (
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                )}
                
                <div className={`p-1.5 rounded-full ${
                  product.creditType === 'boarding' 
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' 
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                }`}>
                  {getCreditTypeIcon(product.creditType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {product.shopifyProductTitle}
                    {product.shopifyVariantTitle !== 'Default Title' && ` - ${product.shopifyVariantTitle}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCreditTypeLabel(product.creditType)} • {product.creditValue} credit{product.creditValue !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <p className="font-semibold text-sm">
                  ${parseFloat(product.price).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Checkout Button (Client View Only) */}
        {isClientView && !isPurchased && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''} selected
              </span>
              <span className="font-semibold">
                Total: ${selectedTotal.toFixed(2)}
              </span>
            </div>
            <Button 
              className="w-full" 
              onClick={handleCheckout}
              disabled={selectedProducts.size === 0 || isCheckingOut}
            >
              {isCheckingOut ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Checkout with Shopify
            </Button>
          </div>
        )}

        {/* Purchased Message */}
        {isPurchased && (
          <div className="text-center text-sm text-green-600 font-medium pt-2 border-t">
            ✓ Credits have been purchased
          </div>
        )}
      </CardContent>
    </Card>
  );
}
