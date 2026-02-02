import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageNotificationSound } from '@/hooks/useMessageNotificationSound';
import { Send, Loader2, User, Headphones } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ReservationProposalCard, ReservationProposalDisplayData } from '@/components/staff/messages/ReservationProposalCard';
import { CreditPurchaseCard } from '@/components/staff/messages/CreditPurchaseCard';
import { CreditPurchaseData } from '@/components/staff/messages/SendCreditPurchase';

const MAX_MESSAGE_LENGTH = 2000;
const messageSchema = z.string()
  .trim()
  .min(1, 'Message cannot be empty')
  .max(MAX_MESSAGE_LENGTH, `Message must be less than ${MAX_MESSAGE_LENGTH} characters`);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  read_at: string | null;
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
          // End of marker - return full marker for removal
          return content.slice(jsonStart, i);
        }
        depth--;
      }
    }
  }
  return null;
};

// Parse proposal from message content
const parseProposalFromContent = (content: string): ReservationProposalDisplayData | null => {
  try {
    const jsonStr = extractJsonFromMarker(content, 'PROPOSAL');
    if (jsonStr) {
      return JSON.parse(jsonStr) as ReservationProposalDisplayData;
    }
  } catch (e) {
    console.error('Error parsing proposal:', e);
  }
  return null;
};

// Parse credit purchase from message content
const parseCreditPurchaseFromContent = (content: string): CreditPurchaseData | null => {
  try {
    const jsonStr = extractJsonFromMarker(content, 'CREDIT_PURCHASE');
    if (jsonStr) {
      return JSON.parse(jsonStr) as CreditPurchaseData;
    }
  } catch (e) {
    console.error('Error parsing credit purchase:', e);
  }
  return null;
};

