import { useState, useMemo } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';
import { 
  Mail, 
  MessageSquare, 
  Filter, 
  Users, 
  Dog,
  Plus,
  Save,
  ChevronDown,
  ChevronRight,
  Send,
  Trash2
} from 'lucide-react';
import { MarketingFilterBuilder, FilterCondition } from '@/components/staff/marketing/MarketingFilterBuilder';
import { SaveSegmentDialog } from '@/components/staff/marketing/SaveSegmentDialog';
import { ResizableColumn, useColumnWidths } from '@/components/ui/resizable-column';
import { MarketingMessageComposer, EmailBlock } from '@/components/staff/marketing/MarketingMessageComposer';

const COLUMN_CONFIG = [
  { key: 'client', defaultWidth: 200 },
  { key: 'contact', defaultWidth: 180 },
  { key: 'phone', defaultWidth: 140 },
  { key: 'credits', defaultWidth: 180 },
  { key: 'pets', defaultWidth: 80 },
];

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  lastVisitDate: string | null;
  lastGroomDate: string | null;
  daysSinceLastVisit: number | null;
  daysSinceLastGroom: number | null;
  hasActiveSubscription: boolean;
}

interface ClientWithPets {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  daycareCredits: number;
  halfDaycareCredits: number;
  boardingCredits: number;
  pets: Pet[];
}

interface MarketingSegment {
  id: string;
  name: string;
  description: string | null;
  filters: FilterCondition[];
  is_preset: boolean;
}

