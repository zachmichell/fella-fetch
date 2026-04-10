import { format } from 'date-fns';
import {
  LogIn,
  LogOut,
  Pencil,
  Utensils,
  Pill,
  Plus,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  Activity,
  Scissors,
  User,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useReservationTimeline, type TimelineEvent } from '@/hooks/useReservationTimeline';

interface ReservationTimelineProps {
  reservationId: string;
  petId: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  check_in: LogIn,
  check_out: LogOut,
  reservation: Pencil,
  feeding: Utensils,
  medication: Pill,
  service: Scissors,
  general: FileText,
  profile: User,
  report_card: FileText,
  grooming: Scissors,
};

const categoryColors: Record<string, string> = {
  check_in: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400',
  check_out: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
  reservation: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
  feeding: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400',
  medication: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-400',
  service: 'text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400',
  general: 'text-muted-foreground bg-muted',
};

function TimelineItem({ event }: { event: TimelineEvent }) {
  const Icon = categoryIcons[event.category] || Activity;
  const colorClass = categoryColors[event.category] || categoryColors.general;

  return (
    <div className="flex gap-3 text-sm">
      <div className="flex flex-col items-center">
        <div className={`rounded-full p-1.5 shrink-0 ${colorClass}`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <p className="text-sm leading-snug">{event.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(event.timestamp), 'MMM d, h:mm a')}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {event.performedBy}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReservationTimeline({ reservationId, petId }: ReservationTimelineProps) {
  const { data: events = [], isLoading } = useReservationTimeline(reservationId, petId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          Activity Log
        </Label>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          Activity Log
        </Label>
        <p className="text-xs text-muted-foreground text-center py-3">
          No activity logged for this reservation yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-3">
        <Activity className="h-3.5 w-3.5" />
        Activity Log ({events.length})
      </Label>
      <div className="max-h-48 overflow-y-auto">
        {events.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
