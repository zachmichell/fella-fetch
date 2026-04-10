import { useState } from 'react';
import { useVisitCareLogs } from '@/hooks/useVisitCareLogs';
import { VisitCareLogList } from '@/components/client/VisitCareLogList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dog,
  Pencil,
  X,
  Save,
  Calendar,
  Clock,
  User,
  Scissors,
  DollarSign,
  Repeat,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { PetTraitBadges } from './PetTraitBadges';
import { type ControlCenterReservation } from './ControlCenterTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReservationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ControlCenterReservation;
  onUpdated?: () => void;
  initialEdit?: boolean;
}

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const statusLabels: Record<string, string> = {
  pending: 'Requested',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  checked_in: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  checked_out: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const serviceTypeLabels: Record<string, string> = {
  daycare: 'Daycare',
  boarding: 'Boarding',
  grooming: 'Grooming',
  training: 'Training',
};

const serviceTypeColors: Record<string, string> = {
  daycare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  boarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grooming: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  training: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function ReservationDetailsDialog({
  open,
  onOpenChange,
  reservation,
  onUpdated,
  initialEdit = false,
}: ReservationDetailsDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isSaving, setIsSaving] = useState(false);

  const [editData, setEditData] = useState({
    start_date: reservation.start_date,
    end_date: reservation.end_date || '',
    start_time: reservation.start_time || '',
    end_time: reservation.end_time || '',
    notes: reservation.notes || '',
    service_type: reservation.service_type,
  });

  const handleStartEdit = () => {
    setEditData({
      start_date: reservation.start_date,
      end_date: reservation.end_date || '',
      start_time: reservation.start_time || '',
      end_time: reservation.end_time || '',
      notes: reservation.notes || '',
      service_type: reservation.service_type,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          start_date: editData.start_date,
          end_date: editData.end_date || null,
          start_time: editData.start_time || null,
          end_time: editData.end_time || null,
          notes: editData.notes || null,
          service_type: editData.service_type as any,
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({ title: 'Reservation updated successfully' });
      setIsEditing(false);
      onUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error updating reservation',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isHalfDay = reservation.notes?.toLowerCase().includes('half day');
  const serviceLabel = reservation.service_type === 'daycare'
    ? (isHalfDay ? 'Daycare | Half Day' : 'Daycare | Full Day')
    : serviceTypeLabels[reservation.service_type] || reservation.service_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Reservation Details</span>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {/* Pet & Owner Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={reservation.pet_photo_url || undefined} alt={reservation.pet_name} />
              <AvatarFallback className="bg-muted">
                <Dog className="h-7 w-7 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">{reservation.pet_name}</h3>
                {reservation.pet_breed && (
                  <span className="text-sm text-muted-foreground">({reservation.pet_breed})</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <User className="h-3.5 w-3.5" />
                <span>{reservation.client_name}</span>
              </div>
              <PetTraitBadges traits={reservation.pet_traits || []} maxDisplay={8} />
            </div>
          </div>

          <Separator />

          {/* Status & Service Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
              <div className="mt-1">
                <Badge className={statusColors[reservation.status] || ''}>
                  {statusLabels[reservation.status] || reservation.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Service Type</Label>
              <div className="mt-1">
                {isEditing ? (
                  <Select
                    value={editData.service_type}
                    onValueChange={(v) => setEditData(prev => ({ ...prev, service_type: v }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daycare">Daycare</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                      <SelectItem value="grooming">Grooming</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className={serviceTypeColors[reservation.service_type] || ''}>
                      {serviceLabel}
                    </Badge>
                    {reservation.subscription_id && (
                      <span title="Recurring subscription">
                        <Repeat className="h-4 w-4 text-primary" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </Label>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={editData.start_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={editData.end_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={editData.start_time}
                    onChange={(e) => setEditData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={editData.end_time}
                    onChange={(e) => setEditData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Start</div>
                  <div className="font-medium text-sm">
                    {format(parseLocalDate(reservation.start_date), 'MMM d, yyyy')}
                  </div>
                  {reservation.start_time && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {reservation.start_time.slice(0, 5)}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground mb-1">End</div>
                  <div className="font-medium text-sm">
                    {reservation.end_date
                      ? format(parseLocalDate(reservation.end_date), 'MMM d, yyyy')
                      : format(parseLocalDate(reservation.start_date), 'MMM d, yyyy')}
                  </div>
                  {reservation.end_time && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {reservation.end_time.slice(0, 5)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Check-in/Check-out Times */}
          {(reservation.checked_in_at || reservation.checked_out_at) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {reservation.checked_in_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Checked In</Label>
                    <div className="text-sm mt-1">
                      {format(new Date(reservation.checked_in_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                )}
                {reservation.checked_out_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Checked Out</Label>
                    <div className="text-sm mt-1">
                      {format(new Date(reservation.checked_out_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Credits */}
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Client Credits
            </Label>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <div className={`text-lg font-semibold ${reservation.daycare_credits <= 0 ? 'text-destructive' : ''}`}>
                  {reservation.daycare_credits}
                </div>
                <div className="text-xs text-muted-foreground">Full Day</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${reservation.half_daycare_credits <= 0 ? 'text-destructive' : ''}`}>
                  {reservation.half_daycare_credits}
                </div>
                <div className="text-xs text-muted-foreground">Half Day</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${reservation.boarding_credits <= 0 ? 'text-destructive' : ''}`}>
                  {reservation.boarding_credits}
                </div>
                <div className="text-xs text-muted-foreground">Boarding</div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {reservation.payment_pending && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Payment Pending
                </Badge>
              </div>
            </>
          )}

          {/* Linked Services */}
          {reservation.linked_services && reservation.linked_services.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Scissors className="h-3.5 w-3.5" />
                  Linked Services
                </Label>
                <div className="space-y-2 mt-2">
                  {reservation.linked_services.map((service) => {
                    const serviceMatch = service.notes?.match(/Groom Type:\s*([^|]+)/i);
                    const serviceName = serviceMatch ? serviceMatch[1].trim() : 'Grooming';
                    return (
                      <div key={service.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">
                            <Scissors className="h-3 w-3 mr-1" />
                            {serviceName}
                          </Badge>
                          <Badge className={statusColors[service.status] || ''}>
                            {statusLabels[service.status] || service.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 mt-2 text-muted-foreground">
                          {service.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.start_time.slice(0, 5)}
                              {service.end_time && ` – ${service.end_time.slice(0, 5)}`}
                            </span>
                          )}
                          {service.groomer_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {service.groomer_name}
                            </span>
                          )}
                          {service.price != null && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${service.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {service.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5">{service.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </Label>
            {isEditing ? (
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="mt-2"
                placeholder="Add notes..."
              />
            ) : (
              <p className="text-sm mt-1.5 whitespace-pre-wrap">
                {reservation.notes || <span className="text-muted-foreground italic">No notes</span>}
              </p>
            )}
          </div>

          {/* Care Activity Logs */}
          <CareLogsSection petId={reservation.pet_id} reservationId={reservation.id} />
        </div>

        {/* Edit action buttons */}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
