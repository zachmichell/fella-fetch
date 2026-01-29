import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Pencil,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VaccinationUploadProps {
  petId: string;
  vaccinationType: 'rabies' | 'bordetella' | 'distemper';
  vaccinationDate: string | null;
  documentUrl: string | null;
  onUploadComplete: () => void;
}

const vaccinationLabels = {
  rabies: 'Rabies',
  bordetella: 'Bordetella',
  distemper: 'DHPP/Distemper',
};

export const VaccinationUpload = ({
  petId,
  vaccinationType,
  vaccinationDate,
  documentUrl,
  onUploadComplete,
}: VaccinationUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isExpired = !vaccinationDate || new Date(vaccinationDate) < new Date();
  const label = vaccinationLabels[vaccinationType];

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (JPG, PNG, WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vaccinationType}_${Date.now()}.${fileExt}`;
      const filePath = `${petId}/${fileName}`;

      // Delete old file if exists
      if (documentUrl) {
        const oldPath = documentUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('pet-vaccinations').remove([oldPath]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('pet-vaccinations')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL for the uploaded file
      const { data: urlData } = await supabase.storage
        .from('pet-vaccinations')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (!urlData?.signedUrl) throw new Error('Failed to get file URL');

      // Update pet record with document URL
      const updateField = `vaccination_${vaccinationType}_doc_url`;
      const { error: updateError } = await supabase
        .from('pets')
        .update({ [updateField]: urlData.signedUrl })
        .eq('id', petId);

      if (updateError) throw updateError;

      toast({
        title: 'Document Uploaded',
        description: `${label} vaccination record uploaded successfully`,
      });

      onUploadComplete();
      setIsEditing(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!documentUrl) return;

    setDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = documentUrl.split('/pet-vaccinations/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage.from('pet-vaccinations').remove([filePath]);
      }

      // Clear document URL in database
      const updateField = `vaccination_${vaccinationType}_doc_url`;
      const { error } = await supabase
        .from('pets')
        .update({ [updateField]: null })
        .eq('id', petId);

      if (error) throw error;

      toast({
        title: 'Document Removed',
        description: `${label} vaccination record removed`,
      });

      onUploadComplete();
      setIsEditing(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to remove document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDocument = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const formatExpirationDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Label className="font-medium">{label}</Label>
          <Badge
            variant="outline"
            className={isExpired
              ? 'border-destructive text-destructive'
              : 'border-green-500 text-green-600'}
          >
            {isExpired ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                {vaccinationDate ? 'Expired' : 'Not on file'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Valid
              </>
            )}
          </Badge>
        </div>
        
        {/* Edit toggle button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(!isEditing)}
          className="h-7 w-7 p-0"
        >
          {isEditing ? (
            <X className="h-4 w-4" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expiration Date Display */}
      <div className="mb-3 text-sm">
        {vaccinationDate ? (
          <p className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
            <span className="font-medium">
              {isExpired ? 'Expired on: ' : 'Expires: '}
            </span>
            {formatExpirationDate(vaccinationDate)}
          </p>
        ) : (
          <p className="text-muted-foreground italic">
            No expiration date on file — staff will update after reviewing your document.
          </p>
        )}
      </div>

      {/* Document status and actions */}
      <div className="flex items-center gap-2">
        {documentUrl ? (
          <>
            {/* Clickable document link - always visible */}
            <Button
              size="sm"
              variant="outline"
              onClick={openDocument}
              className="gap-1 flex-1"
            >
              <FileText className="h-4 w-4" />
              View Document
            </Button>
            
            {/* Delete button - only in edit mode */}
            {isEditing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Upload prompt - only in edit mode */}
            {isEditing ? (
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                  id={`upload-${petId}-${vaccinationType}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-1 w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Record
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No document uploaded — tap edit to add one.
              </p>
            )}
          </>
        )}
      </div>
      
      {isEditing && (
        <p className="text-xs text-muted-foreground mt-2">
          PDF or image files up to 5MB
        </p>
      )}
    </div>
  );
};
