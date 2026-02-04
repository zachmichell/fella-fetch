import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail } from 'lucide-react';
import { SmsComposer } from './SmsComposer';
import { EmailComposer } from './EmailComposer';
import { EmailBlock } from './EmailBlockEditor';

interface MarketingMessageComposerProps {
  smsContent: string;
  onSmsContentChange: (content: string) => void;
  emailSubject: string;
  onEmailSubjectChange: (subject: string) => void;
  emailBlocks: EmailBlock[];
  onEmailBlocksChange: (blocks: EmailBlock[]) => void;
}

export const MarketingMessageComposer = ({
  smsContent,
  onSmsContentChange,
  emailSubject,
  onEmailSubjectChange,
  emailBlocks,
  onEmailBlocksChange,
}: MarketingMessageComposerProps) => {
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sms' | 'email')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-4">
          <SmsComposer value={smsContent} onChange={onSmsContentChange} />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <EmailComposer
            subject={emailSubject}
            onSubjectChange={onEmailSubjectChange}
            blocks={emailBlocks}
            onBlocksChange={onEmailBlocksChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export type { EmailBlock };
