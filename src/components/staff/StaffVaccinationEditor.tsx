import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Pencil, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload
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
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState(vaccinationDate || '');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExpired = !vaccinationDate || new Date(vaccinationDate) < new Date();
  const label = vaccinationLabels[vaccinationType];

  const handleOpen = () => {
    setNewDate(vaccinationDate || '');
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {};
      const updateField = `vaccination_${vaccinationType}`;
      updateData[updateField] = newDate || null;

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${petId}/${vaccinationType}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('pet-vaccinations')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pet-vaccinations')
          .getPublicUrl(filePath);

        updateData[`vaccination_${vaccinationType}_doc_url`] = urlData.publicUrl;
        setUploading(false);
      }

      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', petId);

      if (error) throw error;

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

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating vaccination:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update vaccination. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const openDocument = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  return (
    <>
      <div className="space-y-2 min-w-0">
        <Label className="text-xs text-muted-foreground truncate block">{label}</Label>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge 
            variant={isExpired ? 'destructive' : 'secondary'}
            className="cursor-pointer text-xs"
            onClick={handleOpen}
          >
            {vaccinationDate 
              ? format(new Date(vaccinationDate), 'MMM d, yyyy')
              : 'Not on file'}
          </Badge>
          {isExpired ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          ) : vaccinationDate ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpen}
            className="h-6 w-6 p-0"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        {documentUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openDocument}
            className="h-5 px-1.5 text-[10px] gap-1"
          >
            <FileText className="h-3 w-3" />
            View Doc
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {label} Vaccination</DialogTitle>
            <DialogDescription>
              Update the expiration date and upload documentation for {petName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Document</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Choose file...'}
              </Button>
              {documentUrl && !selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Current document on file. Upload a new one to replace it.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {uploading ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
