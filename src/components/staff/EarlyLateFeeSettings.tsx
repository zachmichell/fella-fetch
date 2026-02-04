import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEarlyLateFees, EarlyLateFeesSettings } from '@/hooks/useEarlyLateFees';
import { useToast } from '@/hooks/use-toast';
import { fetchShopifyProducts, getProductIdFromGid, type ShopifyProduct } from '@/lib/shopify';
import { DollarSign, Save, Loader2, Search, X, Package } from 'lucide-react';

const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
];

interface ProductSelectorProps {
  label: string;
  selectedProductId: string | null;
  selectedProductTitle: string | null;
  onSelect: (productId: string | null, productTitle: string | null) => void;
}

function ProductSelector({ label, selectedProductId, selectedProductTitle, onSelect }: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const result = await fetchShopifyProducts(100);
      if (result?.edges) {
        setProducts(result.edges);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.node.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product: ShopifyProduct) => {
    const productId = getProductIdFromGid(product.node.id);
    onSelect(productId, product.node.title);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null, null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      
      {selectedProductId && selectedProductTitle ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 pr-1">
            <Package className="h-3 w-3" />
            {selectedProductTitle}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-destructive/20"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="w-full justify-start"
        >
          <Package className="h-4 w-4 mr-2" />
          Select Shopify Product
        </Button>
      )}

      {isOpen && (
        <div className="border rounded-md bg-background shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredProducts.map((product) => (
                  <div
                    key={product.node.id}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.node.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EarlyLateFeeSettings() {
  const { toast } = useToast();
  const { earlyLateFees, isLoading, updateEarlyLateFees } = useEarlyLateFees();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for form
  const [weekdayEarlyBefore, setWeekdayEarlyBefore] = useState('7:00 AM');
  const [weekdayLateAfter, setWeekdayLateAfter] = useState('6:00 PM');
  const [weekendEarlyBefore, setWeekendEarlyBefore] = useState('8:00 AM');
  const [weekendLateAfter, setWeekendLateAfter] = useState('5:00 PM');
  const [earlyProductId, setEarlyProductId] = useState<string | null>(null);
  const [earlyProductTitle, setEarlyProductTitle] = useState<string | null>(null);
  const [lateProductId, setLateProductId] = useState<string | null>(null);
  const [lateProductTitle, setLateProductTitle] = useState<string | null>(null);

  // Load settings when data is available
  useEffect(() => {
    if (!isLoading && earlyLateFees) {
      setWeekdayEarlyBefore(earlyLateFees.weekday.earlyDropOffBefore);
      setWeekdayLateAfter(earlyLateFees.weekday.latePickupAfter);
      setWeekendEarlyBefore(earlyLateFees.weekend.earlyDropOffBefore);
      setWeekendLateAfter(earlyLateFees.weekend.latePickupAfter);
      setEarlyProductId(earlyLateFees.earlyDropOffProductId);
      setEarlyProductTitle(earlyLateFees.earlyDropOffProductTitle);
      setLateProductId(earlyLateFees.latePickupProductId);
      setLateProductTitle(earlyLateFees.latePickupProductTitle);
    }
  }, [isLoading, earlyLateFees]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings: EarlyLateFeesSettings = {
        weekday: {
          earlyDropOffBefore: weekdayEarlyBefore,
          latePickupAfter: weekdayLateAfter,
        },
        weekend: {
          earlyDropOffBefore: weekendEarlyBefore,
          latePickupAfter: weekendLateAfter,
        },
        earlyDropOffProductId: earlyProductId,
        earlyDropOffProductTitle: earlyProductTitle,
        latePickupProductId: lateProductId,
        latePickupProductTitle: lateProductTitle,
      };
      
      await updateEarlyLateFees.mutateAsync(settings);
      toast({
        title: 'Settings saved',
        description: 'Early drop-off and late pickup fee settings have been updated',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Early Drop-off & Late Pickup Fees
        </CardTitle>
        <CardDescription>
          Configure time thresholds for early drop-off and late pickup fees. 
          Drop-offs before the early threshold or pickups after the late threshold will incur additional charges.
          These apply to all service types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekday Thresholds */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Weekday Thresholds (Mon-Fri)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Early Drop-off Before</Label>
              <Select value={weekdayEarlyBefore} onValueChange={setWeekdayEarlyBefore} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Late Pickup After</Label>
              <Select value={weekdayLateAfter} onValueChange={setWeekdayLateAfter} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Weekend Thresholds */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Weekend Thresholds (Sat-Sun)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Early Drop-off Before</Label>
              <Select value={weekendEarlyBefore} onValueChange={setWeekendEarlyBefore} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Late Pickup After</Label>
              <Select value={weekendLateAfter} onValueChange={setWeekendLateAfter} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Shopify Product Links */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Linked Shopify Products</Label>
          <p className="text-sm text-muted-foreground -mt-2">
            Link each fee type to a Shopify product that will be charged when the threshold is exceeded.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <ProductSelector
              label="Early Drop-off Fee Product"
              selectedProductId={earlyProductId}
              selectedProductTitle={earlyProductTitle}
              onSelect={(id, title) => {
                setEarlyProductId(id);
                setEarlyProductTitle(title);
              }}
            />
            <ProductSelector
              label="Late Pickup Fee Product"
              selectedProductId={lateProductId}
              selectedProductTitle={lateProductTitle}
              onSelect={(id, title) => {
                setLateProductId(id);
                setLateProductTitle(title);
              }}
            />
          </div>
        </div>

        <Button 
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="ml-2">Save Fee Settings</span>
        </Button>
      </CardContent>
    </Card>
  );
}
