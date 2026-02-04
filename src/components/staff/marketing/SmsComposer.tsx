import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { DynamicVariableInsert } from './DynamicVariableInsert';

interface SmsComposerProps {
  value: string;
  onChange: (value: string) => void;
}

export const SmsComposer = ({ value, onChange }: SmsComposerProps) => {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleInsertVariable = (variable: string) => {
    onChange(value + `{{${variable}}}`);
  };

  const handleSelectTemplate = (content: string) => {
    onChange(content);
    setShowTemplates(false);
  };

  const charCount = value.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Message
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Use Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTemplates && (
          <TemplateSelector
            type="sms"
            onSelect={handleSelectTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}

        <div className="space-y-2">
          <DynamicVariableInsert onInsert={handleInsertVariable} />
          
          <Textarea
            placeholder="Type your SMS message here... Use {{client_name}}, {{pet_names}}, etc. for personalization"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-2">
              <Badge variant="outline">{charCount} characters</Badge>
              <Badge variant="outline">{segments} segment{segments > 1 ? 's' : ''}</Badge>
            </div>
            <span>160 chars per segment</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
