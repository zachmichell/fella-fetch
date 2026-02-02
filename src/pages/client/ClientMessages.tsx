import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Send, Loader2, User, Headphones } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { useClientAuth } from '@/contexts/ClientAuthContext';

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

const ClientMessages = () => {
  const { toast } = useToast();
  const { clientData } = useClientAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
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
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.role === 'assistant') {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            // Mark as read immediately
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

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
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Headphones className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {format(new Date(message.created_at), 'h:mm a')}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
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
