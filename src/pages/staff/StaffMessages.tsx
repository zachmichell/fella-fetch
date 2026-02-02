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
import { MessageCircle, Send, Loader2, User, Users, Clock, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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

const StaffMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConversations, setIsFetchingConversations] = useState(true);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Fetch all conversations
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
      setMessages((data || []).map(m => ({ ...m, role: m.role as 'user' | 'assistant' })));

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
  }, [fetchConversations]);

  // Real-time subscription for new messages
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

          // Always refresh conversation list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient, fetchConversations]);

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
                                {conv.lastMessage.content}
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
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-2 ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.role === 'user' && (
                              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-secondary-foreground" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                message.role === 'assistant'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <div className={`flex items-center gap-1 text-[10px] mt-1 ${
                                message.role === 'assistant' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                <Clock className="h-3 w-3" />
                                {format(new Date(message.created_at), 'h:mm a')}
                              </div>
                            </div>
                            {message.role === 'assistant' && (
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>
                        ))}
                        
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
    </StaffLayout>
  );
};

export default StaffMessages;
