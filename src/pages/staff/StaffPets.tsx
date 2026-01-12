import { useEffect, useState, useMemo } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { 
  Plus,
  Search,
  Dog,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Weight,
  Syringe,
  AlertCircle,
  User,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  color: string | null;
  gender: string | null;
  weight: number | null;
  date_of_birth: string | null;
  spayed_neutered: boolean | null;
  vaccination_rabies: string | null;
  vaccination_bordetella: string | null;
  vaccination_distemper: string | null;
  behavior_notes: string | null;
  feeding_instructions: string | null;
  special_needs: string | null;
  photo_url: string | null;
  is_active: boolean | null;
  created_at: string;
  client_id: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface ActivityLog {
  id: string;
  action_type: string;
  action_category: string;
  description: string;
  created_at: string;
  performed_by: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

const StaffPets = () => {
  const { isStaffOrAdmin } = useAuth();
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petActivityLogs, setPetActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    color: '',
    gender: '',
    weight: '',
    date_of_birth: '',
    spayed_neutered: false,
    vaccination_rabies: '',
    vaccination_bordetella: '',
    vaccination_distemper: '',
    behavior_notes: '',
    feeding_instructions: '',
    special_needs: '',
    client_id: '',
  });

  const fetchPets = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          client:clients (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchPetActivityLogs = async (petId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('pet_activity_logs')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPetActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchPets();
    fetchClients();
  }, [isStaffOrAdmin]);

  useEffect(() => {
    if (selectedPet) {
      fetchPetActivityLogs(selectedPet.id);
    }
  }, [selectedPet]);

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPet.name.trim() || !newPet.client_id) {
      toast({
        title: 'Validation Error',
        description: 'Pet name and owner are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pets')
        .insert([{
          name: newPet.name,
          breed: newPet.breed || null,
          color: newPet.color || null,
          gender: newPet.gender || null,
          weight: newPet.weight ? parseFloat(newPet.weight) : null,
          date_of_birth: newPet.date_of_birth || null,
          spayed_neutered: newPet.spayed_neutered,
          vaccination_rabies: newPet.vaccination_rabies || null,
          vaccination_bordetella: newPet.vaccination_bordetella || null,
          vaccination_distemper: newPet.vaccination_distemper || null,
          behavior_notes: newPet.behavior_notes || null,
          feeding_instructions: newPet.feeding_instructions || null,
          special_needs: newPet.special_needs || null,
          client_id: newPet.client_id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Log the activity
      await logActivity({
        petId: data.id,
        actionType: 'profile_updated',
        actionCategory: 'profile',
        description: `Pet profile created for ${newPet.name}`,
        details: { pet_name: newPet.name, breed: newPet.breed },
      });

      toast({ title: 'Pet added successfully!' });
      setIsAddDialogOpen(false);
      setNewPet({
        name: '',
        breed: '',
        color: '',
        gender: '',
        weight: '',
        date_of_birth: '',
        spayed_neutered: false,
        vaccination_rabies: '',
        vaccination_bordetella: '',
        vaccination_distemper: '',
        behavior_notes: '',
        feeding_instructions: '',
        special_needs: '',
        client_id: '',
      });
      fetchPets();
    } catch (error) {
      console.error('Error adding pet:', error);
      toast({
        title: 'Error',
        description: 'Failed to add pet',
        variant: 'destructive',
      });
    }
  };

  const handleViewPet = (pet: Pet) => {
    setSelectedPet(pet);
    // Log that someone viewed the pet profile
    logActivity({
      petId: pet.id,
      actionType: 'profile_viewed',
      actionCategory: 'profile',
      description: `Viewed ${pet.name}'s profile`,
    });
  };

  const getAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return 'Unknown';
    const dob = new Date(dateOfBirth);
    const years = differenceInYears(new Date(), dob);
    const months = differenceInMonths(new Date(), dob) % 12;
    if (years === 0) return `${months} months`;
    if (months === 0) return `${years} years`;
    return `${years}y ${months}m`;
  };

  const isVaccinationExpired = (date: string | null) => {
    if (!date) return true;
    return new Date(date) < new Date();
  };

  const filteredPets = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return pets.filter(pet => 
      pet.name.toLowerCase().includes(searchLower) ||
      pet.breed?.toLowerCase().includes(searchLower) ||
      pet.client?.first_name?.toLowerCase().includes(searchLower) ||
      pet.client?.last_name?.toLowerCase().includes(searchLower)
    );
  }, [pets, searchTerm]);

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pets</h1>
            <p className="text-muted-foreground">Manage pet profiles, vaccinations, and care notes</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Pet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Pet</DialogTitle>
                <DialogDescription>
                  Enter the pet's information below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Owner *</Label>
                  <Select
                    value={newPet.client_id}
                    onValueChange={(value) => setNewPet({ ...newPet, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Pet Name *</Label>
                    <Input
                      id="name"
                      value={newPet.name}
                      onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Breed</Label>
                    <Input
                      id="breed"
                      value={newPet.breed}
                      onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={newPet.color}
                      onChange={(e) => setNewPet({ ...newPet, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={newPet.gender}
                      onValueChange={(value) => setNewPet({ ...newPet, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={newPet.weight}
                      onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={newPet.date_of_birth}
                      onChange={(e) => setNewPet({ ...newPet, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spayed/Neutered</Label>
                    <Select
                      value={newPet.spayed_neutered ? 'yes' : 'no'}
                      onValueChange={(value) => setNewPet({ ...newPet, spayed_neutered: value === 'yes' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Vaccination Expiry Dates</p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rabies">Rabies</Label>
                    <Input
                      id="rabies"
                      type="date"
                      value={newPet.vaccination_rabies}
                      onChange={(e) => setNewPet({ ...newPet, vaccination_rabies: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bordetella">Bordetella</Label>
                    <Input
                      id="bordetella"
                      type="date"
                      value={newPet.vaccination_bordetella}
                      onChange={(e) => setNewPet({ ...newPet, vaccination_bordetella: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distemper">Distemper</Label>
                    <Input
                      id="distemper"
                      type="date"
                      value={newPet.vaccination_distemper}
                      onChange={(e) => setNewPet({ ...newPet, vaccination_distemper: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Care Notes</p>

                <div className="space-y-2">
                  <Label htmlFor="behavior">Behavior Notes</Label>
                  <Textarea
                    id="behavior"
                    value={newPet.behavior_notes}
                    onChange={(e) => setNewPet({ ...newPet, behavior_notes: e.target.value })}
                    rows={2}
                    placeholder="How does the pet behave around other dogs, people, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeding">Feeding Instructions</Label>
                  <Textarea
                    id="feeding"
                    value={newPet.feeding_instructions}
                    onChange={(e) => setNewPet({ ...newPet, feeding_instructions: e.target.value })}
                    rows={2}
                    placeholder="Feeding schedule, food type, portions, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special">Special Needs</Label>
                  <Textarea
                    id="special"
                    value={newPet.special_needs}
                    onChange={(e) => setNewPet({ ...newPet, special_needs: e.target.value })}
                    rows={2}
                    placeholder="Medications, allergies, mobility issues, etc."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Pet</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pets or owners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pets Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'No pets found matching your search' : 'No pets yet'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Vaccinations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPets.map((pet) => (
                    <TableRow 
                      key={pet.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewPet(pet)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Dog className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{pet.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {pet.breed || 'Unknown breed'} • {pet.gender || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pet.client ? (
                          <div>
                            <p className="font-medium">
                              {pet.client.first_name} {pet.client.last_name}
                            </p>
                            {pet.client.phone && (
                              <p className="text-sm text-muted-foreground">{pet.client.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No owner</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{getAge(pet.date_of_birth)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge 
                            variant={isVaccinationExpired(pet.vaccination_rabies) ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            R
                          </Badge>
                          <Badge 
                            variant={isVaccinationExpired(pet.vaccination_bordetella) ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            B
                          </Badge>
                          <Badge 
                            variant={isVaccinationExpired(pet.vaccination_distemper) ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            D
                          </Badge>
                        </div>
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

        {/* Pet Detail Dialog */}
        <Dialog open={!!selectedPet} onOpenChange={(open) => !open && setSelectedPet(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedPet && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dog className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">{selectedPet.name}</DialogTitle>
                      <DialogDescription>
                        {selectedPet.breed || 'Unknown breed'} • {selectedPet.gender || 'Unknown'} • {getAge(selectedPet.date_of_birth)}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6">
                    {/* Owner Info */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" /> Owner Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        {selectedPet.client ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Name</p>
                              <p className="font-medium">{selectedPet.client.first_name} {selectedPet.client.last_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Contact</p>
                              <div className="space-y-1">
                                {selectedPet.client.phone && (
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {selectedPet.client.phone}
                                  </p>
                                )}
                                {selectedPet.client.email && (
                                  <p className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {selectedPet.client.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No owner information</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pet Details */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Dog className="h-4 w-4" /> Pet Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Weight</p>
                            <p className="font-medium flex items-center gap-1">
                              <Weight className="h-4 w-4" />
                              {selectedPet.weight ? `${selectedPet.weight} lbs` : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Color</p>
                            <p className="font-medium">{selectedPet.color || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Spayed/Neutered</p>
                            <p className="font-medium">{selectedPet.spayed_neutered ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vaccinations */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Syringe className="h-4 w-4" /> Vaccinations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Rabies</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={isVaccinationExpired(selectedPet.vaccination_rabies) ? 'destructive' : 'secondary'}>
                                {selectedPet.vaccination_rabies 
                                  ? format(new Date(selectedPet.vaccination_rabies), 'MMM d, yyyy')
                                  : 'Not on file'}
                              </Badge>
                              {isVaccinationExpired(selectedPet.vaccination_rabies) && (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Bordetella</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={isVaccinationExpired(selectedPet.vaccination_bordetella) ? 'destructive' : 'secondary'}>
                                {selectedPet.vaccination_bordetella 
                                  ? format(new Date(selectedPet.vaccination_bordetella), 'MMM d, yyyy')
                                  : 'Not on file'}
                              </Badge>
                              {isVaccinationExpired(selectedPet.vaccination_bordetella) && (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Distemper</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={isVaccinationExpired(selectedPet.vaccination_distemper) ? 'destructive' : 'secondary'}>
                                {selectedPet.vaccination_distemper 
                                  ? format(new Date(selectedPet.vaccination_distemper), 'MMM d, yyyy')
                                  : 'Not on file'}
                              </Badge>
                              {isVaccinationExpired(selectedPet.vaccination_distemper) && (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Care Notes */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Care Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="py-3 space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Behavior Notes</p>
                          <p className="text-sm">{selectedPet.behavior_notes || 'None'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Feeding Instructions</p>
                          <p className="text-sm">{selectedPet.feeding_instructions || 'None'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Special Needs</p>
                          <p className="text-sm">{selectedPet.special_needs || 'None'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Activity Log */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Activity Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        {loadingLogs ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : petActivityLogs.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {petActivityLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                                <div className="flex-1">
                                  <p className="font-medium">{log.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')} • {log.action_category}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StaffLayout>
  );
};

export default StaffPets;
