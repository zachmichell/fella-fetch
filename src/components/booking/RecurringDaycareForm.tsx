import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Check, ChevronLeft, Repeat, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecurringDaycareFormProps {
  clientId: string;
  petId: string;
  petName: string;
  daycareType: 'full' | 'half';
  onBack: () => void;
  onSuccess: () => void;
}

type HalfDayPeriod = 'morning' | 'afternoon';
type Step = 'period' | 'days' | 'endDate' | 'confirm';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export function RecurringDaycareForm({
  clientId,
  petId,
  petName,
  daycareType,
  onBack,
  onSuccess,
}: RecurringDaycareFormProps) {
  const [step, setStep] = useState<Step>(daycareType === 'half' ? 'period' : 'days');
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('morning');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('daycare_subscriptions' as any)
        .insert({
          client_id: clientId,
          pet_id: petId,
          day_type: daycareType,
          half_day_period: daycareType === 'half' ? halfDayPeriod : null,
          days_of_week: selectedDays,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          notes: notes || null,
          is_active: true,
          is_approved: false,
        });

      if (error) throw error;

      toast.success('Recurring daycare subscription requested!', {
        description: 'We\'ll confirm your subscription shortly.',
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to submit subscription request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Repeat className="w-5 h-5" />
        <h2 className="font-display text-xl font-semibold">Recurring Daycare for {petName}</h2>
      </div>
      
      <p className="text-muted-foreground">
        Set up a weekly recurring {daycareType === 'half' ? 'half day' : 'full day'} daycare schedule.
      </p>

      {/* Step 1: Half Day Period Selection (only for half day) */}
      {step === 'period' && daycareType === 'half' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="font-medium">Select Half Day Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setHalfDayPeriod('morning');
                setStep('days');
              }}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${
                halfDayPeriod === 'morning'
                  ? 'border-primary bg-accent/30'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Morning</p>
              <p className="text-sm text-muted-foreground">Until 12:00 PM</p>
            </button>
            <button
              onClick={() => {
                setHalfDayPeriod('afternoon');
                setStep('days');
              }}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${
                halfDayPeriod === 'afternoon'
                  ? 'border-primary bg-accent/30'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <Clock className="h-6 w-6 mx-auto mb-2 text-secondary-foreground" />
              <p className="font-semibold">Afternoon</p>
              <p className="text-sm text-muted-foreground">1:00 PM onwards</p>
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Day Selection */}
      {step === 'days' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="font-medium">Select Days of the Week</h3>
          <p className="text-sm text-muted-foreground">
            Choose which days {petName} will attend daycare each week.
          </p>
          
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedDays.includes(day.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <p className="font-medium text-sm">{day.short}</p>
              </button>
            ))}
          </div>

          {selectedDays.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedDays.map((day) => {
                const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                return (
                  <Badge key={day} variant="secondary" className="text-sm">
                    {dayInfo?.label}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="pt-4">
            <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
            <Textarea
              placeholder="Any special instructions for recurring visits..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => daycareType === 'half' ? setStep('period') : onBack()}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button 
              onClick={() => setStep('endDate')}
              disabled={selectedDays.length === 0}
              className="flex-1"
            >
              Next: Set End Date
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: End Date Selection */}
      {step === 'endDate' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="font-medium">Subscription End Date (Optional)</h3>
          <p className="text-sm text-muted-foreground">
            Set when you'd like this subscription to end, or leave empty to continue indefinitely.
          </p>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "No end date (ongoing)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {endDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setEndDate(undefined)}
              className="text-muted-foreground"
            >
              Clear end date
            </Button>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setStep('days')}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button 
              onClick={() => setStep('confirm')}
              className="flex-1"
            >
              Review Subscription
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Confirmation */}
      {step === 'confirm' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="font-medium">Confirm Subscription</h3>
          
          <div className="bg-muted/50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pet:</span>
              <span className="font-medium">{petName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">
                {daycareType === 'full' ? 'Full Day' : `Half Day (${halfDayPeriod})`}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Days:</span>
              <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                {selectedDays.map((day) => {
                  const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                  return (
                    <Badge key={day} variant="outline" className="text-xs">
                      {dayInfo?.short}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date:</span>
              <span className="font-medium">
                {endDate ? format(endDate, "PPP") : "No end date (ongoing)"}
              </span>
            </div>
            {notes && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm">Notes:</span>
                <p className="text-sm mt-1">{notes}</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Your subscription request will be pending until approved by our staff. 
              Once approved, daycare reservations will be automatically scheduled each week.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setStep('endDate')}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Subscription Request
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
