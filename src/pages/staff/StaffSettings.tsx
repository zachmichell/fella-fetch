import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const StaffSettings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading } = useSystemSettings();
  
  const [inactivityDays, setInactivityDays] = useState<string>('90');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const currentValue = getSetting<number>('pet_inactivity_days', 90);
      setInactivityDays(String(currentValue));
    }
  }, [isLoading, getSetting]);

  const handleSaveInactivityDays = async () => {
    const days = parseInt(inactivityDays, 10);
    
    if (isNaN(days) || days < 1 || days > 365) {
      toast({
        title: 'Invalid value',
        description: 'Please enter a number between 1 and 365 days',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'pet_inactivity_days', value: days });
      toast({
        title: 'Settings saved',
        description: `Pet inactivity alert set to ${days} days`,
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
              You must be an administrator to access system settings.
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
            <Settings className="h-6 w-6" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and thresholds
          </p>
        </div>

        {/* Pet Inactivity Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pet Inactivity Alert
            </CardTitle>
            <CardDescription>
              Configure when to show a warning for pets that haven't visited recently.
              This alert appears when staff accepts a reservation request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-xs">
              <Label htmlFor="inactivity-days">Days Since Last Reservation</Label>
              <div className="flex gap-2">
                <Input
                  id="inactivity-days"
                  type="number"
                  min="1"
                  max="365"
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(e.target.value)}
                  placeholder="90"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSaveInactivityDays}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-2">Save</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                An alert will be shown for pets that haven't had a reservation in this many days or more.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
};

export default StaffSettings;
