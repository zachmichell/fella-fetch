import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useShopifyCustomer } from '@/contexts/ShopifyCustomerContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dog,
  Calendar,
  Clock,
  Loader2,
  LogOut,
  User,
  Phone,
  Mail,
  MapPin,
  Syringe,
  AlertCircle,
  ChevronRight,
  CalendarDays,
  History,
  Plus,
  Pencil,
} from 'lucide-react';
import AIAssistantChat from '@/components/client/AIAssistantChat';
import OrderHistory from '@/components/client/OrderHistory';
import { format, isPast, isFuture, isToday, parseISO } from 'date-fns';
import Header from '@/components/layout/Header';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  gender?: string | null;
  weight?: number | null;
  color?: string | null;
  vaccination_rabies: string | null;
  vaccination_bordetella: string | null;
  vaccination_distemper: string | null;
  photo_url: string | null;
}

interface Reservation {
  id: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  service_type: string;
  status: string;
  pet: {
    id: string;
    name: string;
  };
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  thread_id: string | null;
  pets: Pet[];
}

const ClientPortal = () => {
  const navigate = useNavigate();
  const { customer, logout: shopifyLogout, loading: shopifyLoading, isAuthenticated } = useShopifyCustomer();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [noClientRecord, setNoClientRecord] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [addingPet, setAddingPet] = useState(false);
  const [editPetOpen, setEditPetOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petForm, setPetForm] = useState({
    name: '',
    breed: '',
    date_of_birth: '',
    gender: '',
    weight: '',
    color: '',
  });
  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    date_of_birth: '',
    gender: '',
    weight: '',
    color: '',
  });

  useEffect(() => {
    if (!shopifyLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, shopifyLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && customer?.email) {
      fetchClientData();
    }
  }, [isAuthenticated, customer?.email]);

  const fetchClientData = async () => {
    if (!customer?.email) {
      setLoading(false);
      return;
    }

    try {
      // Fetch client record linked to this email
      const { data: clientRecord, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          thread_id,
          pets (
            id,
            name,
            breed,
            date_of_birth,
            gender,
            weight,
            color,
            vaccination_rabies,
            vaccination_bordetella,
            vaccination_distemper,
            photo_url
          )
        `)
        .eq('email', customer.email)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientRecord) {
        setNoClientRecord(true);
        setLoading(false);
        return;
      }

      setClientData(clientRecord);

      // Fetch reservations for all pets
      if (clientRecord.pets && clientRecord.pets.length > 0) {
        const petIds = clientRecord.pets.map((p: Pet) => p.id);
        const { data: reservationsData, error: resError } = await supabase
          .from('reservations')
          .select(`
            id,
            start_date,
            end_date,
            start_time,
            end_time,
            service_type,
            status,
            pet:pets (
              id,
              name
            )
          `)
          .in('pet_id', petIds)
          .order('start_date', { ascending: false });

        if (resError) throw resError;
        setReservations(reservationsData || []);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await shopifyLogout();
    navigate('/');
  };

  const handleAddPet = async () => {
    if (!clientData || !newPet.name.trim()) {
      toast({
        title: 'Error',
        description: 'Pet name is required',
        variant: 'destructive',
      });
      return;
    }

    setAddingPet(true);
    try {
      const { error } = await supabase.from('pets').insert({
        client_id: clientData.id,
        name: newPet.name.trim(),
        breed: newPet.breed || null,
        date_of_birth: newPet.date_of_birth || null,
        gender: newPet.gender || null,
        weight: newPet.weight ? parseFloat(newPet.weight) : null,
        color: newPet.color || null,
      });

      if (error) throw error;

      toast({
        title: 'Pet Added',
        description: `${newPet.name} has been added to your profile`,
      });

      setNewPet({ name: '', breed: '', date_of_birth: '', gender: '', weight: '', color: '' });
      setAddPetOpen(false);
      fetchClientData();
    } catch (error) {
      console.error('Error adding pet:', error);
      toast({
        title: 'Error',
        description: 'Failed to add pet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAddingPet(false);
    }
  };

  const openEditPet = (pet: Pet) => {
    setSelectedPet(pet);
    setPetForm({
      name: pet.name || '',
      breed: pet.breed || '',
      date_of_birth: pet.date_of_birth || '',
      gender: pet.gender || '',
      weight: pet.weight?.toString() || '',
      color: pet.color || '',
    });
    setEditPetOpen(true);
  };

  const handleEditPet = async () => {
    if (!selectedPet || !petForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Pet name is required',
        variant: 'destructive',
      });
      return;
    }

    setEditingPet(true);
    try {
      const { error } = await supabase
        .from('pets')
        .update({
          name: petForm.name.trim(),
          breed: petForm.breed.trim() || null,
          date_of_birth: petForm.date_of_birth || null,
          gender: petForm.gender || null,
          weight: petForm.weight ? parseFloat(petForm.weight) : null,
          color: petForm.color.trim() || null,
        })
        .eq('id', selectedPet.id);

      if (error) throw error;

      toast({
        title: 'Pet Updated',
        description: `${petForm.name}'s profile has been updated`,
      });

      setEditPetOpen(false);
      setSelectedPet(null);
      fetchClientData();
    } catch (error) {
      console.error('Error updating pet:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setEditingPet(false);
    }
  };

  const isVaccinationExpired = (date: string | null) => {
    if (!date) return true;
    return new Date(date) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'checked_in':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'checked_out':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const upcomingReservations = reservations.filter(r => 
    isFuture(parseISO(r.start_date)) || isToday(parseISO(r.start_date))
  ).filter(r => r.status !== 'cancelled' && r.status !== 'checked_out');

  const pastReservations = reservations.filter(r => 
    isPast(parseISO(r.start_date)) && !isToday(parseISO(r.start_date))
  ).slice(0, 10);

  if (shopifyLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (noClientRecord) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-12">
          <div className="container-app">
            <Card className="max-w-lg mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>No Client Profile Found</CardTitle>
                <CardDescription>
                  Your Shopify account isn't linked to a client profile yet. Please contact us to set up your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/contact">
                  <Button className="w-full">Contact Us</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Use Shopify customer data if no client data, otherwise merge them
  const displayName = clientData?.first_name || customer?.firstName || 'Customer';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-12">
        <div className="container-app">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Welcome, {displayName}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your pets and view your purchase history
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/book">
                  <Button className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Profile & Pets */}
              <div className="lg:col-span-1 space-y-6">
                {/* Profile Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Your Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {customer?.firstName} {customer?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer?.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer?.phone || clientData?.phone || 'No phone'}</span>
                    </div>
                    {customer?.defaultAddress && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>
                          {[
                            customer.defaultAddress.address1,
                            customer.defaultAddress.city,
                            customer.defaultAddress.province,
                            customer.defaultAddress.zip,
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pets Card - Only show if client data exists */}
                {clientData && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Dog className="h-5 w-5" />
                          Your Pets ({clientData?.pets?.length || 0})
                        </CardTitle>
                        <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Plus className="h-4 w-4" />
                              Add Pet
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Add a New Pet</DialogTitle>
                              <DialogDescription>
                                Enter your pet's information below.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="pet-name">Name *</Label>
                                <Input
                                  id="pet-name"
                                  value={newPet.name}
                                  onChange={(e) => setNewPet(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Enter pet's name"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="pet-breed">Breed</Label>
                                  <Input
                                    id="pet-breed"
                                    value={newPet.breed}
                                    onChange={(e) => setNewPet(prev => ({ ...prev, breed: e.target.value }))}
                                    placeholder="e.g., Golden Retriever"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="pet-color">Color</Label>
                                  <Input
                                    id="pet-color"
                                    value={newPet.color}
                                    onChange={(e) => setNewPet(prev => ({ ...prev, color: e.target.value }))}
                                    placeholder="e.g., Golden"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="pet-gender">Gender</Label>
                                  <Select
                                    value={newPet.gender}
                                    onValueChange={(value) => setNewPet(prev => ({ ...prev, gender: value }))}
                                  >
                                    <SelectTrigger id="pet-gender">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Male">Male</SelectItem>
                                      <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="pet-weight">Weight (lbs)</Label>
                                  <Input
                                    id="pet-weight"
                                    type="number"
                                    value={newPet.weight}
                                    onChange={(e) => setNewPet(prev => ({ ...prev, weight: e.target.value }))}
                                    placeholder="e.g., 50"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="pet-dob">Date of Birth</Label>
                                <Input
                                  id="pet-dob"
                                  type="date"
                                  value={newPet.date_of_birth}
                                  onChange={(e) => setNewPet(prev => ({ ...prev, date_of_birth: e.target.value }))}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setAddPetOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleAddPet} disabled={addingPet}>
                                {addingPet && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Add Pet
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {clientData?.pets && clientData.pets.length > 0 ? (
                        <div className="space-y-4">
                          {clientData.pets.map((pet) => (
                            <div
                              key={pet.id}
                              className="p-4 rounded-lg border bg-muted/30"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Dog className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{pet.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {pet.breed || 'Unknown breed'}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => openEditPet(pet)}
                                  className="gap-1"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <Separator className="my-3" />
                              
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                  <Syringe className="h-3 w-3" />
                                  Vaccinations
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge 
                                    variant="outline"
                                    className={isVaccinationExpired(pet.vaccination_rabies) 
                                      ? 'border-destructive text-destructive' 
                                      : 'border-green-500 text-green-600'}
                                  >
                                    Rabies {isVaccinationExpired(pet.vaccination_rabies) && (
                                      <AlertCircle className="h-3 w-3 ml-1" />
                                    )}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={isVaccinationExpired(pet.vaccination_bordetella) 
                                      ? 'border-destructive text-destructive' 
                                      : 'border-green-500 text-green-600'}
                                  >
                                    Bordetella {isVaccinationExpired(pet.vaccination_bordetella) && (
                                      <AlertCircle className="h-3 w-3 ml-1" />
                                    )}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={isVaccinationExpired(pet.vaccination_distemper) 
                                      ? 'border-destructive text-destructive' 
                                      : 'border-green-500 text-green-600'}
                                  >
                                    DHPP {isVaccinationExpired(pet.vaccination_distemper) && (
                                      <AlertCircle className="h-3 w-3 ml-1" />
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Dog className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No pets registered yet</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 gap-1"
                            onClick={() => setAddPetOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                            Add Your First Pet
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Edit Pet Dialog */}
                <Dialog open={editPetOpen} onOpenChange={setEditPetOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Pet</DialogTitle>
                      <DialogDescription>
                        Update {selectedPet?.name}'s information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-pet-name">Name *</Label>
                        <Input
                          id="edit-pet-name"
                          value={petForm.name}
                          onChange={(e) => setPetForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-pet-breed">Breed</Label>
                          <Input
                            id="edit-pet-breed"
                            value={petForm.breed}
                            onChange={(e) => setPetForm(prev => ({ ...prev, breed: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-pet-color">Color</Label>
                          <Input
                            id="edit-pet-color"
                            value={petForm.color}
                            onChange={(e) => setPetForm(prev => ({ ...prev, color: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-pet-gender">Gender</Label>
                          <Select
                            value={petForm.gender}
                            onValueChange={(value) => setPetForm(prev => ({ ...prev, gender: value }))}
                          >
                            <SelectTrigger id="edit-pet-gender">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-pet-weight">Weight (lbs)</Label>
                          <Input
                            id="edit-pet-weight"
                            type="number"
                            value={petForm.weight}
                            onChange={(e) => setPetForm(prev => ({ ...prev, weight: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-pet-dob">Date of Birth</Label>
                        <Input
                          id="edit-pet-dob"
                          type="date"
                          value={petForm.date_of_birth}
                          onChange={(e) => setPetForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditPetOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleEditPet} disabled={editingPet}>
                        {editingPet && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Middle Column - Purchase History */}
              <div className="lg:col-span-1 space-y-6">
                <OrderHistory />
              </div>

              {/* Right Column - Appointments */}
              <div className="lg:col-span-1 space-y-6">
                {/* Upcoming Appointments */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Upcoming Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingReservations.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingReservations.map((reservation) => (
                          <div
                            key={reservation.id}
                            className="p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{reservation.pet.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {reservation.service_type}
                                </p>
                              </div>
                              <Badge variant="outline" className={getStatusColor(reservation.status)}>
                                {reservation.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(reservation.start_date), 'MMM d, yyyy')}
                              </div>
                              {reservation.start_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(`2000-01-01T${reservation.start_time}`), 'h:mm a')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No upcoming appointments</p>
                        <Link to="/book">
                          <Button variant="outline" size="sm" className="mt-3 gap-1">
                            <Plus className="h-4 w-4" />
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Past Appointments */}
                {pastReservations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Past Appointments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pastReservations.slice(0, 5).map((reservation) => (
                          <div
                            key={reservation.id}
                            className="p-2 rounded-lg flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{reservation.pet.name}</span>
                              <span className="text-muted-foreground capitalize">
                                {reservation.service_type}
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              {format(parseISO(reservation.start_date), 'MMM d')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* AI Assistant */}
            {clientData && (
              <AIAssistantChat
                clientId={clientData.id}
                clientName={`${clientData.first_name} ${clientData.last_name}`}
                threadId={clientData.thread_id}
                onThreadIdUpdate={() => fetchClientData()}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ClientPortal;