// Get display content without any markers
const getDisplayContent = (content: string): string => {
  // Remove proposal markers
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

const ClientMessages = () => {
  const { toast } = useToast();
  const { clientData } = useClientAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [processingProposalId, setProcessingProposalId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clientId = clientData?.id || '';
  const clientName = clientData ? `${clientData.first_name} ${clientData.last_name}` : '';

  // Typing indicator
  const { setTyping, isOtherTyping } = useTypingIndicator({
    channelName: clientId ? `chat-${clientId}` : '',
    userId: clientId,
    userName: clientName,
  });

  // Sound notification
  const { playSound, enableSound } = useMessageNotificationSound();

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    if (!clientId) return;
    setIsFetchingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({ ...m, role: m.role as 'user' | 'assistant' })));
      
      // Mark staff messages as read
      const unreadStaffIds = data?.filter(m => m.role === 'assistant' && !m.read_at).map(m => m.id) || [];
      if (unreadStaffIds.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadStaffIds);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingHistory(false);
    }
  }, [clientId, toast]);

  // Initial fetch
  useEffect(() => {
    if (clientId) {
      fetchChatHistory();
    }
  }, [clientId, fetchChatHistory]);

  // Auto-scroll when messages change or on initial load
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isOtherTyping, isFetchingHistory, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-messages-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            if (newMessage.role === 'assistant') {
              setMessages((prev) => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              // Play notification sound for new staff message
              playSound();
              // Mark as read immediately
              supabase
                .from('chat_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', newMessage.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Handle proposal status updates
            const updatedMessage = payload.new as ChatMessage;
            setMessages((prev) => 
              prev.map(m => m.id === updatedMessage.id ? { ...updatedMessage, role: updatedMessage.role as 'user' | 'assistant' } : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, playSound]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !isFetchingHistory) {
      inputRef.current.focus();
    }
  }, [isFetchingHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_MESSAGE_LENGTH);
    setInput(value);
    setTyping(value.length > 0);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !clientId) return;

    const validationResult = messageSchema.safeParse(input);
    if (!validationResult.success) {
      toast({
        title: 'Invalid message',
        description: validationResult.error.errors[0]?.message || 'Please check your message',
        variant: 'destructive',
      });
      return;
    }

    const userMessage = validationResult.data;
    setInput('');
    setTyping(false);
    setIsLoading(true);

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          client_id: clientId,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;

      setMessages(prev => prev.map(m => 
        m.id === tempUserMessage.id ? { ...savedUserMsg, role: savedUserMsg.role as 'user' | 'assistant' } : m
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper to replace proposal marker in content
  const replaceProposalInContent = (content: string, newProposal: ReservationProposalDisplayData): string => {
    const jsonStr = extractJsonFromMarker(content, 'PROPOSAL');
    if (jsonStr) {
      return content.replace(`[PROPOSAL:${jsonStr}]`, `[PROPOSAL:${JSON.stringify(newProposal)}]`);
    }
    return content;
  };

  // Handle accepting a proposal
  const handleAcceptProposal = async (message: ChatMessage, proposal: ReservationProposalDisplayData) => {
    setProcessingProposalId(message.id);
    try {
      // Create the reservation with confirmed status
      const reservationData: any = {
        pet_id: proposal.petId,
        service_type: proposal.serviceType,
        start_date: proposal.startDate,
        end_date: proposal.endDate || null,
        start_time: proposal.startTime || null,
        end_time: proposal.endTime || null,
        groomer_id: proposal.groomerId || null,
        suite_id: proposal.suiteId || null,
        notes: proposal.notes || null,
        price: proposal.price ? parseFloat(proposal.price) : null,
        status: 'confirmed', // Bypass pending status
      };

      // Add daycare type to notes if applicable
      if (proposal.serviceType === 'daycare' && proposal.daycareType) {
        reservationData.notes = `Day Type: ${proposal.daycareType === 'full' ? 'Full Day' : 'Half Day'}${proposal.notes ? ` | ${proposal.notes}` : ''}`;
      }

      const { error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData);

      if (reservationError) throw reservationError;

      // Update the proposal status in the message
      const updatedProposal = { ...proposal, status: 'accepted' as const };
      const updatedContent = replaceProposalInContent(message.content, updatedProposal);

      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ content: updatedContent })
        .eq('id', message.id);

      if (updateError) throw updateError;

      // Update local state immediately
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, content: updatedContent } : m
      ));

      toast({
        title: 'Reservation Confirmed!',
        description: `Your ${proposal.serviceType} reservation has been booked.`,
      });
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept the proposal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingProposalId(null);
    }
  };

  // Handle declining a proposal
  const handleDeclineProposal = async (message: ChatMessage, proposal: ReservationProposalDisplayData) => {
    setProcessingProposalId(message.id);
    try {
      // Update the proposal status in the message
      const updatedProposal = { ...proposal, status: 'declined' as const };
      const updatedContent = replaceProposalInContent(message.content, updatedProposal);

      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ content: updatedContent })
        .eq('id', message.id);

      if (updateError) throw updateError;

      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, content: updatedContent } : m
      ));

      toast({
        title: 'Proposal Declined',
        description: 'The reservation proposal has been declined.',
      });
    } catch (error) {
      console.error('Error declining proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline the proposal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingProposalId(null);
    }
  };

  // Render a message with potential proposal or credit purchase card
  const renderMessage = (message: ChatMessage) => {
    const proposal = parseProposalFromContent(message.content);
    const creditPurchase = parseCreditPurchaseFromContent(message.content);
    const displayContent = getDisplayContent(message.content);

    // For proposal messages, only show the card (no text bubble)
    if (proposal) {
      return (
        <div
          key={message.id}
          className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="max-w-[85%] space-y-2">
            <ReservationProposalCard
              proposal={proposal}
              isClientView={true}
              onAccept={() => handleAcceptProposal(message, proposal)}
              onDecline={() => handleDeclineProposal(message, proposal)}
              isProcessing={processingProposalId === message.id}
            />
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), 'h:mm a')}
            </p>
          </div>
        </div>
      );
    }

    // For credit purchase messages, show the purchase card
    if (creditPurchase) {
      return (
        <div
          key={message.id}
          className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="max-w-[85%] space-y-2">
            <CreditPurchaseCard
              data={creditPurchase}
              isClientView={true}
            />
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), 'h:mm a')}
            </p>
          </div>
        </div>
      );
    }

    // Regular message (no proposal)
    return (
      <div
        key={message.id}
        className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        {message.role === 'assistant' && (
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headphones className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className={`max-w-[85%] ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <p className="whitespace-pre-wrap">{displayContent}</p>
            <p className={`text-[10px] mt-1 ${
              message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {format(new Date(message.created_at), 'h:mm a')}
            </p>
          </div>
        </div>
        {message.role === 'user' && (
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-secondary-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <ClientPortalLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Chat with our team</p>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Support Team</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isOtherTyping ? 'Typing...' : 'We typically respond within a few hours'}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {isFetchingHistory ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-muted-foreground">
                  <Headphones className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Hi {clientName}! 👋</p>
                  <p className="text-xs mt-1">
                    Send us a message and our team will get back to you soon.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(renderMessage)}
                  
                  {isOtherTyping && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Headphones className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <Button
                  size="icon"
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
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientMessages;
