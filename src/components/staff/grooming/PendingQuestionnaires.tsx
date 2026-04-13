import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ClipboardList, CheckCircle, XCircle, Image, Dog, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Questionnaire {
  id: string;
  pet_id: string;
  client_id: string;
  pet_name: string;
  pet_breed: string | null;
  pet_size: string | null;
  client_name: string;
  coat_condition: string | null;
  matting_level: string | null;
  last_groom_timeframe: string | null;
  last_groom_location: string | null;
  behavior_concerns: string | null;
  photo_urls: string[] | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  assigned_groom_level: number | null;
}

export const PendingQuestionnaires = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedLevel, setAssignedLevel] = useState<string>('1');
  const [viewPhotosId, setViewPhotosId] = useState<string | null>(null);

  const { data: questionnaires, isLoading } = useQuery({
    queryKey: ['pending-questionnaires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groom_questionnaires')
        .select(`
          id,
          pet_id,
          client_id,
          coat_condition,
          matting_level,
          last_groom_timeframe,
          last_groom_location,
          behavior_concerns,
          photo_urls,
          status,
          created_at,
          admin_notes,
          assigned_groom_level,
          pets (
            name,
            breed,
            size
          ),
          clients:client_id (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((q: any) => ({
        id: q.id,
        pet_id: q.pet_id,
        client_id: q.client_id,
        pet_name: q.pets?.name || 'Unknown',
        pet_breed: q.pets?.breed || null,
        pet_size: q.pets?.size || null,
        client_name: q.clients
          ? `${q.clients.first_name} ${q.clients.last_name}`
          : 'Unknown',
        coat_condition: q.coat_condition,
        matting_level: q.matting_level,
        last_groom_timeframe: q.last_groom_timeframe,
        last_groom_location: q.last_groom_location,
        behavior_concerns: q.behavior_concerns,
        photo_urls: q.photo_urls,
        status: q.status,
        created_at: q.created_at,
        admin_notes: q.admin_notes,
        assigned_groom_level: q.assigned_groom_level,
      })) as Questionnaire[];
    },
  });

  const handleApprove = async (q: Questionnaire) => {
    try {
      const level = parseInt(assignedLevel);

      // Update questionnaire status
      const { error: qError } = await supabase
        .from('groom_questionnaires')
        .update({
          status: 'approved',
          assigned_groom_level: level,
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', q.id);

      if (qError) throw qError;

      // Update pet's groom level
      const { error: petError } = await supabase
        .from('pets')
        .update({
          groom_level: level,
          level_expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq('id', q.pet_id);

      if (petError) throw petError;

      toast({
        title: 'Questionnaire approved',
        description: `${q.pet_name} assigned groom level ${level}. Client can now book directly.`,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-questionnaires'] });
      setReviewingId(null);
      setAdminNotes('');
      setAssignedLevel('1');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve questionnaire',
        variant: 'destructive',
      });
    }
  };

  const handleDecline = async (q: Questionnaire) => {
    try {
      const { error } = await supabase
        .from('groom_questionnaires')
        .update({
          status: 'declined',
          admin_notes: adminNotes || 'Declined',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', q.id);

      if (error) throw error;

      toast({
        title: 'Questionnaire declined',
        description: `Questionnaire for ${q.pet_name} has been declined.`,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-questionnaires'] });
      setReviewingId(null);
      setAdminNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline questionnaire',
        variant: 'destructive',
      });
    }
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!questionnaires || questionnaires.length === 0) return null;

  const reviewingQ = questionnaires.find(q => q.id === reviewingId);
  const viewPhotosQ = questionnaires.find(q => q.id === viewPhotosId);

  return (
    <>
      <Card className="border-purple-300 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <ClipboardList className="h-5 w-5" />
            Pending Questionnaires ({questionnaires.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-200 dark:border-purple-800 bg-purple-100/50 dark:bg-purple-900/20">
                  <th className="text-left p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Pet</th>
                  <th className="text-left p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Client</th>
                  <th className="text-left p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Submitted</th>
                  <th className="text-left p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Details</th>
                  <th className="text-left p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Photos</th>
                  <th className="text-right p-3 text-sm font-medium text-purple-800 dark:text-purple-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionnaires.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-purple-100 dark:border-purple-900 last:border-0 hover:bg-purple-50/50 dark:hover:bg-purple-950/30"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{q.pet_name}</span>
                          {q.pet_breed && (
                            <div className="text-xs text-muted-foreground">{q.pet_breed}</div>
                          )}
                          {q.pet_size && (
                            <Badge variant="outline" className="text-xs mt-0.5">{q.pet_size}</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{q.client_name}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {format(new Date(q.created_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="p-3">
                      <div className="text-xs space-y-0.5">
                        {q.coat_condition && <div><span className="font-medium">Coat:</span> {q.coat_condition}</div>}
                        {q.matting_level && <div><span className="font-medium">Matting:</span> {q.matting_level}</div>}
                        {q.last_groom_timeframe && <div><span className="font-medium">Last groom:</span> {q.last_groom_timeframe}</div>}
                        {q.behavior_concerns && <div><span className="font-medium">Behavior:</span> {q.behavior_concerns}</div>}
                      </div>
                    </td>
                    <td className="p-3">
                      {q.photo_urls && q.photo_urls.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewPhotosId(q.id)}
                        >
                          <Image className="h-4 w-4 mr-1" />
                          {q.photo_urls.length}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => {
                            setReviewingId(q.id);
                            setAdminNotes('');
                            setAssignedLevel('1');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingQ} onOpenChange={(open) => { if (!open) setReviewingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Questionnaire — {reviewingQ?.pet_name}</DialogTitle>
          </DialogHeader>
          {reviewingQ && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div><strong>Client:</strong> {reviewingQ.client_name}</div>
                <div><strong>Size:</strong> {reviewingQ.pet_size || '—'}</div>
                <div><strong>Coat Condition:</strong> {reviewingQ.coat_condition || '—'}</div>
                <div><strong>Matting Level:</strong> {reviewingQ.matting_level || '—'}</div>
                <div><strong>Last Groom:</strong> {reviewingQ.last_groom_timeframe || '—'} {reviewingQ.last_groom_location ? `at ${reviewingQ.last_groom_location}` : ''}</div>
                <div><strong>Behavior Concerns:</strong> {reviewingQ.behavior_concerns || 'None'}</div>
              </div>

              {reviewingQ.photo_urls && reviewingQ.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {reviewingQ.photo_urls.map((url, i) => (
                    <img
                      key={i}
                      src={getPhotoUrl(url)}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-20 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Groom Level</label>
                <Select value={assignedLevel} onValueChange={setAssignedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 — Basic</SelectItem>
                    <SelectItem value="2">Level 2 — Standard</SelectItem>
                    <SelectItem value="3">Level 3 — Full</SelectItem>
                    <SelectItem value="4">Level 4 — Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Any notes about this assessment..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => handleDecline(reviewingQ)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleApprove(reviewingQ)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photos Dialog */}
      <Dialog open={!!viewPhotosQ} onOpenChange={(open) => { if (!open) setViewPhotosId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Photos — {viewPhotosQ?.pet_name}</DialogTitle>
          </DialogHeader>
          {viewPhotosQ?.photo_urls && (
            <div className="grid grid-cols-2 gap-3">
              {viewPhotosQ.photo_urls.map((url, i) => (
                <img
                  key={i}
                  src={getPhotoUrl(url)}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-48 object-cover rounded-lg border"
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
