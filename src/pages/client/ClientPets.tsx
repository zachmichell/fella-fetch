import { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { Dog, Syringe, AlertCircle, Plus, Pencil, Loader2, FileText } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { useToast } from '@/hooks/use-toast';
import { VaccinationUpload } from '@/components/client/VaccinationUpload';

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
  vaccination_rabies_doc_url?: string | null;
  vaccination_bordetella_doc_url?: string | null;
  vaccination_distemper_doc_url?: string | null;
  photo_url: string | null;
}

const ClientPets = () => {
  const { clientData, pets, fetchClientData } = useClientAuth();
  const { toast } = useToast();
  
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [addingPet, setAddingPet] = useState(false);
  const [editPetOpen, setEditPetOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  
  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    date_of_birth: '',
    gender: '',
    weight: '',
    color: '',
  });
  
  const [petForm, setPetForm] = useState({
    name: '',
    breed: '',
    date_of_birth: '',
    gender: '',
    weight: '',
    color: '',
  });

  const isVaccinationExpired = (date: string | null) => {
    if (!date) return true;
    return new Date(date) < new Date();
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

  return (
    <ClientPortalLayout title="Your Pets" description="Manage your pet profiles">
      <div className="max-w-2xl">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dog className="h-5 w-5" />
                Pets ({pets?.length || 0})
              </CardTitle>
              <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
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
            {pets && pets.length > 0 ? (
              <div className="space-y-4">
                {pets.map((pet) => (
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
                      <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                        <Syringe className="h-3 w-3" />
                        Vaccination Records
                      </p>
                      <div className="grid gap-3">
                        <VaccinationUpload
                          petId={pet.id}
                          vaccinationType="rabies"
                          vaccinationDate={pet.vaccination_rabies}
                          documentUrl={pet.vaccination_rabies_doc_url || null}
                          onUploadComplete={fetchClientData}
                        />
                        <VaccinationUpload
                          petId={pet.id}
                          vaccinationType="bordetella"
                          vaccinationDate={pet.vaccination_bordetella}
                          documentUrl={pet.vaccination_bordetella_doc_url || null}
                          onUploadComplete={fetchClientData}
                        />
                        <VaccinationUpload
                          petId={pet.id}
                          vaccinationType="distemper"
                          vaccinationDate={pet.vaccination_distemper}
                          documentUrl={pet.vaccination_distemper_doc_url || null}
                          onUploadComplete={fetchClientData}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
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
    </ClientPortalLayout>
  );
};

export default ClientPets;
