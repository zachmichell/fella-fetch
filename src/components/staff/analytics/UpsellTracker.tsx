import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const UpsellTracker = () => {
  // Upsell data comes from Shopify line items tagged as add-ons
  // This requires the analytics-revenue edge function data
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Upsell Tracker</CardTitle></CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Upsell data is derived from Shopify line items.</p>
        <p className="text-xs mt-1">Tag add-on products in Shopify to track upsell frequency here.</p>
      </CardContent>
    </Card>
  );
};
