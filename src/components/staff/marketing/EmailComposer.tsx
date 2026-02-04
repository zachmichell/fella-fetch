import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Plus, Eye, Edit } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { EmailBlockEditor, EmailBlock } from './EmailBlockEditor';
import { EmailPreview } from './EmailPreview';
import { DynamicVariableInsert } from './DynamicVariableInsert';

interface EmailComposerProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  blocks: EmailBlock[];
  onBlocksChange: (blocks: EmailBlock[]) => void;
}

export const EmailComposer = ({
  subject,
  onSubjectChange,
  blocks,
  onBlocksChange,
}: EmailComposerProps) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSelectTemplate = (content: string, templateSubject?: string) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        onBlocksChange(parsed);
      }
    } catch {
      // If not JSON, treat as legacy text content
      onBlocksChange([{ id: crypto.randomUUID(), type: 'text', content }]);
    }
    if (templateSubject) {
      onSubjectChange(templateSubject);
    }
    setShowTemplates(false);
  };

  const handleInsertVariableInSubject = (variable: string) => {
    onSubjectChange(subject + `{{${variable}}}`);
  };

  const getContentForTemplate = () => {
    return JSON.stringify(blocks);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Message
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Templates
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTemplates && (
          <TemplateSelector
            type="email"
            onSelect={handleSelectTemplate}
            onClose={() => setShowTemplates(false)}
            currentContent={getContentForTemplate()}
            currentSubject={subject}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-subject">Subject Line</Label>
            <DynamicVariableInsert onInsert={handleInsertVariableInSubject} />
          </div>
          <Input
            id="email-subject"
            placeholder="Enter email subject... Use {{client_name}} for personalization"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />
        </div>

        {showPreview ? (
          <EmailPreview subject={subject} blocks={blocks} />
        ) : (
          <EmailBlockEditor blocks={blocks} onChange={onBlocksChange} />
        )}
      </CardContent>
    </Card>
  );
};
