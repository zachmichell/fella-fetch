import { useState, useEffect, useRef } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Save, Loader2, Globe, AlertTriangle } from 'lucide-react';
import { SmsReminderSettings } from '@/components/staff/SmsReminderSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WebhookUrls {
  marketing_sms: string;
  marketing_email: string;
  reminder_sms: string;
}

const StaffCommunications = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading } = useSystemSettings();

  const [webhooks, setWebhooks] = useState<WebhookUrls>({
    marketing_sms: '',
    marketing_email: '',
    reminder_sms: '',
  });
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);

  const initialized = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialized.current) {
      initialized.current = true;
      const saved = getSetting<WebhookUrls>('webhook_urls', {
        marketing_sms: '',
        marketing_email: '',
        reminder_sms: '',
      });
      setWebhooks(saved);
    }
  }, [isLoading]);

  const handleSaveWebhooks = async () => {
    setIsSavingWebhooks(true);
    try {
      await updateSetting.mutateAsync({
        key: 'webhook_urls',
        value: webhooks,
        description: 'Webhook URLs for SMS, Email, and Reminder integrations',
      });
      toast({ title: 'Saved', description: 'Webhook URLs have been updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  if (!isAdmin) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to access communication settings.
            </AlertDescription>
          </Alert>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS & Communications
          </h1>
          <p className="text-muted-foreground">
            Configure SMS reminders, email settings, and webhook integrations
          </p>
        </div>

        {/* Webhook URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Webhook URLs
            </CardTitle>
            <CardDescription>
              Configure the webhook endpoints used to send SMS and Email messages through your external services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marketing-sms-webhook">Marketing SMS Webhook URL</Label>
              <Input
                id="marketing-sms-webhook"
                type="url"
                placeholder="https://hook.us1.make.com/..."
                value={webhooks.marketing_sms}
                onChange={(e) => setWebhooks(prev => ({ ...prev, marketing_sms: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Used when sending bulk SMS from the Marketing section.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketing-email-webhook">Marketing Email Webhook URL</Label>
              <Input
                id="marketing-email-webhook"
                type="url"
                placeholder="https://hook.us1.make.com/..."
                value={webhooks.marketing_email}
                onChange={(e) => setWebhooks(prev => ({ ...prev, marketing_email: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Used when sending bulk emails from the Marketing section.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-sms-webhook">Appointment Reminder SMS Webhook URL</Label>
              <Input
                id="reminder-sms-webhook"
                type="url"
                placeholder="https://hook.us1.make.com/..."
                value={webhooks.reminder_sms}
                onChange={(e) => setWebhooks(prev => ({ ...prev, reminder_sms: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Used by the automated appointment reminder system.</p>
            </div>

            <Button onClick={handleSaveWebhooks} disabled={isSavingWebhooks || isLoading}>
              {isSavingWebhooks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Webhook URLs
            </Button>
          </CardContent>
        </Card>

        {/* SMS Reminder Settings */}
        <SmsReminderSettings />
      </div>
    </StaffLayout>
  );
};

export default StaffCommunications;
