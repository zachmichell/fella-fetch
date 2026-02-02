import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useClientUnreadMessages(clientId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!clientId) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('role', 'assistant')
        .is('read_at', null);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching client unread count:', error);
    }
  }, [clientId]);

  // Mark all staff messages as read and reset count to zero immediately
  const markAllAsRead = useCallback(async () => {
    if (!clientId) return;

    // Immediately set count to zero for instant UI feedback
    setUnreadCount(0);

    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('role', 'assistant')
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Refetch to get accurate count if update failed
      fetchUnreadCount();
    }
  }, [clientId, fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Real-time subscription for new staff messages
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-unread-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          // Only increment count for new staff messages
          const newMessage = payload.new as { role: string };
          if (newMessage.role === 'assistant') {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchUnreadCount]);

  return { unreadCount, refetch: fetchUnreadCount, markAllAsRead };
}
