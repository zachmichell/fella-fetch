import { useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, ShoppingBag, Receipt, CreditCard, Banknote, Gift, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SHOPIFY_STORE_URL = 'https://fella-fetch.myshopify.com';

const formatCurrency = (amount: string, currencyCode: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
};

const getFinancialStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'refunded':
    case 'partially_refunded':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'voided':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getFulfillmentStatusColor = (status: string | null) => {
  if (!status) return 'bg-muted text-muted-foreground';
  switch (status.toLowerCase()) {
    case 'fulfilled':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'unfulfilled':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'partially_fulfilled':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const formatStatus = (status: string | null) => {
  if (!status) return 'Unfulfilled';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getPaymentMethodDisplay = (paymentMethod: { type: string; last4?: string; brand?: string } | null) => {
  if (!paymentMethod) return null;
  
  switch (paymentMethod.type) {
    case 'card':
      return {
        icon: CreditCard,
        text: paymentMethod.brand 
          ? `${paymentMethod.brand} •••• ${paymentMethod.last4}`
          : `Card •••• ${paymentMethod.last4}`,
      };
    case 'cash':
      return {
        icon: Banknote,
        text: 'Cash',
      };
    case 'gift_card':
      return {
        icon: Gift,
        text: 'Gift Card',
      };
    default:
      return {
        icon: CreditCard,
        text: paymentMethod.brand || 'Other',
      };
  }
};

const isUnpaid = (status: string) => {
  const unpaidStatuses = ['pending', 'unpaid', 'partially_paid', 'authorized'];
  return unpaidStatuses.includes(status.toLowerCase());
};

export default function OrderHistory() {
  const { orders, ordersLoading, fetchShopifyData, isAuthenticated } = useClientAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchShopifyData();
    }
  }, [isAuthenticated]);

  if (ordersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sign in to view your purchase history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No orders yet</p>
            <p className="text-sm mt-1">Your purchase history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Purchase History ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {orders.map((order) => (
            <AccordionItem
              key={order.id}
              value={order.id}
              className="border rounded-lg px-4 bg-muted/20"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Order #{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(order.processedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold">
                        {formatCurrency(order.totalPrice.amount, order.totalPrice.currencyCode)}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getFinancialStatusColor(order.financialStatus)}`}
                        >
                          {formatStatus(order.financialStatus)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 pb-4 space-y-4">
                  {/* Mobile price display */}
                  <div className="sm:hidden">
                    <p className="font-semibold text-lg">
                      {formatCurrency(order.totalPrice.amount, order.totalPrice.currencyCode)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getFinancialStatusColor(order.financialStatus)}`}
                      >
                        {formatStatus(order.financialStatus)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getFulfillmentStatusColor(order.fulfillmentStatus)}`}
                      >
                        {formatStatus(order.fulfillmentStatus)}
                      </Badge>
                    </div>
                  </div>

                  {/* Order status - desktop */}
                  <div className="hidden sm:flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getFulfillmentStatusColor(order.fulfillmentStatus)}`}
                    >
                      {formatStatus(order.fulfillmentStatus)}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Line items */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Items</p>
                    {order.lineItems.edges.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {item.node.variant?.image ? (
                          <img
                            src={item.node.variant.image.url}
                            alt={item.node.variant.image.altText || item.node.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.node.title}</p>
                          {item.node.variant?.title && item.node.variant.title !== 'Default Title' && (
                            <p className="text-xs text-muted-foreground">{item.node.variant.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Qty: {item.node.quantity}</p>
                        </div>
                        {item.node.variant?.price && (
                          <p className="text-sm font-medium">
                            {formatCurrency(
                              (parseFloat(item.node.variant.price.amount) * item.node.quantity).toString(),
                              item.node.variant.price.currencyCode
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Payment</p>
                    {isUnpaid(order.financialStatus) ? (
                      <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <span className="text-sm text-yellow-700">Payment pending</span>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => window.open(`${SHOPIFY_STORE_URL}/account`, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Pay Now
                        </Button>
                      </div>
                    ) : (
                      (() => {
                        const paymentDisplay = getPaymentMethodDisplay(order.paymentMethod);
                        if (paymentDisplay) {
                          const PaymentIcon = paymentDisplay.icon;
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{paymentDisplay.text}</span>
                            </div>
                          );
                        }
                        return <span className="text-sm text-muted-foreground">-</span>;
                      })()
                    )}
                  </div>

                  <Separator />

                  {/* Order totals */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(order.subtotalPrice.amount, order.subtotalPrice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(order.totalTax.amount, order.totalTax.currencyCode)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalPrice.amount, order.totalPrice.currencyCode)}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}