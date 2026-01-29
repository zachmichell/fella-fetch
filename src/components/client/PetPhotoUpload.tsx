import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dog, Camera, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PetPhotoUploadProps {
  petId: string;
  petName: string;
  photoUrl: string | null;
  onUploadComplete: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const PetPhotoUpload = ({
  petId,
  petName,
  photoUrl,
  onUploadComplete,
  size = 'md',
}: PetPhotoUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-20 w-20',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, WebP, or GIF)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `photo_${Date.now()}.${fileExt}`;
      const filePath = `${petId}/${fileName}`;

      // Delete old photo if exists
      if (photoUrl) {
        const oldPath = extractFilePath(photoUrl);
        if (oldPath) {
          await supabase.storage.from('pet-photos').remove([oldPath]);
        }
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error('Failed to get file URL');

      // Update pet record with photo URL
      const { error: updateError } = await supabase
        .from('pets')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', petId);

      if (updateError) throw updateError;

      toast({
        title: 'Photo Uploaded',
        description: `${petName}'s photo has been updated`,
      });

      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setShowActions(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!photoUrl) return;

    setDeleting(true);
    try {
      // Extract file path from URL
      const filePath = extractFilePath(photoUrl);
      if (filePath) {
        await supabase.storage.from('pet-photos').remove([filePath]);
      }

      // Clear photo URL in database
      const { error } = await supabase
        .from('pets')
        .update({ photo_url: null })
        .eq('id', petId);

      if (error) throw error;

      toast({
        title: 'Photo Removed',
        description: `${petName}'s photo has been removed`,
      });

      onUploadComplete();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to remove photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowActions(false);
    }
  };

  const extractFilePath = (url: string): string | null => {
    try {
      const urlParts = url.split('/pet-photos/');
      if (urlParts.length > 1) {
        return urlParts[1].split('?')[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleUpload}
        disabled={uploading || deleting}
        className="hidden"
        id={`pet-photo-${petId}`}
      />

      <Avatar className={`${sizeClasses[size]} cursor-pointer`}>
        <AvatarImage 
          src={photoUrl || undefined} 
          alt={petName}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10">
          <Dog className={`${iconSizes[size]} text-primary`} />
        </AvatarFallback>
      </Avatar>

      {/* Upload/Delete overlay */}
      {(showActions || uploading || deleting) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          {uploading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : deleting ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3 w-3" />
              </Button>
              {photoUrl && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