const StaffMarketing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Message composer state
  const [smsContent, setSmsContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);
  
  const { widths, setWidth } = useColumnWidths({
    columns: COLUMN_CONFIG,
    storageKey: 'marketing-table-columns',
  });

  // Fetch segments
  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ['marketing-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_segments')
        .select('*')
        .order('is_preset', { ascending: false })
        .order('name');
      if (error) throw error;
      return data.map(segment => ({
        ...segment,
        filters: (Array.isArray(segment.filters) ? segment.filters : []) as unknown as FilterCondition[],
      })) as MarketingSegment[];
    },
  });

  // Fetch all clients with pets and calculate metrics
  const { data: clientsWithPets, isLoading: clientsLoading } = useQuery({
    queryKey: ['marketing-clients'],
    queryFn: async () => {
      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('last_name');
      if (clientsError) throw clientsError;

      // Get all pets
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('is_active', true);
      if (petsError) throw petsError;

      // Get last visits for each pet (most recent reservation)
      const { data: lastVisits, error: visitsError } = await supabase
        .from('reservations')
        .select('pet_id, start_date, service_type')
        .in('status', ['checked_out', 'confirmed', 'checked_in'])
        .order('start_date', { ascending: false });
      if (visitsError) throw visitsError;

      // Get active daycare subscriptions
      const { data: activeSubscriptions, error: subsError } = await supabase
        .from('daycare_subscriptions')
        .select('pet_id')
        .eq('is_active', true)
        .eq('is_approved', true);
      if (subsError) throw subsError;

      const activePetIds = new Set(activeSubscriptions.map(s => s.pet_id));
      const today = new Date();

      // Map pets with their last visit/groom dates
      const petsWithDates = pets.map(pet => {
        const petVisits = lastVisits.filter(v => v.pet_id === pet.id);
        const lastVisit = petVisits[0];
        const lastGroom = petVisits.find(v => v.service_type === 'grooming');

        const lastVisitDate = lastVisit?.start_date || null;
        const lastGroomDate = lastGroom?.start_date || null;

        return {
          id: pet.id,
          clientId: pet.client_id,
          name: pet.name,
          breed: pet.breed,
          lastVisitDate,
          lastGroomDate,
          daysSinceLastVisit: lastVisitDate 
            ? differenceInDays(today, parseISO(lastVisitDate)) 
            : null,
          daysSinceLastGroom: lastGroomDate 
            ? differenceInDays(today, parseISO(lastGroomDate)) 
            : null,
          hasActiveSubscription: activePetIds.has(pet.id),
        };
      });

      // Group by client
      return clients.map(client => ({
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
        daycareCredits: client.daycare_credits,
        halfDaycareCredits: client.half_daycare_credits,
        boardingCredits: client.boarding_credits,
        pets: petsWithDates.filter(p => p.clientId === client.id),
      })) as ClientWithPets[];
    },
  });

  // Apply filters to get filtered results
  const filteredClients = useMemo(() => {
    if (!clientsWithPets) return [];
    if (filters.length === 0) return clientsWithPets;

    return clientsWithPets.filter(client => {
      return filters.every(filter => {
        const { field, operator, value } = filter;

        // Helper for numeric comparison
        const compareNumeric = (actual: number, op: string, target: number): boolean => {
          switch (op) {
            case 'eq': return actual === target;
            case 'neq': return actual !== target;
            case 'gt': return actual > target;
            case 'gte': return actual >= target;
            case 'lt': return actual < target;
            case 'lte': return actual <= target;
            default: return true;
          }
        };

        // Helper for string comparison
        const compareString = (actual: string | null, op: string, target: string): boolean => {
          if (!actual) return false;
          const normalizedActual = actual.toLowerCase();
          const normalizedTarget = target.toLowerCase();
          switch (op) {
            case 'contains': return normalizedActual.includes(normalizedTarget);
            case 'eq': return normalizedActual === normalizedTarget;
            case 'neq': return normalizedActual !== normalizedTarget;
            case 'starts_with': return normalizedActual.startsWith(normalizedTarget);
            default: return true;
          }
        };

        // Client-level filters
        if (field === 'daycare_credits') {
          return compareNumeric(client.daycareCredits, operator, value as number);
        }
        if (field === 'half_daycare_credits') {
          return compareNumeric(client.halfDaycareCredits, operator, value as number);
        }
        if (field === 'boarding_credits') {
          return compareNumeric(client.boardingCredits, operator, value as number);
        }

        // Pet-level filters (at least one pet must match)
        if (field === 'days_since_last_visit') {
          return client.pets.some(pet => 
            pet.daysSinceLastVisit !== null && 
            compareNumeric(pet.daysSinceLastVisit, operator, value as number)
          );
        }
        if (field === 'days_since_last_groom') {
          return client.pets.some(pet => 
            pet.daysSinceLastGroom !== null && 
            compareNumeric(pet.daysSinceLastGroom, operator, value as number)
          );
        }
        if (field === 'never_visited') {
          return client.pets.some(pet => pet.daysSinceLastVisit === null);
        }
        if (field === 'never_groomed') {
          return client.pets.some(pet => pet.daysSinceLastGroom === null);
        }

        // New filters
        if (field === 'has_active_subscription') {
          return client.pets.some(pet => pet.hasActiveSubscription);
        }
        if (field === 'pet_name') {
          return client.pets.some(pet => compareString(pet.name, operator, value as string));
        }
        if (field === 'pet_breed') {
          return client.pets.some(pet => compareString(pet.breed, operator, value as string));
        }

        return true;
      });
    });
  }, [clientsWithPets, filters]);

  // Update selection when filtered results change
  const selectedCount = selectedClients.size;
  const allSelected = filteredClients.length > 0 && selectedClients.size === filteredClients.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleSelectClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const toggleExpanded = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleApplySegment = (segment: MarketingSegment) => {
    setFilters(segment.filters);
    setActiveSegmentId(segment.id);
    setSelectedClients(new Set());
  };

  const handleClearFilters = () => {
    setFilters([]);
    setActiveSegmentId(null);
    setSelectedClients(new Set());
  };

  const handleDeleteSegment = async (segmentId: string) => {
    const { error } = await supabase
      .from('marketing_segments')
      .delete()
      .eq('id', segmentId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete segment',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Segment deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
      if (activeSegmentId === segmentId) {
        handleClearFilters();
      }
    }
  };

  const handleSendWebhook = async (channel: 'sms' | 'email') => {
    if (selectedClients.size === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select at least one client to send to',
        variant: 'destructive',
      });
      return;
    }

    // Validate content exists
    if (channel === 'sms' && !smsContent.trim()) {
      toast({
        title: 'No message content',
        description: 'Please enter an SMS message to send',
        variant: 'destructive',
      });
      return;
    }

    if (channel === 'email' && emailBlocks.length === 0) {
      toast({
        title: 'No email content',
        description: 'Please add content blocks to your email',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const selectedData = filteredClients.filter(c => selectedClients.has(c.id));
      const activeSegment = segments?.find(s => s.id === activeSegmentId);

      const payload = {
        channel,
        segmentName: activeSegment?.name || 'Custom Filter',
        segmentDescription: activeSegment?.description,
        filters,
        message: channel === 'sms' ? smsContent : undefined,
        emailSubject: channel === 'email' ? emailSubject : undefined,
        emailContent: channel === 'email' ? JSON.stringify(emailBlocks) : undefined,
        sentAt: new Date().toISOString(),
        sentBy: 'admin',
        recipients: selectedData.map(client => ({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          clientEmail: client.email,
          clientPhone: client.phone,
          pets: client.pets.map(pet => ({
            petId: pet.id,
            petName: pet.name,
            petBreed: pet.breed,
            daysSinceLastVisit: pet.daysSinceLastVisit,
            daysSinceLastGroom: pet.daysSinceLastGroom,
            lastVisitDate: pet.lastVisitDate,
            lastGroomDate: pet.lastGroomDate,
          })),
        })),
      };

      const { error } = await supabase.functions.invoke('marketing-webhook', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: 'Sent!',
        description: `${channel.toUpperCase()} message sent to ${selectedData.length} clients`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send webhook',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = segmentsLoading || clientsLoading;

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Marketing</h1>
          <p className="text-muted-foreground">
            Segment clients and pets for targeted outreach
          </p>
        </div>

        {/* Segment Quick Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Saved Segments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentsLoading ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-32" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {segments?.map(segment => (
                  <div key={segment.id} className="flex items-center gap-1">
                    <Button
                      variant={activeSegmentId === segment.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleApplySegment(segment)}
                    >
                      {segment.name}
                      {segment.is_preset && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Preset
                        </Badge>
                      )}
                    </Button>
                    {!segment.is_preset && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSegment(segment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {filters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter Builder */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Build Custom Filter
              </CardTitle>
              {filters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Segment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MarketingFilterBuilder 
              filters={filters} 
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                setActiveSegmentId(null);
              }} 
            />
          </CardContent>
        </Card>

        {/* Results & Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Results
                <Badge variant="secondary">
                  {filteredClients.length} clients
                </Badge>
                {selectedCount > 0 && (
                  <Badge variant="default">
                    {selectedCount} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Select clients to include in your outreach
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clients match the current filters
              </div>
            ) : (
              <div className="space-y-1 overflow-x-auto">
                {/* Header row */}
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md font-medium text-sm min-w-max">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <div className="w-8 flex-shrink-0" /> {/* Expand icon space */}
                  <ResizableColumn
                    width={widths.client}
                    onResize={(w) => setWidth('client', w)}
                    isHeader
                    minWidth={120}
                    maxWidth={400}
                  >
                    Client
                  </ResizableColumn>
                  <ResizableColumn
                    width={widths.contact}
                    onResize={(w) => setWidth('contact', w)}
                    isHeader
                    minWidth={100}
                    maxWidth={300}
                  >
                    Email
                  </ResizableColumn>
                  <ResizableColumn
                    width={widths.phone}
                    onResize={(w) => setWidth('phone', w)}
                    isHeader
                    minWidth={100}
                    maxWidth={200}
                  >
                    Phone
                  </ResizableColumn>
                  <ResizableColumn
                    width={widths.credits}
                    onResize={(w) => setWidth('credits', w)}
                    isHeader
                    minWidth={120}
                    maxWidth={300}
                  >
                    Credits
                  </ResizableColumn>
                  <ResizableColumn
                    width={widths.pets}
                    onResize={(w) => setWidth('pets', w)}
                    isHeader
                    minWidth={60}
                    maxWidth={120}
                    className="text-center"
                  >
                    Pets
                  </ResizableColumn>
                </div>

                {/* Client rows */}
                {filteredClients.map(client => (
                  <div key={client.id}>
                    <div 
                      className="flex items-center gap-3 px-3 py-3 hover:bg-muted/30 rounded-md cursor-pointer min-w-max"
                      onClick={() => toggleExpanded(client.id)}
                    >
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => handleSelectClient(client.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="w-8 flex-shrink-0">
                        {client.pets.length > 0 && (
                          expandedClients.has(client.id) 
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium truncate" style={{ width: widths.client }}>
                        {client.firstName} {client.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate" style={{ width: widths.contact }}>
                        {client.email || '—'}
                      </div>
                      <div className="text-sm text-muted-foreground truncate" style={{ width: widths.phone }}>
                        {client.phone || '—'}
                      </div>
                      <div style={{ width: widths.credits }}>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            FD: {client.daycareCredits}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            HD: {client.halfDaycareCredits}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            BD: {client.boardingCredits}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center" style={{ width: widths.pets }}>
                        <Badge variant="secondary">
                          <Dog className="h-3 w-3 mr-1" />
                          {client.pets.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded pet details */}
                    {expandedClients.has(client.id) && client.pets.length > 0 && (
                      <div className="ml-14 mb-2 space-y-1">
                        {client.pets.map(pet => (
                          <div 
                            key={pet.id}
                            className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded text-sm"
                          >
                            <Dog className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <span className="font-medium">{pet.name}</span>
                              {pet.breed && (
                                <span className="text-muted-foreground ml-2">
                                  ({pet.breed})
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>
                                Last visit: {pet.daysSinceLastVisit !== null 
                                  ? `${pet.daysSinceLastVisit} days ago` 
                                  : 'Never'}
                              </span>
                              <span>
                                Last groom: {pet.daysSinceLastGroom !== null 
                                  ? `${pet.daysSinceLastGroom} days ago` 
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Composer Section */}
        <div className="pt-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Message
          </h2>
          <MarketingMessageComposer
            smsContent={smsContent}
            onSmsContentChange={setSmsContent}
            emailSubject={emailSubject}
            onEmailSubjectChange={setEmailSubject}
            emailBlocks={emailBlocks}
            onEmailBlocksChange={setEmailBlocks}
          />
        </div>

        {/* Send Buttons at Bottom */}
        <div className="flex justify-end gap-3 pt-4 pb-8">
          <Button
            variant="outline"
            size="lg"
            disabled={selectedCount === 0 || isSending}
            onClick={() => handleSendWebhook('email')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email to {selectedCount} {selectedCount === 1 ? 'Client' : 'Clients'}
          </Button>
          <Button
            size="lg"
            disabled={selectedCount === 0 || isSending}
            onClick={() => handleSendWebhook('sms')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS to {selectedCount} {selectedCount === 1 ? 'Client' : 'Clients'}
          </Button>
        </div>

        <SaveSegmentDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          filters={filters}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
          }}
        />
      </div>
    </StaffLayout>
  );
};

export default StaffMarketing;
