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

interface PaymentMethod {
  type: 'card' | 'cash' | 'gift_card' | 'other';
  last4?: string;
  brand?: string;
}

interface ShopifyOrder {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
  paymentMethod: PaymentMethod | null;
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

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  boarding_credits: number;
  daycare_credits: number;
  half_daycare_credits: number;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  weight: number | null;
  gender: string | null;
  color: string | null;
  photo_url: string | null;
  vaccination_rabies: string | null;
  vaccination_distemper: string | null;
  vaccination_bordetella: string | null;
  special_needs: string | null;
  feeding_instructions: string | null;
  behavior_notes: string | null;
  pet_traits: Array<{
    id: string;
    title: string;
    icon_name: string;
    color_key: string;
    is_alert: boolean;
  }>;
}

interface Reservation {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  pets: {
    id: string;
    name: string;
    breed: string | null;
    photo_url: string | null;
  };
}

interface ClientAuthContextType {
  shopifyCustomer: ShopifyCustomer | null;
  clientData: ClientData | null;
  pets: Pet[];
  reservations: Reservation[];
  orders: ShopifyOrder[];
  loading: boolean;
  ordersLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchClientData: () => Promise<void>;
  recoverPassword: (email: string) => Promise<{ error: string | null; success: boolean }>;
  isAuthenticated: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'shopify_customer_session';

interface StoredSession {
  accessToken: string;
  expiresAt: string;
  customer: ShopifyCustomer;
}

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [shopifyCustomer, setShopifyCustomer] = useState<ShopifyCustomer | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: StoredSession = JSON.parse(stored);
          
          // Check if token is expired
          if (new Date(session.expiresAt) > new Date()) {
            // Verify token is still valid with Shopify
            const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
              body: { action: 'getCustomer', accessToken: session.accessToken },
            });

            if (!error && data?.customer) {
              setAccessToken(session.accessToken);
              setShopifyCustomer(data.customer);
            } else {
              // Token invalid, clear storage
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            // Token expired, clear storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Fetch client data when shopify customer is authenticated
  useEffect(() => {
    if (shopifyCustomer && accessToken) {
      fetchClientData();
    }
  }, [shopifyCustomer, accessToken]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'login', email, password },
      });

      // Handle edge function errors (non-2xx responses)
      if (response.error) {
        // Try to extract error message from the response data first
        const errorMessage = response.data?.error || response.error.message || 'Login failed';
        return { error: errorMessage };
      }

      const data = response.data;

      if (data?.error) {
        return { error: data.error };
      }

      if (!data?.accessToken || !data?.customer) {
        return { error: 'Invalid email or password' };
      }

      // Store session
      const session: StoredSession = {
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        customer: data.customer,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      setAccessToken(data.accessToken);
      setShopifyCustomer(data.customer);

      return { error: null };
    } catch (e: any) {
      console.error('Login error:', e);
      return { error: e?.message || 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    if (accessToken) {
      try {
        await supabase.functions.invoke('shopify-customer-auth', {
          body: { action: 'logout', accessToken },
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }

    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setShopifyCustomer(null);
    setClientData(null);
    setPets([]);
    setReservations([]);
    setOrders([]);
  };

  const fetchClientData = async () => {
    if (!accessToken) return;

    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'getClientData', accessToken },
      });

      if (error) {
        console.error('Error fetching client data:', error);
        return;
      }

      setClientData(data?.client || null);
      setPets(data?.pets || []);
      setReservations(data?.reservations || []);
    } catch (e) {
      console.error('Error fetching client data:', e);
    }
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

      setOrders(data?.orders || []);
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const recoverPassword = async (email: string): Promise<{ error: string | null; success: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
        body: { action: 'recoverPassword', email },
      });

      if (error) {
        return { error: error.message || 'Failed to send recovery email', success: false };
      }

      if (data?.error) {
        return { error: data.error, success: false };
      }

      return { error: null, success: true };
    } catch (e) {
      console.error('Password recovery error:', e);
      return { error: 'An unexpected error occurred', success: false };
    }
  };

  const value = {
    shopifyCustomer,
    clientData,
    pets,
    reservations,
    orders,
    loading,
    ordersLoading,
    signIn,
    signOut,
    fetchOrders,
    fetchClientData,
    recoverPassword,
    isAuthenticated: !!shopifyCustomer,
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
