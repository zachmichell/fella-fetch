import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageNotificationSound } from '@/hooks/useMessageNotificationSound';
import { MessageCircle, Send, Loader2, User, Users, Clock, Search, Calendar, Plus, ShoppingCart } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ChatCalendarDrawer } from '@/components/staff/messages/ChatCalendarDrawer';
import { SendReservationProposal, type ReservationProposalData } from '@/components/staff/messages/SendReservationProposal';
import { ReservationProposalCard, type ReservationProposalDisplayData } from '@/components/staff/messages/ReservationProposalCard';
import { SendCreditPurchase, type CreditPurchaseData } from '@/components/staff/messages/SendCreditPurchase';
import { CreditPurchaseCard } from '@/components/staff/messages/CreditPurchaseCard';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface ChatMessage {
  id: string;
  client_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  read_at: string | null;
  staff_id: string | null;
}

interface ConversationSummary {
  client: Client;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

// Helper to extract JSON between markers with balanced bracket matching
const extractJsonFromMarker = (content: string, marker: string): string | null => {
  const startMarker = `[${marker}:`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return null;
  
  const jsonStart = startIdx + startMarker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = jsonStart; i < content.length; i++) {
    const char = content[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    
    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        if (depth === 0 && char === ']') {
          // End of marker
          return content.slice(jsonStart, i);
        }
        depth--;
      }
    }
  }
  return null;
};

// Helper to check if content contains a reservation proposal
const parseProposalFromContent = (content: string): ReservationProposalDisplayData | null => {
  try {
    const jsonStr = extractJsonFromMarker(content, 'PROPOSAL');
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
  } catch {
    // Not a proposal message
  }
  return null;
};

// Helper to check if content contains a credit purchase card
const parseCreditPurchaseFromContent = (content: string): CreditPurchaseData | null => {
  try {
    const jsonStr = extractJsonFromMarker(content, 'CREDIT_PURCHASE');
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
  } catch {
    // Not a credit purchase message
  }
  return null;
};

// Helper to get clean display content (removing markers)
const getDisplayContent = (content: string): string => {
  let result = content;
  const proposalJson = extractJsonFromMarker(result, 'PROPOSAL');
  if (proposalJson) {
    result = result.replace(`[PROPOSAL:${proposalJson}]`, '');
  }
  const creditJson = extractJsonFromMarker(result, 'CREDIT_PURCHASE');
  if (creditJson) {
    result = result.replace(`[CREDIT_PURCHASE:${creditJson}]`, '');
  }
  return result.trim();
};

// Helper to get clean preview text for conversation list
const getPreviewText = (content: string): string => {
  const proposal = parseProposalFromContent(content);
  if (proposal) {
    // Show a friendly preview instead of raw content
    const serviceLabel = proposal.serviceType === 'daycare' 
      ? (proposal.daycareType === 'half' ? 'Half Day Daycare' : 'Full Day Daycare')
      : proposal.serviceType === 'boarding' ? 'Boarding' : 'Grooming';
    const statusEmoji = proposal.status === 'accepted' ? '✅' : proposal.status === 'declined' ? '❌' : '📋';
    return `${statusEmoji} ${serviceLabel} Proposal for ${proposal.petName}`;
  }
  
  const creditPurchase = parseCreditPurchaseFromContent(content);
  if (creditPurchase) {
    const productCount = creditPurchase.products.length;
    const statusEmoji = creditPurchase.status === 'purchased' ? '✅' : '🛒';
    return `${statusEmoji} Credit Purchase (${productCount} package${productCount !== 1 ? 's' : ''})`;
  }
  
  return content;
};

interface StaffProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

const StaffMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, StaffProfile>>({});
  const [reservationStatuses, setReservationStatuses] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConversations, setIsFetchingConversations] = useState(true);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [creditPurchaseDialogOpen, setCreditPurchaseDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Typing indicator - only active when a client is selected
  const { setTyping, isOtherTyping, typingUserNames } = useTypingIndicator({
    channelName: selectedClient ? `chat-${selectedClient.id}` : '',
    userId: user?.id || '',
    userName: 'Staff',
  });

  // Sound notification
  const { playSound, enableSound } = useMessageNotificationSound();

  // Fetch staff profiles for attribution
  const fetchStaffProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name');
      
      if (error) throw error;
      
      const profilesMap: Record<string, StaffProfile> = {};
      (data || []).forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
      setStaffProfiles(profilesMap);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
    }
  }, []);

  // Helper to get staff name
  const getStaffName = useCallback((staffId: string | null): string | null => {
    if (!staffId) return null;
    const profile = staffProfiles[staffId];
    if (!profile) return null;
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return null;
  }, [staffProfiles]);
  const fetchConversations = useCallback(async () => {
    try {
      // Get all clients that have chat messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('client_id, role, content, created_at, read_at, id')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique client IDs
      const clientIds = [...new Set(messagesData?.map(m => m.client_id) || [])];

      if (clientIds.length === 0) {
        setConversations([]);
        setIsFetchingConversations(false);
        return;
      }

      // Fetch client details
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // Build conversation summaries
      const summaries: ConversationSummary[] = (clientsData || []).map((client) => {
        const clientMessages = messagesData?.filter(m => m.client_id === client.id) || [];
        const lastMessage = clientMessages[0] || null;
        const unreadCount = clientMessages.filter(m => m.role === 'user' && !m.read_at).length;

        return {
          client,
          lastMessage: lastMessage ? { ...lastMessage, role: lastMessage.role as 'user' | 'assistant', staff_id: null } : null,
          unreadCount,
        };
      });

      // Sort by last message time
      summaries.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(summaries);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingConversations(false);
    }
  }, [toast]);

  // Fetch messages for selected client
  const fetchMessages = useCallback(async (clientId: string) => {
    setIsFetchingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const msgs = (data || []).map(m => ({ ...m, role: m.role as 'user' | 'assistant' }));
      setMessages(msgs);

      // Extract reservation IDs from proposals to fetch their statuses
      const reservationIds: string[] = [];
      msgs.forEach(m => {
        const proposal = parseProposalFromContent(m.content);
        if (proposal?.reservationId) {
          reservationIds.push(proposal.reservationId);
        }
      });
      
      if (reservationIds.length > 0) {
        const { data: reservations } = await supabase
          .from('reservations')
          .select('id, status')
          .in('id', reservationIds);
        
        if (reservations) {
          const statusMap: Record<string, string> = {};
          reservations.forEach(r => { statusMap[r.id] = r.status; });
          setReservationStatuses(prev => ({ ...prev, ...statusMap }));
        }
      }

      // Mark unread messages as read
      const unreadIds = data?.filter(m => m.role === 'user' && !m.read_at).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);

        // Update conversation unread count
        setConversations(prev =>
          prev.map(c =>
            c.client.id === clientId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingMessages(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    fetchStaffProfiles();
  }, [fetchConversations, fetchStaffProfiles]);

  // Real-time subscription for new and updated messages
  useEffect(() => {
    const channel = supabase
      .channel('staff-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // If viewing this conversation, add the message
          if (selectedClient && newMessage.client_id === selectedClient.id) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, { ...newMessage, role: newMessage.role as 'user' | 'assistant' }];
            });

            // Mark as read if from client
            if (newMessage.role === 'user') {
              supabase
                .from('chat_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', newMessage.id);
            }
          }

          // Play notification sound for new client messages
          if (newMessage.role === 'user') {
            playSound();
          }

          // Always refresh conversation list
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          
          // If viewing this conversation, update the message (for proposal status changes)
          if (selectedClient && updatedMessage.client_id === selectedClient.id) {
            setMessages((prev) =>
              prev.map(m =>
                m.id === updatedMessage.id
                  ? { ...updatedMessage, role: updatedMessage.role as 'user' | 'assistant' }
                  : m
              )
            );
          }

          // Refresh conversation list to update previews
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient, fetchConversations, playSound]);

  // Real-time subscription for reservation status changes
  useEffect(() => {
    const channel = supabase
      .channel('staff-reservation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const updatedReservation = payload.new as { id: string; status: string };
          // Update our local cache of reservation statuses
          setReservationStatuses(prev => ({
            ...prev,
            [updatedReservation.id]: updatedReservation.status
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper to get proposal status from reservation status (source of truth)
  const getProposalStatus = useCallback((proposal: ReservationProposalDisplayData): 'pending_client_approval' | 'accepted' | 'declined' => {
    if (!proposal.reservationId) return proposal.status;
    const reservationStatus = reservationStatuses[proposal.reservationId];
    if (reservationStatus === 'confirmed' || reservationStatus === 'checked_in' || reservationStatus === 'checked_out') {
      return 'accepted';
    }
    if (reservationStatus === 'cancelled') {
      return 'declined';
    }
    return 'pending_client_approval';
  }, [reservationStatuses]);

  // Scroll to bottom when messages change or typing indicator updates
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isOtherTyping, isFetchingMessages, scrollToBottom]);

  // Focus input when client selected
  useEffect(() => {
    if (selectedClient && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedClient]);

  // Load messages when client selected
  useEffect(() => {
    if (selectedClient) {
      fetchMessages(selectedClient.id);
    } else {
      setMessages([]);
    }
  }, [selectedClient, fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedClient || !user) return;

    const messageContent = input.trim();
    setInput('');
    setTyping(false);
    setIsLoading(true);

    // Optimistically add message
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      client_id: selectedClient.id,
      role: 'assistant',
      content: messageContent,
      created_at: new Date().toISOString(),
      read_at: null,
      staff_id: user.id,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          client_id: selectedClient.id,
          role: 'assistant',
          content: messageContent,
          staff_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev =>
        prev.map(m =>
          m.id === tempMessage.id ? { ...data, role: data.role as 'user' | 'assistant' } : m
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    // Trigger typing indicator
    if (value.length > 0) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handler to send a reservation proposal - creates a pending reservation immediately
  const handleSendProposal = async (content: string, proposalData: ReservationProposalData) => {
    if (!selectedClient || !user) return;
    
    // First, create the pending reservation
    const reservationData: any = {
      pet_id: proposalData.petId,
      service_type: proposalData.serviceType,
      start_date: proposalData.startDate,
      end_date: proposalData.endDate || null,
      start_time: proposalData.startTime || null,
      end_time: proposalData.endTime || null,
      groomer_id: proposalData.groomerId || null,
      suite_id: proposalData.suiteId || null,
      notes: proposalData.notes || null,
      price: proposalData.price ? parseFloat(proposalData.price) : null,
      status: 'pending', // Created as pending - shows in Control Center "Requested" tab
    };

    // Add daycare type to notes if applicable
    if (proposalData.serviceType === 'daycare' && proposalData.daycareType) {
      reservationData.notes = `Day Type: ${proposalData.daycareType === 'full' ? 'Full Day' : 'Half Day'}${proposalData.notes ? ` | ${proposalData.notes}` : ''}`;
    }

    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert(reservationData)
      .select('id')
      .single();

    if (reservationError) throw reservationError;

    // Add reservation ID to the proposal data for later updates
    const proposalWithReservationId = {
      ...proposalData,
      reservationId: reservation.id,
    };

    // Encode proposal data into the message content
    const contentWithData = `[PROPOSAL:${JSON.stringify(proposalWithReservationId)}]`;
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        client_id: selectedClient.id,
        role: 'assistant',
        content: contentWithData,
        staff_id: user.id,
      });

    if (error) throw error;
    
    toast({
      title: 'Proposal sent',
      description: 'Reservation request created. The client can accept or decline.',
    });
  };

  // Handler to send a credit purchase card
  const handleSendCreditPurchase = async (content: string, purchaseData: CreditPurchaseData) => {
    if (!selectedClient || !user) return;
    
    // Encode credit purchase data into the message content
    const contentWithData = `[CREDIT_PURCHASE:${JSON.stringify(purchaseData)}]`;
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        client_id: selectedClient.id,
        role: 'assistant',
        content: contentWithData,
        staff_id: user.id,
      });

    if (error) throw error;
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const fullName = `${conv.client.first_name} ${conv.client.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
           conv.client.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <StaffLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
          {/* Conversations List */}
          <Card className="md:col-span-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle className="text-lg">Conversations</CardTitle>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {isFetchingConversations ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.client.id}
                        onClick={() => setSelectedClient(conv.client)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedClient?.id === conv.client.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {conv.client.first_name} {conv.client.last_name}
                              </p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conv.lastMessage.role === 'assistant' && 'You: '}
                                {getPreviewText(conv.lastMessage.content)}
                              </p>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col min-h-0">
            {selectedClient ? (
              <>
                <CardHeader className="pb-3 border-b flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </CardTitle>
                      {selectedClient.email && (
                        <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="sm" onClick={() => setCalendarDrawerOpen(true)}>
                        <Calendar className="h-4 w-4 mr-1" />
                        Calendar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setProposalDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Send Proposal
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCreditPurchaseDialogOpen(true)}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Send Credits
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    {isFetchingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const proposal = parseProposalFromContent(message.content);
                          const creditPurchase = parseCreditPurchaseFromContent(message.content);
                          const displayContent = getDisplayContent(message.content);
                          const isCardOnly = (proposal || creditPurchase) && !displayContent;
                          const staffName = message.role === 'assistant' ? getStaffName(message.staff_id) : null;
                          
                          // Get the derived status from reservation (source of truth)
                          const proposalWithDerivedStatus = proposal 
                            ? { ...proposal, status: getProposalStatus(proposal) } 
                            : null;

                          return (
                            <div
                              key={message.id}
                              className={`flex gap-2 ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                            >
                              {message.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-secondary-foreground" />
                                </div>
                              )}
                              <div className={`max-w-[80%] space-y-1 ${message.role === 'assistant' ? 'flex flex-col items-end' : ''}`}>
                                {/* Show staff name for staff messages */}
                                {message.role === 'assistant' && staffName && (
                                  <p className="text-[10px] text-muted-foreground font-medium mr-1">
                                    {staffName}
                                  </p>
                                )}
                                
                                {/* Show proposal card if present */}
                                {proposalWithDerivedStatus && (
                                  <ReservationProposalCard proposal={proposalWithDerivedStatus} isClientView={false} />
                                )}
                                
                                {/* Show credit purchase card if present */}
                                {creditPurchase && (
                                  <CreditPurchaseCard data={creditPurchase} isClientView={false} />
                                )}
                                
                                {/* Only show text bubble if there's non-proposal content */}
                                {displayContent && (
                                  <div
                                    className={`rounded-lg px-3 py-2 text-sm ${
                                      message.role === 'assistant'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{displayContent}</p>
                                    <div className={`flex items-center gap-1 text-[10px] mt-1 ${
                                      message.role === 'assistant' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    }`}>
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(message.created_at), 'h:mm a')}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Show timestamp on card-only messages */}
                                {isCardOnly && (
                                  <div className={`flex items-center gap-1 text-[10px] ${
                                    message.role === 'assistant' ? 'text-muted-foreground' : 'text-muted-foreground'
                                  }`}>
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(message.created_at), 'h:mm a')}
                                  </div>
                                )}
                              </div>
                              {message.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Typing Indicator */}
                        {isOtherTyping && (
                          <div className="flex gap-2 justify-start">
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-secondary-foreground" />
                            </div>
                            <div className="bg-muted rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {typingUserNames.length > 0 ? typingUserNames[0] : 'Client'} is typing...
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your reply..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a client from the list to view messages</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Calendar Drawer */}
      <ChatCalendarDrawer open={calendarDrawerOpen} onOpenChange={setCalendarDrawerOpen} />

      {/* Send Proposal Dialog */}
      {selectedClient && (
        <SendReservationProposal
          open={proposalDialogOpen}
          onOpenChange={setProposalDialogOpen}
          clientId={selectedClient.id}
          clientName={`${selectedClient.first_name} ${selectedClient.last_name}`}
          onSend={handleSendProposal}
        />
      )}

      {/* Send Credit Purchase Dialog */}
      {selectedClient && (
        <SendCreditPurchase
          open={creditPurchaseDialogOpen}
          onOpenChange={setCreditPurchaseDialogOpen}
          clientId={selectedClient.id}
          clientName={`${selectedClient.first_name} ${selectedClient.last_name}`}
          onSend={handleSendCreditPurchase}
        />
      )}
    </StaffLayout>
  );
};

export default StaffMessages;
