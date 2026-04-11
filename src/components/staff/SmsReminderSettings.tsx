import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Save, Loader2, Info } from 'lucide-react';

interface ReminderConfig {
  enabled: boolean;
  message: string;
  timing_value: number;
  timing_unit: 'hours' | 'days';
  secondary_enabled?: boolean;
  secondary_message?: string;
  secondary_timing_value?: number;
  secondary_timing_unit?: 'hours' | 'days';
}

interface ReminderSettings {
  [serviceTypeId: string]: ReminderConfig;
}

const DEFAULT_REMINDER: ReminderConfig = {
  enabled: false,
  message: '',
  timing_value: 24,
  timing_unit: 'hours',
  secondary_enabled: false,
  secondary_message: '',
  secondary_timing_value: 1,
  secondary_timing_unit: 'hours',
};

const DYNAMIC_VARIABLES = [
  { key: 'client_first_name', label: 'First Name' },
  { key: 'client_name', label: 'Full Name' },
  { key: 'pet_names', label: 'Pet Name(s)' },
  { key: 'service_type', label: 'Service Type' },
  { key: 'date', label: 'Appointment Date' },
  { key: 'time', label: 'Appointment Time' },
  { key: 'business_name', label: 'Business Name' },
];

export const SmsReminderSettings = () => {
  const { toast } = useToast();
  const { getSetting, isLoading: isLoadingSettings } = useSystemSettings();
  const [reminders, setReminders] = useState<ReminderSettings>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: serviceTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['service-types-for-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, display_name, name, category, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (!isLoadingSettings && !initialized.current) {
      initialized.current = true;
      const saved = getSetting<ReminderSettings>('sms_reminder_settings', {});
      setReminders(saved);
    }
  }, [isLoadingSettings]);

  const getReminder = (serviceTypeId: string): ReminderConfig => {
    return { ...DEFAULT_REMINDER, ...reminders[serviceTypeId] };
  };

  const updateReminder = (serviceTypeId: string, updates: Partial<ReminderConfig>) => {
    setReminders(prev => ({
      ...prev,
      [serviceTypeId]: { ...getReminder(serviceTypeId), ...updates },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key: 'sms_reminder_settings', value: reminders as any, description: 'SMS reminder templates and timing per service type' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      toast({ title: 'Saved', description: 'SMS reminder settings have been updated' });
    } catch (error) {
      toast({ title: 'Error saving', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingSettings || isLoadingTypes;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          SMS Appointment Reminders
        </CardTitle>
        <CardDescription>
          Configure automated SMS reminder messages for each service type. Use dynamic variables to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variable reference */}
        <div className="rounded-md border bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Available Variables</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DYNAMIC_VARIABLES.map(v => (
              <Badge key={v.key} variant="outline" className="font-mono text-xs">
                <span className="text-muted-foreground mr-1.5">{v.label}:</span>
                {`{{${v.key}}}`}
              </Badge>
            ))}
          </div>
        </div>

        {/* Per service type config */}
        {serviceTypes?.map(st => {
          const config = getReminder(st.id);
          return (
            <div key={st.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: st.color || 'hsl(var(--muted-foreground))' }}
                  />
                  <Label className="text-base font-medium">{st.display_name}</Label>
                  <Badge variant="secondary" className="text-xs">{st.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${st.id}`} className="text-sm text-muted-foreground">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${st.id}`}
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateReminder(st.id, { enabled: checked })}
                  />
                </div>
              </div>

              {config.enabled && (
                <>
                  {/* Primary Reminder */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-primary">Primary Reminder</Label>
                    {/* Timing */}
                    <div className="flex items-end gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Send reminder</Label>
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          className="w-20"
                          value={config.timing_value}
                          onChange={(e) =>
                            updateReminder(st.id, { timing_value: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>
                      <Select
                        value={config.timing_unit}
                        onValueChange={(val: 'hours' | 'days') =>
                          updateReminder(st.id, { timing_unit: val })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground pb-2">before appointment</span>
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Reminder Message</Label>
                      <Textarea
                        placeholder={`Hi {{client_name}}, this is a reminder that {{pet_names}} has a ${st.display_name.toLowerCase()} appointment on {{date}} at {{time}}. See you soon!`}
                        value={config.message}
                        onChange={(e) => updateReminder(st.id, { message: e.target.value })}
                        className="min-h-[80px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {config.message.length} characters · {Math.ceil(config.message.length / 160) || 1} SMS segment{Math.ceil(config.message.length / 160) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Reminder */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Secondary Reminder</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`secondary-${st.id}`} className="text-sm text-muted-foreground">
                          Enabled
                        </Label>
                        <Switch
                          id={`secondary-${st.id}`}
                          checked={config.secondary_enabled || false}
                          onCheckedChange={(checked) => updateReminder(st.id, { secondary_enabled: checked })}
                        />
                      </div>
                    </div>

                    {config.secondary_enabled && (
                      <>
                        <div className="flex items-end gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Send reminder</Label>
                            <Input
                              type="number"
                              min={1}
                              max={168}
                              className="w-20"
                              value={config.secondary_timing_value || 1}
                              onChange={(e) =>
                                updateReminder(st.id, { secondary_timing_value: parseInt(e.target.value) || 1 })
                              }
                            />
                          </div>
                          <Select
                            value={config.secondary_timing_unit || 'hours'}
                            onValueChange={(val: 'hours' | 'days') =>
                              updateReminder(st.id, { secondary_timing_unit: val })
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground pb-2">before appointment</span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Reminder Message</Label>
                          <Textarea
                            placeholder={`Hi {{client_first_name}}, just a heads up — {{pet_names}}'s ${st.display_name.toLowerCase()} appointment is in 1 hour! See you soon at {{business_name}}.`}
                            value={config.secondary_message || ''}
                            onChange={(e) => updateReminder(st.id, { secondary_message: e.target.value })}
                            className="min-h-[80px] font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            {(config.secondary_message || '').length} characters · {Math.ceil((config.secondary_message || '').length / 160) || 1} SMS segment{Math.ceil((config.secondary_message || '').length / 160) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Reminder Settings
        </Button>
      </CardContent>
    </Card>
  );
};
