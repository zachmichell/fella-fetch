import { format, formatDistanceToNow } from 'date-fns';
import {
  LogIn,
  LogOut,
  Utensils,
  Pill,
  Clock,
  Activity,
  Scissors,
  FileText,
  Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useReservationTimeline, type TimelineEvent } from '@/hooks/useReservationTimeline';

interface ClientActivityTimelineProps {
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
  grooming: Scissors,
};

const categoryColors: Record<string, string> = {
  check_in: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400',
  check_out: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
  feeding: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400',
  medication: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-400',
  service: 'text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400',
  grooming: 'text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400',
  general: 'text-muted-foreground bg-muted',
};

export function ClientActivityTimeline({ reservationId, petId }: ClientActivityTimelineProps) {
  const { data: events = [], isLoading } = useReservationTimeline(reservationId, petId);

  if (isLoading) {
    return (
      <div className="mt-3 pt-3 border-t space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Activity Log
        </p>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Activity Log ({events.length})
      </p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {events.map((event) => {
          const Icon = categoryIcons[event.category] || Activity;
          const colorClass = categoryColors[event.category] || categoryColors.general;

          return (
            <div
              key={event.id}
              className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50"
            >
              <div className={`shrink-0 mt-0.5 rounded-full p-1 ${colorClass}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{event.description}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  by {event.performedBy} · {format(new Date(event.timestamp), 'h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
