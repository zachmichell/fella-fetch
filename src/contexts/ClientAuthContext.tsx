import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
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

interface ClientAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  shopifyCustomer: ShopifyCustomer | null;
  orders: ShopifyOrder[];
  ordersLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchShopifyData: () => Promise<void>;
  isAuthenticated: boolean;
  isClient: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopifyCustomer, setShopifyCustomer] = useState<ShopifyCustomer | null>(null);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if user has staff/admin role (they should use staff portal instead)
  const checkIsClient = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    // If they have a staff/admin role, they're not a client
    return !data?.role;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkIsClient(session.user.id).then(setIsClient);
          }, 0);
        } else {
          setIsClient(false);
          setShopifyCustomer(null);
          setOrders([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkIsClient(session.user.id).then((isClientUser) => {
          setIsClient(isClientUser);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { error: error.message };
    }

    // Check if user is staff/admin - they should use staff login
    if (data.user) {
      const isClientUser = await checkIsClient(data.user.id);
      if (!isClientUser) {
        await supabase.auth.signOut();
        return { error: 'Staff members should use the staff login portal.' };
      }
    }

    return { error: null };
  };

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/portal`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    
    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setShopifyCustomer(null);
    setOrders([]);
    setIsClient(false);
  };

  const fetchShopifyData = async () => {
    if (!session?.access_token) return;

    setOrdersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-orders', {
        body: { action: 'getCustomerAndOrders' },
      });

      if (error) {
        console.error('Error fetching Shopify data:', error);
        return;
      }

      if (data?.customer) {
        setShopifyCustomer(data.customer);
      }
      
      if (data?.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Error fetching Shopify data:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    shopifyCustomer,
    orders,
    ordersLoading,
    signIn,
    signUp,
    signOut,
    fetchShopifyData,
    isAuthenticated: !!user && isClient,
    isClient,
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
