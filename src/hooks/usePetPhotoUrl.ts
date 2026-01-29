import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-fetching
const urlCache = new Map<string, { url: string; expires: number }>();

export const usePetPhotoUrl = (photoUrl: string | null, petId: string) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      // Check cache first
      const cached = urlCache.get(photoUrl);
      if (cached && cached.expires > Date.now()) {
        setSignedUrl(cached.url);
        return;
      }

      setLoading(true);
      try {
        // Extract file path from the URL
        const filePath = extractFilePath(photoUrl, petId);
        if (!filePath) {
          setSignedUrl(null);
          return;
        }

        const { data, error } = await supabase.storage
          .from('pet-photos')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          setSignedUrl(null);
          return;
        }

        // Cache the URL (expires 5 minutes before actual expiry for safety margin)
        urlCache.set(photoUrl, {
          url: data.signedUrl,
          expires: Date.now() + (55 * 60 * 1000), // 55 minutes
        });

        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [photoUrl, petId]);

  return { signedUrl, loading };
};

const extractFilePath = (url: string, petId: string): string | null => {
  try {
    // Handle both full URLs and relative paths
    const urlParts = url.split('/pet-photos/');
    if (urlParts.length > 1) {
      return urlParts[1].split('?')[0];
    }
    // If it's just a filename, construct the path
    if (!url.includes('/')) {
      return `${petId}/${url}`;
    }
    return null;
  } catch {
    return null;
  }
};

// Utility function to clear cache for a specific pet photo
export const clearPhotoCache = (photoUrl: string) => {
  urlCache.delete(photoUrl);
};
