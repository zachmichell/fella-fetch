import { useState, useEffect, useRef } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Save, Loader2, Globe, AlertTriangle, Scissors, Phone, Send } from 'lucide-react';
import { SmsReminderSettings } from '@/components/staff/SmsReminderSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SmsWebhookConfig {
  single_webhook_url: string;
  bulk_webhook_url: string;
  from_number: string;
}

interface WebhookUrls {
  marketing_email: string;
}

interface GroomingPickupSettings {
  enabled: boolean;
  message: string;
}

const DEFAULT_GROOMING_PICKUP_MESSAGE = `Hi {{client_name}}, {{pet_names}} is all done with their {{service_type}} at {{business_name}}! Ready for pickup. 🐾`;

const StaffCommunications = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading } = useSystemSettings();

  const [smsConfig, setSmsConfig] = useState<SmsWebhookConfig>({
    single_webhook_url: '',
    bulk_webhook_url: '',
    from_number: '',
  });
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const [webhooks, setWebhooks] = useState<WebhookUrls>({
    marketing_email: '',
  });
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);

  const [groomingPickup, setGroomingPickup] = useState<GroomingPickupSettings>({
    enabled: false,
    message: DEFAULT_GROOMING_PICKUP_MESSAGE,
  });
  const [isSavingGrooming, setIsSavingGrooming] = useState(false);

  const initialized = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialized.current) {
      initialized.current = true;

      const savedSms = getSetting<any>('sms_webhook_config', {});
      const migratedSms: SmsWebhookConfig = {
        single_webhook_url: savedSms.single_webhook_url || savedSms.webhook_url || '',
        bulk_webhook_url: savedSms.bulk_webhook_url || '',
        from_number: savedSms.from_number || '',
      };
      setSmsConfig(migratedSms);

      const savedWebhooks = getSetting<any>('webhook_urls', {
        marketing_email: '',
      });
      setWebhooks({ marketing_email: savedWebhooks.marketing_email || '' });

      const savedGrooming = getSetting<GroomingPickupSettings>('grooming_pickup_sms', {
        enabled: false,
        message: DEFAULT_GROOMING_PICKUP_MESSAGE,
      });
      setGroomingPickup(savedGrooming);
    }
  }, [isLoading]);

  const handleSaveSms = async () => {
    setIsSavingSms(true);
    try {
      await updateSetting.mutateAsync({
        key: 'sms_webhook_config',
        value: smsConfig,
        description: 'SMS webhook configuration — URL and optional from number',
      });
      toast({ title: 'Saved', description: 'SMS configuration updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      toast({ title: 'Enter a phone number', description: 'Please enter a phone number to send a test SMS', variant: 'destructive' });
      return;
    }
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to: testPhone.trim(), message: 'This is a test SMS from Fella & Fetch 🐾' },
      });
      if (error) throw error;
      if (data?.success) {
        const sentCount = data.sent || 0;
        if (sentCount > 0) {
          toast({ title: 'Test SMS Sent', description: `Message sent to ${testPhone}` });
        } else {
          const firstResult = data.results?.[0];
          toast({ title: 'SMS Failed', description: firstResult?.error || 'Webhook did not return success', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Failed', description: data?.error || 'SMS delivery failed', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send test SMS', variant: 'destructive' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveWebhooks = async () => {
    setIsSavingWebhooks(true);
    try {
      const existingWebhooks = getSetting<any>('webhook_urls', {});
      await updateSetting.mutateAsync({
        key: 'webhook_urls',
        value: { ...existingWebhooks, marketing_email: webhooks.marketing_email },
        description: 'Webhook URLs for Email integrations',
      });
      toast({ title: 'Saved', description: 'Email webhook URL has been updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  const handleSaveGroomingPickup = async () => {
    setIsSavingGrooming(true);
    try {
      await updateSetting.mutateAsync({
        key: 'grooming_pickup_sms',
        value: groomingPickup,
        description: 'Grooming pickup SMS notification settings',
      });
      toast({ title: 'Saved', description: 'Grooming pickup SMS settings updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSavingGrooming(false);
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
            Configure SMS webhooks, email settings, and message templates
          </p>
        </div>

        {/* SMS Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              SMS Webhook
            </CardTitle>
            <CardDescription>
              All SMS messages (marketing, reminders, grooming pickup) are sent via your webhook URL (e.g. Make, Zapier, or a custom endpoint).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-single-webhook-url">Single SMS Webhook URL</Label>
              <Input
                id="sms-single-webhook-url"
                type="url"
                placeholder="https://hook.us1.make.com/single..."
                value={smsConfig.single_webhook_url}
                onChange={(e) => setSmsConfig(prev => ({ ...prev, single_webhook_url: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Used for sending a single SMS to one client. Receives <code className="text-xs">{`{ to, message, from }`}</code>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-bulk-webhook-url">Bulk SMS Webhook URL</Label>
              <Input
                id="sms-bulk-webhook-url"
                type="url"
                placeholder="https://hook.us1.make.com/bulk..."
                value={smsConfig.bulk_webhook_url}
                onChange={(e) => setSmsConfig(prev => ({ ...prev, bulk_webhook_url: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Used for sending SMS to multiple recipients at once. Receives <code className="text-xs">{`{ recipients: [{ to, message }], from }`}</code>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-from-number">From Phone Number (optional)</Label>
              <Input
                id="sms-from-number"
                type="tel"
                placeholder="+15551234567"
                value={smsConfig.from_number}
                onChange={(e) => setSmsConfig(prev => ({ ...prev, from_number: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Included in the webhook payload if your SMS provider requires a from number.
              </p>
            </div>

            <Button onClick={handleSaveSms} disabled={isSavingSms || isLoading}>
              {isSavingSms ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save SMS Settings
            </Button>

            {/* Test SMS */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-medium">Send Test SMS</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Verify your webhook configuration by sending a test message.
              </p>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+15559876543"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestSms}
                  disabled={isSendingTest || !smsConfig.single_webhook_url}
                >
                  {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Email Webhook
            </CardTitle>
            <CardDescription>
              Configure the webhook endpoint for sending marketing emails through your external email service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Button onClick={handleSaveWebhooks} disabled={isSavingWebhooks || isLoading}>
              {isSavingWebhooks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Email Webhook
            </Button>
          </CardContent>
        </Card>

        {/* Grooming Pickup SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Grooming Pickup Notification
            </CardTitle>
            <CardDescription>
              Automatically send an SMS to the client when their pet's grooming appointment is marked complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Grooming Pickup SMS</Label>
                <p className="text-xs text-muted-foreground">Send an SMS when a groom is completed</p>
              </div>
              <Switch
                checked={groomingPickup.enabled}
                onCheckedChange={(checked) => setGroomingPickup(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grooming-pickup-message">Message Template</Label>
              <Textarea
                id="grooming-pickup-message"
                value={groomingPickup.message}
                onChange={(e) => setGroomingPickup(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                placeholder="Enter pickup notification message..."
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <p className="text-xs text-muted-foreground w-full mb-1">Available variables:</p>
              {[
                { code: '{{client_name}}', label: 'Client Name' },
                { code: '{{pet_names}}', label: 'Pet Name' },
                { code: '{{service_type}}', label: 'Service Type' },
                { code: '{{groomer_name}}', label: 'Groomer Name' },
                { code: '{{business_name}}', label: 'Business Name' },
              ].map(v => (
                <Badge key={v.code} variant="secondary" className="text-xs font-mono cursor-default">
                  {v.code} — {v.label}
                </Badge>
              ))}
            </div>

            <Button onClick={handleSaveGroomingPickup} disabled={isSavingGrooming || isLoading}>
              {isSavingGrooming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Grooming Pickup Settings
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
