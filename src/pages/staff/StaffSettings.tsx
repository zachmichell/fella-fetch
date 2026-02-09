import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useBusinessHours, BusinessHours } from '@/hooks/useBusinessHours';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertTriangle, Save, Loader2, Clock, Building2 } from 'lucide-react';
import { EarlyLateFeeSettings } from '@/components/staff/EarlyLateFeeSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time (AST)' },
];

// Time options for business hours
const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
];

const StaffSettings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading } = useSystemSettings();
  const { businessHours, isLoading: isLoadingHours, updateBusinessHours } = useBusinessHours();
  
  const [inactivityDays, setInactivityDays] = useState<string>('90');
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [isSavingInactivity, setIsSavingInactivity] = useState(false);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  
  // Business hours state
  const [weekdayOpen, setWeekdayOpen] = useState('7:00 AM');
  const [weekdayClose, setWeekdayClose] = useState('6:00 PM');
  const [weekendOpen, setWeekendOpen] = useState('8:00 AM');
  const [weekendClose, setWeekendClose] = useState('5:00 PM');

  useEffect(() => {
    if (!isLoading) {
      const currentInactivity = getSetting<number>('pet_inactivity_days', 90);
      setInactivityDays(String(currentInactivity));
      
      const currentTimezone = getSetting<string>('business_timezone', 'America/New_York');
      setTimezone(currentTimezone);
    }
  }, [isLoading, getSetting]);

  useEffect(() => {
    if (!isLoadingHours && businessHours) {
      setWeekdayOpen(businessHours.weekday.open);
      setWeekdayClose(businessHours.weekday.close);
      setWeekendOpen(businessHours.weekend.open);
      setWeekendClose(businessHours.weekend.close);
    }
  }, [isLoadingHours, businessHours]);

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

    setIsSavingInactivity(true);
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
      setIsSavingInactivity(false);
    }
  };

  const handleSaveTimezone = async () => {
    setIsSavingTimezone(true);
    try {
      await updateSetting.mutateAsync({ key: 'business_timezone', value: timezone });
      const selectedTz = TIMEZONES.find(tz => tz.value === timezone);
      toast({
        title: 'Settings saved',
        description: `Business timezone set to ${selectedTz?.label || timezone}`,
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTimezone(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    setIsSavingHours(true);
    try {
      await updateBusinessHours.mutateAsync({
        weekday: { open: weekdayOpen, close: weekdayClose },
        weekend: { open: weekendOpen, close: weekendClose },
      });
      toast({
        title: 'Settings saved',
        description: 'Business hours have been updated',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSavingHours(false);
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

        {/* Business Hours Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-500" />
              Business Hours
            </CardTitle>
            <CardDescription>
              Set the operating hours for your business. These hours are used for booking validation
              to ensure clients can only book within your operating hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weekday Hours */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Weekday Hours (Mon-Fri)</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="weekday-open" className="text-sm text-muted-foreground">Open</Label>
                  <Select value={weekdayOpen} onValueChange={setWeekdayOpen} disabled={isLoadingHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground pt-5">to</span>
                <div className="flex-1">
                  <Label htmlFor="weekday-close" className="text-sm text-muted-foreground">Close</Label>
                  <Select value={weekdayClose} onValueChange={setWeekdayClose} disabled={isLoadingHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Weekend Hours */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Weekend Hours (Sat-Sun)</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="weekend-open" className="text-sm text-muted-foreground">Open</Label>
                  <Select value={weekendOpen} onValueChange={setWeekendOpen} disabled={isLoadingHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground pt-5">to</span>
                <div className="flex-1">
                  <Label htmlFor="weekend-close" className="text-sm text-muted-foreground">Close</Label>
                  <Select value={weekendClose} onValueChange={setWeekendClose} disabled={isLoadingHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveBusinessHours}
              disabled={isSavingHours || isLoadingHours}
            >
              {isSavingHours ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save Business Hours</span>
            </Button>
          </CardContent>
        </Card>

        {/* Early/Late Fee Settings */}
        <EarlyLateFeeSettings />


        {/* Business Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Business Timezone
            </CardTitle>
            <CardDescription>
              Set the timezone used for displaying times throughout the staff portal.
              This affects check-in/out times, reservations, and scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-xs">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="flex gap-2">
                <Select
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSaveTimezone}
                  disabled={isSavingTimezone || isLoading}
                >
                  {isSavingTimezone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-2">Save</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                All times in the portal will be displayed in this timezone.
              </p>
            </div>
          </CardContent>
        </Card>

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
                  disabled={isSavingInactivity || isLoading}
                >
                  {isSavingInactivity ? (
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
