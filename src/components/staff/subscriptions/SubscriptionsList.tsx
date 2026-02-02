import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  X, 
  Clock, 
  Dog, 
  Calendar, 
  Loader2, 
  Plus,
  RefreshCw,
  Pause,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateDaycareSubscriptionDialog } from './CreateDaycareSubscriptionDialog';
import { useAuth } from '@/contexts/AuthContext';

interface DaycareSubscription {
  id: string;
  client_id: string;
  pet_id: string;
  day_type: 'full' | 'half';
  half_day_period: 'morning' | 'afternoon' | null;
  days_of_week: number[];
  is_active: boolean;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  cancelled_at: string | null;
  notes: string | null;
  client: {
    first_name: string;
    last_name: string;
  };
  pet: {
    name: string;
    breed: string | null;
  };
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SubscriptionsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'active' | 'cancelled'>('pending');

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['daycare-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daycare_subscriptions' as any)
        .select(`
          *,
          client:clients(first_name, last_name),
          pet:pets(name, breed)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as DaycareSubscription[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      // Update subscription to approved
      const { error } = await supabase
        .from('daycare_subscriptions' as any)
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Trigger reservation generation via edge function
      const { error: genError } = await supabase.functions.invoke('generate-subscription-reservations', {
        body: { subscriptionId },
      });

      if (genError) {
        console.error('Error generating reservations:', genError);
        // Don't throw - subscription is approved, reservations can be retried
        toast.warning('Subscription approved, but reservation generation may need retry');
      }
    },
    onSuccess: () => {
      toast.success('Subscription approved! Reservations are being generated.');
      queryClient.invalidateQueries({ queryKey: ['daycare-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      console.error('Error approving subscription:', error);
      toast.error('Failed to approve subscription');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('daycare_subscriptions' as any)
        .update({
          is_active: false,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['daycare-subscriptions'] });
    },
    onError: (error) => {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('daycare_subscriptions' as any)
        .update({
          is_active: true,
          cancelled_at: null,
          cancelled_by: null,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subscription reactivated');
      queryClient.invalidateQueries({ queryKey: ['daycare-subscriptions'] });
    },
    onError: (error) => {
      console.error('Error reactivating subscription:', error);
      toast.error('Failed to reactivate subscription');
    },
  });

  const regenerateReservationsMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase.functions.invoke('generate-subscription-reservations', {
        body: { subscriptionId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reservations regenerated');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      console.error('Error regenerating reservations:', error);
      toast.error('Failed to regenerate reservations');
    },
  });

  const pendingSubscriptions = subscriptions.filter(s => !s.is_approved && s.is_active);
  const activeSubscriptions = subscriptions.filter(s => s.is_approved && s.is_active);
  const cancelledSubscriptions = subscriptions.filter(s => !s.is_active);

  const renderSubscriptionCard = (subscription: DaycareSubscription, showActions: boolean = true) => (
    <Card key={subscription.id} className="mb-3">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{subscription.pet.name}</span>
              {subscription.pet.breed && (
                <span className="text-sm text-muted-foreground">({subscription.pet.breed})</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Owner: {subscription.client.first_name} {subscription.client.last_name}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant={subscription.day_type === 'full' ? 'default' : 'secondary'}>
                {subscription.day_type === 'full' ? 'Full Day' : `Half Day (${subscription.half_day_period})`}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {subscription.days_of_week.map((day) => (
                <Badge key={day} variant="outline" className="text-xs">
                  {DAYS_OF_WEEK[day]}
                </Badge>
              ))}
            </div>
            {subscription.notes && (
              <p className="text-sm text-muted-foreground italic">"{subscription.notes}"</p>
            )}
            <p className="text-xs text-muted-foreground">
              Created: {format(new Date(subscription.created_at), 'MMM d, yyyy')}
            </p>
          </div>

          {showActions && (
            <div className="flex flex-col gap-2">
              {/* Pending subscriptions */}
              {!subscription.is_approved && subscription.is_active && (
                <>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(subscription.id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelMutation.mutate(subscription.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </>
              )}

              {/* Active subscriptions */}
              {subscription.is_approved && subscription.is_active && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => regenerateReservationsMutation.mutate(subscription.id)}
                    disabled={regenerateReservationsMutation.isPending}
                  >
                    {regenerateReservationsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelMutation.mutate(subscription.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              )}

              {/* Cancelled subscriptions */}
              {!subscription.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reactivateMutation.mutate(subscription.id)}
                  disabled={reactivateMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Reactivate
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recurring Daycare Subscriptions</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Subscription
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {pendingSubscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingSubscriptions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Active
              {activeSubscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeSubscriptions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancelled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending subscriptions</p>
            ) : (
              pendingSubscriptions.map((sub) => renderSubscriptionCard(sub))
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {activeSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active subscriptions</p>
            ) : (
              activeSubscriptions.map((sub) => renderSubscriptionCard(sub))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4">
            {cancelledSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No cancelled subscriptions</p>
            ) : (
              cancelledSubscriptions.map((sub) => renderSubscriptionCard(sub))
            )}
          </TabsContent>
        </Tabs>
      )}

      <CreateDaycareSubscriptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubscriptionCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['daycare-subscriptions'] });
        }}
      />
    </div>
  );
}
