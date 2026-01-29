import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Check, 
  X, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePetActivityLog } from '@/hooks/usePetActivityLog';
import { format } from 'date-fns';

interface StaffVaccinationEditorProps {
  petId: string;
  petName: string;
  vaccinationType: 'rabies' | 'bordetella' | 'distemper';
  vaccinationDate: string | null;
  documentUrl: string | null;
  onUpdate: () => void;
}

const vaccinationLabels = {
  rabies: 'Rabies',
  bordetella: 'Bordetella',
  distemper: 'DHPP/Distemper',
};

export const StaffVaccinationEditor = ({
  petId,
  petName,
  vaccinationType,
  vaccinationDate,
  documentUrl,
  onUpdate,
}: StaffVaccinationEditorProps) => {
  const { toast } = useToast();
  const { logActivity } = usePetActivityLog();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState(vaccinationDate || '');

  const isExpired = !vaccinationDate || new Date(vaccinationDate) < new Date();
  const label = vaccinationLabels[vaccinationType];

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateField = `vaccination_${vaccinationType}`;
      const { error } = await supabase
        .from('pets')
        .update({ [updateField]: newDate || null })
        .eq('id', petId);

      if (error) throw error;

      // Log the activity
      await logActivity({
        petId,
        actionType: 'vaccination_updated',
        actionCategory: 'vaccination',
        description: `Updated ${label} vaccination date for ${petName}`,
        details: {
          vaccination_type: vaccinationType,
          old_date: vaccinationDate,
          new_date: newDate || null,
        },
      });

      toast({
        title: 'Vaccination Updated',
        description: `${label} expiration date has been updated`,
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating vaccination:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update vaccination date. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNewDate(vaccinationDate || '');
    setIsEditing(false);
  };

  const openDocument = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        {documentUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openDocument}
            className="h-6 px-2 text-xs gap-1"
          >
            <FileText className="h-3 w-3" />
            View Doc
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={saving}
            className="h-8 w-8 p-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge 
            variant={isExpired ? 'destructive' : 'secondary'}
            className="cursor-pointer"
            onClick={() => {
              setNewDate(vaccinationDate || '');
              setIsEditing(true);
            }}
          >
            {vaccinationDate 
              ? format(new Date(vaccinationDate), 'MMM d, yyyy')
              : 'Not on file'}
          </Badge>
          {isExpired && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          {!isExpired && vaccinationDate && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewDate(vaccinationDate || '');
              setIsEditing(true);
            }}
            className="h-6 w-6 p-0 ml-auto"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
