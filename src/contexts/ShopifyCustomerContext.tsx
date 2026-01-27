import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  defaultAddress: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    zip: string | null;
  } | null;
}

interface ShopifyOrder {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
  subtotalPrice: {
    amount: string;
    currencyCode: string;
  };
  totalTax: {
    amount: string;
    currencyCode: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        variant: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          image: {
            url: string;
            altText: string | null;
          } | null;
        } | null;
      };
    }>;
  };
}

interface ShopifyCustomerContextType {
  customer: ShopifyCustomer | null;
  accessToken: string | null;
  loading: boolean;
  orders: ShopifyOrder[];
  ordersLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  isAuthenticated: boolean;
}

const ShopifyCustomerContext = createContext<ShopifyCustomerContextType | undefined>(undefined);

const STORAGE_KEY = 'shopify_customer_session';

interface StoredSession {
  accessToken: string;
  expiresAt: string;
  customer: ShopifyCustomer;
}

export function ShopifyCustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<ShopifyCustomer | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    // Check for stored session on mount
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      try {
        const session: StoredSession = JSON.parse(storedSession);
        const expiresAt = new Date(session.expiresAt);
        
        if (expiresAt > new Date()) {
          setAccessToken(session.accessToken);
          setCustomer(session.customer);
          // Verify the session is still valid
          verifySession(session.accessToken);
        } else {
          // Session expired, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const verifySession = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'getCustomer', accessToken: token },
      });

      if (error || data?.error) {
        // Session invalid, clear it
        localStorage.removeItem(STORAGE_KEY);
        setAccessToken(null);
        setCustomer(null);
      } else if (data?.customer) {
        setCustomer(data.customer);
      }
    } catch (e) {
      console.error('Error verifying session:', e);
    }
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'login', email, password },
      });

      if (error) {
        return { error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { error: data.error };
      }

      if (data?.accessToken && data?.customer) {
        const session: StoredSession = {
          accessToken: data.accessToken,
          expiresAt: data.expiresAt,
          customer: data.customer,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setAccessToken(data.accessToken);
        setCustomer(data.customer);
        return { error: null };
      }

      return { error: 'Login failed - no access token received' };
    } catch (e: any) {
      return { error: e.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (accessToken) {
      try {
        await supabase.functions.invoke('shopify-customer-auth', {
          body: { action: 'logout', accessToken },
        });
      } catch (e) {
        console.error('Error during logout:', e);
      }
    }
    
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setCustomer(null);
    setOrders([]);
  };

  const fetchOrders = async () => {
    if (!accessToken) return;

    setOrdersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'getOrders', accessToken },
      });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      if (data?.error) {
        console.error('Error fetching orders:', data.error);
        // If session is invalid, log out
        if (data.error.includes('Invalid or expired')) {
          await logout();
        }
        return;
      }

      if (data?.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const value = {
    customer,
    accessToken,
    loading,
    orders,
    ordersLoading,
    login,
    logout,
    fetchOrders,
    isAuthenticated: !!accessToken && !!customer,
  };

  return (
    <ShopifyCustomerContext.Provider value={value}>
      {children}
    </ShopifyCustomerContext.Provider>
  );
}

export function useShopifyCustomer() {
  const context = useContext(ShopifyCustomerContext);
  if (context === undefined) {
    throw new Error('useShopifyCustomer must be used within a ShopifyCustomerProvider');
  }
  return context;
}
