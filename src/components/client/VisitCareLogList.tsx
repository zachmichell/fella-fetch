import { format, formatDistanceToNow } from 'date-fns';
import { Utensils, Pill, Clock } from 'lucide-react';
import { CareLogEntry } from '@/hooks/useVisitCareLogs';
import { Skeleton } from '@/components/ui/skeleton';

interface VisitCareLogListProps {
  logs: CareLogEntry[];
  isLoading: boolean;
}

export function VisitCareLogList({ logs, isLoading }: VisitCareLogListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-3 pt-3 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground text-center py-2">
          No care activities logged yet
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Recent Care Activity
      </p>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {logs.slice(0, 5).map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50"
          >
            <div className="shrink-0 mt-0.5">
              {log.log_type === 'feeding' ? (
                <Utensils className="h-3.5 w-3.5 text-orange-500" />
              ) : (
                <Pill className="h-3.5 w-3.5 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">
                  {log.reference_name}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(log.administered_at), { addSuffix: true })}
                </span>
              </div>
              {(log.amount_given || log.amount_taken) && (
                <p className="text-muted-foreground">
                  {log.amount_given && `Given: ${log.amount_given}`}
                  {log.amount_given && log.amount_taken && ' • '}
                  {log.amount_taken && `Taken: ${log.amount_taken}`}
                </p>
              )}
              {log.notes && (
                <p className="text-muted-foreground truncate">{log.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
