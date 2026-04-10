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

interface WebhookUrls {
  marketing_email: string;
}

interface TelnyxConfig {
  api_key: string;
  from_number: string;
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

  const [telnyxConfig, setTelnyxConfig] = useState<TelnyxConfig>({
    api_key: '',
    from_number: '',
  });
  const [isSavingTelnyx, setIsSavingTelnyx] = useState(false);
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

      const savedTelnyx = getSetting<TelnyxConfig>('telnyx_config', {
        api_key: '',
        from_number: '',
      });
      setTelnyxConfig(savedTelnyx);

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

  const handleSaveTelnyx = async () => {
    setIsSavingTelnyx(true);
    try {
      await updateSetting.mutateAsync({
        key: 'telnyx_config',
        value: telnyxConfig,
        description: 'Telnyx SMS API configuration (API key and from number)',
      });
      toast({ title: 'Saved', description: 'Telnyx SMS configuration updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSavingTelnyx(false);
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
        toast({ title: 'Test SMS Sent', description: `Message sent to ${testPhone}` });
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
      // Preserve any existing webhook keys, just update email
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
            Configure SMS provider, email settings, and message templates
          </p>
        </div>

        {/* Telnyx SMS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              SMS Provider (Telnyx)
            </CardTitle>
            <CardDescription>
              Configure your Telnyx API key and sender phone number. All SMS messages (marketing, reminders, grooming pickup) will be sent directly through Telnyx.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telnyx-api-key">Telnyx API Key</Label>
              <Input
                id="telnyx-api-key"
                type="password"
                placeholder="KEY..."
                value={telnyxConfig.api_key}
                onChange={(e) => setTelnyxConfig(prev => ({ ...prev, api_key: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Your Telnyx API v2 key. Find it at{' '}
                <a href="https://portal.telnyx.com/#/app/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  portal.telnyx.com → API Keys
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telnyx-from-number">From Phone Number</Label>
              <Input
                id="telnyx-from-number"
                type="tel"
                placeholder="+15551234567"
                value={telnyxConfig.from_number}
                onChange={(e) => setTelnyxConfig(prev => ({ ...prev, from_number: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                The Telnyx phone number to send SMS from (must be in +1XXXXXXXXXX format).
              </p>
            </div>

            <Button onClick={handleSaveTelnyx} disabled={isSavingTelnyx || isLoading}>
              {isSavingTelnyx ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Telnyx Configuration
            </Button>

            {/* Test SMS */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-medium">Send Test SMS</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Verify your Telnyx configuration by sending a test message.
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
                  disabled={isSendingTest || !telnyxConfig.api_key || !telnyxConfig.from_number}
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
              <Globe className="h-5 w-5 text-blue-500" />
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
              <Scissors className="h-5 w-5 text-purple-500" />
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
