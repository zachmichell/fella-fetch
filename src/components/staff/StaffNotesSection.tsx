import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Loader2, StickyNote, Pencil, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  note: string;
  source_type: string | null;
  source_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  staff_name?: string;
}

interface StaffNotesSectionProps {
  entityType: 'pet' | 'client';
  entityId: string;
  entityName: string;
}

export function StaffNotesSection({ entityType, entityId, entityName }: StaffNotesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      let data: any[] | null = null;
      let error: any = null;

      if (entityType === 'pet') {
        const result = await supabase
          .from('pet_notes')
          .select('*')
          .eq('pet_id', entityId)
          .order('created_at', { ascending: false });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('client_notes')
          .select('*')
          .eq('client_id', entityId)
          .order('created_at', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Fetch staff names for each note
      const staffIds = [...new Set((data || []).map((n: any) => n.created_by))];
      
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', staffIds);
        
        (profiles || []).forEach(p => {
          staffMap[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Staff';
        });
      }

      const notesWithStaff = (data || []).map((note: any) => ({
        ...note,
        staff_name: staffMap[note.created_by] || 'Staff',
      }));

      setNotes(notesWithStaff);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [entityId]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !user) return;

    setSaving(true);
    try {
      const insertData: any = {
        [foreignKey]: entityId,
        note: noteText.trim(),
        source_type: 'manual',
        created_by: user.id,
      };

      const { error } = await supabase
        .from(tableName)
        .insert([insertData]);

      if (error) throw error;

      toast({ title: 'Note added successfully' });
      setNoteText('');
      setIsAddOpen(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = async () => {
    if (!noteText.trim() || !selectedNote) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ note: noteText.trim() })
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast({ title: 'Note updated successfully' });
      setNoteText('');
      setSelectedNote(null);
      setIsEditOpen(false);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast({ title: 'Note deleted successfully' });
      setSelectedNote(null);
      setIsDeleteOpen(false);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (note: Note) => {
    setSelectedNote(note);
    setNoteText(note.note);
    setIsEditOpen(true);
  };

  const openDelete = (note: Note) => {
    setSelectedNote(note);
    setIsDeleteOpen(true);
  };

  const getSourceLabel = (sourceType: string | null) => {
    switch (sourceType) {
      case 'manual': return 'Manual';
      case 'reservation': return 'Reservation';
      case 'grooming': return 'Grooming';
      case 'boarding': return 'Boarding';
      case 'daycare': return 'Daycare';
      default: return sourceType || 'Manual';
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Staff Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Internal notes visible only to staff
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1"
              onClick={() => {
                setNoteText('');
                setIsAddOpen(true);
              }}
            >
              <Plus className="h-3 w-3" /> Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notes yet
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="p-3 rounded-lg border bg-muted/30 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(note)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => openDelete(note)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span>{note.staff_name}</span>
                      <span>•</span>
                      <span className="capitalize">{getSourceLabel(note.source_type)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note for {entityName}</DialogTitle>
            <DialogDescription>
              This note will only be visible to staff members
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={saving || !noteText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note content
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditNote} disabled={saving || !noteText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
