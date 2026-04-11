import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { CalendarHeart, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
];

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  name: string;
  closed: boolean;
  open?: string;
  close?: string;
}

export function HolidayHoursManager() {
  const { toast } = useToast();
  const { getSetting, updateSetting, isLoading, settings } = useSystemSettings();
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // New holiday form
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!isLoading && settings && !initialized) {
      const saved = getSetting<HolidayEntry[]>('holiday_hours', []);
      setHolidays(saved);
      setInitialized(true);
    }
  }, [isLoading, settings, initialized]);

  const addHoliday = () => {
    if (!newDate || !newName.trim()) {
      toast({ title: 'Please enter a date and name', variant: 'destructive' });
      return;
    }
    if (holidays.some(h => h.date === newDate)) {
      toast({ title: 'This date already has a holiday entry', variant: 'destructive' });
      return;
    }
    setHolidays(prev => [...prev, {
      date: newDate,
      name: newName.trim(),
      closed: true,
    }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate('');
    setNewName('');
    setHasChanges(true);
  };

  const removeHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
    setHasChanges(true);
  };

  const updateHoliday = (date: string, updates: Partial<HolidayEntry>) => {
    setHolidays(prev => prev.map(h => h.date === date ? { ...h, ...updates } : h));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: 'holiday_hours',
        value: holidays,
        description: 'Holiday dates with custom hours or closures',
      });
      toast({ title: 'Holiday hours saved' });
      setHasChanges(false);
    } catch {
      toast({ title: 'Error saving', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return format(new Date(y, m - 1, d), 'MMM d, yyyy (EEEE)');
    } catch {
      return dateStr;
    }
  };

  if (!initialized && isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarHeart className="h-5 w-5 text-rose-500" />
              Holiday Hours
            </CardTitle>
            <CardDescription>
              Set holidays with adjusted hours or full closures. Clients won't be able to book outside these hours on holiday dates.
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new holiday */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <Label className="text-xs">Holiday Name</Label>
            <Input
              placeholder="e.g. Christmas Day"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHoliday()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={addHoliday} disabled={!newDate || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Holiday list */}
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">No holidays configured</p>
        ) : (
          <div className="space-y-3">
            {holidays.map(holiday => (
              <div key={holiday.date} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateLabel(holiday.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Closed</Label>
                      <Switch
                        checked={holiday.closed}
                        onCheckedChange={closed => updateHoliday(holiday.date, {
                          closed,
                          open: closed ? undefined : '9:00 AM',
                          close: closed ? undefined : '3:00 PM',
                        })}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeHoliday(holiday.date)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!holiday.closed && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Open</Label>
                      <Select value={holiday.open || '9:00 AM'} onValueChange={open => updateHoliday(holiday.date, { open })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-muted-foreground pt-4">to</span>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Close</Label>
                      <Select value={holiday.close || '3:00 PM'} onValueChange={close => updateHoliday(holiday.date, { close })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
