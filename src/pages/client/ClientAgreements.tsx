import { useEffect, useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, ExternalLink } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Agreement {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  signed_at: string | null;
}

const ClientAgreements = () => {
  const { clientData } = useClientAuth();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientData?.id) {
      fetchAgreements();
    }
  }, [clientData?.id]);

  const fetchAgreements = async () => {
    if (!clientData?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_agreements')
        .select('*')
        .eq('client_id', clientData.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (agreement: Agreement) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-agreements')
        .download(agreement.file_url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = agreement.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleView = async (agreement: Agreement) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-agreements')
        .createSignedUrl(agreement.file_url, 3600); // 1 hour expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
    }
  };

  return (
    <ClientPortalLayout title="Agreements" description="View your signed documents and agreements">
      <div className="max-w-3xl">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agreements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Agreements Yet</h3>
              <p className="text-muted-foreground">
                When you sign agreements with us, they will appear here for your records.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {agreements.map((agreement) => (
              <Card key={agreement.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{agreement.title}</h3>
                      {agreement.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {agreement.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Uploaded {format(new Date(agreement.uploaded_at), 'MMM d, yyyy')}
                        </span>
                        {agreement.signed_at && (
                          <span className="text-green-600">
                            Signed {format(new Date(agreement.signed_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(agreement)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(agreement)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default ClientAgreements;
