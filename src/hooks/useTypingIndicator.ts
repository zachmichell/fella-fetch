import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingState {
  [key: string]: {
    userId: string;
    userName: string;
    isTyping: boolean;
    timestamp: number;
  };
}

interface UseTypingIndicatorOptions {
  channelName: string;
  userId: string;
  userName: string;
}

export const useTypingIndicator = ({ channelName, userId, userName }: UseTypingIndicatorOptions) => {
  const [othersTyping, setOthersTyping] = useState<TypingState>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up stale typing indicators (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setOthersTyping((prev) => {
        const now = Date.now();
        const updated: TypingState = {};
        let hasChanges = false;
        
        Object.entries(prev).forEach(([key, value]) => {
          if (now - value.timestamp < 3000) {
            updated[key] = value;
          } else {
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up presence channel
  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(`typing:${channelName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers: TypingState = {};
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== userId && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as { isTyping?: boolean; userName?: string };
            if (presence.isTyping) {
              typingUsers[key] = {
                userId: key,
                userName: presence.userName || 'Someone',
                isTyping: true,
                timestamp: Date.now(),
              };
            }
          }
        });
        
        setOthersTyping(typingUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            isTyping: false,
            userName,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, userId, userName]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    channelRef.current.track({
      isTyping,
      userName,
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({
            isTyping: false,
            userName,
          });
        }
      }, 3000);
    }
  }, [userName]);

  const typingUsers = Object.values(othersTyping).filter(u => u.isTyping);
  const isOtherTyping = typingUsers.length > 0;
  const typingUserNames = typingUsers.map(u => u.userName);

  return {
    setTyping,
    isOtherTyping,
    typingUserNames,
  };
};
