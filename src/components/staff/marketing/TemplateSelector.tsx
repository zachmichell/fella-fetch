import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, X, Trash2 } from 'lucide-react';

interface TemplateSelectorProps {
  type: 'sms' | 'email';
  onSelect: (content: string, subject?: string) => void;
  onClose: () => void;
  currentContent?: string;
  currentSubject?: string;
}

interface MarketingTemplate {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string;
}

export const TemplateSelector = ({
  type,
  onSelect,
  onClose,
  currentContent,
  currentSubject,
}: TemplateSelectorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['marketing-templates', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('type', type)
        .order('name');
      if (error) throw error;
      return data as MarketingTemplate[];
    },
  });

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim() || !currentContent) {
      toast({
        title: 'Missing information',
        description: 'Please enter a template name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_templates')
        .insert({
          name: newTemplateName.trim(),
          type,
          subject: type === 'email' ? currentSubject : null,
          content: currentContent,
        });

      if (error) throw error;

      toast({ title: 'Saved', description: 'Template saved successfully' });
      setNewTemplateName('');
      queryClient.invalidateQueries({ queryKey: ['marketing-templates', type] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('marketing_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Deleted', description: 'Template deleted' });
      queryClient.invalidateQueries({ queryKey: ['marketing-templates', type] });
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {type === 'sms' ? 'SMS' : 'Email'} Templates
        </h4>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Save current as template */}
      {currentContent && (
        <div className="flex gap-2">
          <Input
            placeholder="Save current as template..."
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsTemplate}
            disabled={isSaving || !newTemplateName.trim()}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      )}

      {/* Template list */}
      <ScrollArea className="h-[200px]">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No templates saved yet
          </div>
        ) : (
          <div className="space-y-2">
            {templates?.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-background cursor-pointer group"
                onClick={() => onSelect(template.content, template.subject || undefined)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {template.content.substring(0, 60)}...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
