import { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Dog,
  ChevronRight,
  AlertCircle,
  Calendar,
  CreditCard,
  Pencil,
  Settings2
} from 'lucide-react';
import { ClientServicePermissions } from '@/components/staff/ClientServicePermissions';
import { format } from 'date-fns';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  vaccination_rabies: string | null;
  vaccination_bordetella: string | null;
  vaccination_distemper: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  pet_count: number;
  pets?: Pet[];
  daycare_credits: number;
  half_daycare_credits: number;
  boarding_credits: number;
}

const StaffClients = () => {
  const { isStaffOrAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditCreditsOpen, setIsEditCreditsOpen] = useState(false);
  const [editingCredits, setEditingCredits] = useState({ daycare: 0, halfDaycare: 0, boarding: 0 });
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  });

  const fetchClients = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          pets (id, name, breed, date_of_birth, vaccination_rabies, vaccination_bordetella, vaccination_distemper)
        `)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const clientsWithPetCount = data?.map((client: any) => ({
        ...client,
        pet_count: client.pets?.length || 0,
      })) || [];

      setClients(clientsWithPetCount);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [isStaffOrAdmin]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClient.first_name.trim() || !newClient.last_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First and last name are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .insert([{
          first_name: newClient.first_name,
          last_name: newClient.last_name,
          email: newClient.email || null,
          phone: newClient.phone || null,
          address: newClient.address || null,
          emergency_contact_name: newClient.emergency_contact_name || null,
          emergency_contact_phone: newClient.emergency_contact_phone || null,
          notes: newClient.notes || null,
        }]);

      if (error) throw error;

      toast({ title: 'Client added successfully!' });
      setIsAddDialogOpen(false);
      setNewClient({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
      });
      fetchClients();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: 'Error',
        description: 'Failed to add client',
        variant: 'destructive',
      });
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(searchLower) ||
      client.last_name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchTerm)
    );
  });

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage client profiles and information</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client's information below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newClient.first_name}
                      onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={newClient.last_name}
                      onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_name"
                      value={newClient.emergency_contact_name}
                      onChange={(e) => setNewClient({ ...newClient, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_phone"
                      type="tel"
                      value={newClient.emergency_contact_phone}
                      onChange={(e) => setNewClient({ ...newClient, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Client</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'No clients found matching your search' : 'No clients yet'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Pets</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedClient(client)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {client.first_name} {client.last_name}
                            </p>
                            {client.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {client.address.slice(0, 30)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.email && (
                            <p className="text-sm flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {client.email}
                            </p>
                          )}
                          {client.phone && (
                            <p className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {client.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dog className="h-4 w-4 text-muted-foreground" />
                          <span>{client.pet_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(client.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          View <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Client Detail Dialog */}
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {selectedClient && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </DialogTitle>
                      <DialogDescription>
                        Client since {format(new Date(selectedClient.created_at), 'MMMM yyyy')}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {selectedClient.email || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {selectedClient.phone || 'Not provided'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Address</p>
                            <p className="font-medium flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {selectedClient.address || 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> Emergency Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">
                              {selectedClient.emergency_contact_name || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">
                              {selectedClient.emergency_contact_phone || 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    {selectedClient.notes && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm font-medium">Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3">
                          <p className="text-sm">{selectedClient.notes}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Credits */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Service Credits
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg border bg-muted/30 text-center">
                            <p className="text-sm text-muted-foreground">Daycare Credits</p>
                            <p className="text-3xl font-bold text-primary">{selectedClient.daycare_credits}</p>
                          </div>
                          <div className="p-4 rounded-lg border bg-muted/30 text-center">
                            <p className="text-sm text-muted-foreground">Half Day Credits</p>
                            <p className="text-3xl font-bold text-primary">{selectedClient.half_daycare_credits}</p>
                          </div>
                          <div className="p-4 rounded-lg border bg-muted/30 text-center">
                            <p className="text-sm text-muted-foreground">Boarding Credits</p>
                            <p className="text-3xl font-bold text-primary">{selectedClient.boarding_credits}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full mt-4 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCredits({
                              daycare: selectedClient.daycare_credits,
                              halfDaycare: selectedClient.half_daycare_credits,
                              boarding: selectedClient.boarding_credits,
                            });
                            setIsEditCreditsOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Credits
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pets */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Dog className="h-4 w-4" /> Pets ({selectedClient.pet_count})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        {selectedClient.pets && selectedClient.pets.length > 0 ? (
                          <div className="space-y-3">
                            {selectedClient.pets.map((pet) => (
                              <div 
                                key={pet.id} 
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Dog className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{pet.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {pet.breed || 'Unknown breed'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Badge 
                                    variant={!pet.vaccination_rabies || new Date(pet.vaccination_rabies) < new Date() ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    R
                                  </Badge>
                                  <Badge 
                                    variant={!pet.vaccination_bordetella || new Date(pet.vaccination_bordetella) < new Date() ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    B
                                  </Badge>
                                  <Badge 
                                    variant={!pet.vaccination_distemper || new Date(pet.vaccination_distemper) < new Date() ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    D
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No pets registered
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Booking Permissions */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Settings2 className="h-4 w-4" /> Booking Permissions
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Toggle which services this client can book online
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-3">
                        <ClientServicePermissions clientId={selectedClient.id} />
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Credits Dialog */}
        <Dialog open={isEditCreditsOpen} onOpenChange={setIsEditCreditsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Credits</DialogTitle>
              <DialogDescription>
                Update credits for {selectedClient?.first_name} {selectedClient?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daycare_credits">Daycare Credits</Label>
                <Input
                  id="daycare_credits"
                  type="number"
                  min="0"
                  value={editingCredits.daycare}
                  onChange={(e) => setEditingCredits({ ...editingCredits, daycare: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="half_daycare_credits">Half Day Credits</Label>
                <Input
                  id="half_daycare_credits"
                  type="number"
                  min="0"
                  value={editingCredits.halfDaycare}
                  onChange={(e) => setEditingCredits({ ...editingCredits, halfDaycare: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boarding_credits">Boarding Credits (nights)</Label>
                <Input
                  id="boarding_credits"
                  type="number"
                  min="0"
                  value={editingCredits.boarding}
                  onChange={(e) => setEditingCredits({ ...editingCredits, boarding: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditCreditsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  if (!selectedClient) return;
                  try {
                    const { error } = await supabase
                      .from('clients')
                      .update({
                        daycare_credits: editingCredits.daycare,
                        half_daycare_credits: editingCredits.halfDaycare,
                        boarding_credits: editingCredits.boarding,
                      })
                      .eq('id', selectedClient.id);

                    if (error) throw error;

                    toast({ title: 'Credits updated successfully!' });
                    setIsEditCreditsOpen(false);
                    setSelectedClient({
                      ...selectedClient,
                      daycare_credits: editingCredits.daycare,
                      half_daycare_credits: editingCredits.halfDaycare,
                      boarding_credits: editingCredits.boarding,
                    });
                    fetchClients();
                  } catch (error) {
                    console.error('Error updating credits:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to update credits',
                      variant: 'destructive',
                    });
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StaffLayout>
  );
};

export default StaffClients;
