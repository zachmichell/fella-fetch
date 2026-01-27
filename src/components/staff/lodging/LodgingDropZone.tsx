import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LodgingDraggableCell } from './LodgingDraggableCell';
import { parseISO, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface LodgingDropZoneProps {
  reservations: BoardingReservation[];
  date: Date;
  suiteId: string | null;
  capacity?: number;
  onPetClick: (reservation: BoardingReservation) => void;
  onAssignSuite: (reservation: BoardingReservation) => void;
  onCreateBooking: (suiteId: string, date: Date) => void;
  onDropReservation: (reservation: BoardingReservation, targetSuiteId: string | null) => void;
  draggingReservation: BoardingReservation | null;
  onDragStart: (reservation: BoardingReservation) => void;
  onDragEnd: (reservation: BoardingReservation, targetSuiteId: string | null | undefined) => void;
  isUnassigned?: boolean;
}

export const LodgingDropZone = ({
  reservations,
  date,
  suiteId,
  capacity = 1,
  onPetClick,
  onAssignSuite,
  onCreateBooking,
  draggingReservation,
  onDragStart,
  onDragEnd,
  isUnassigned = false,
}: LodgingDropZoneProps) => {
  const showDropIndicator = draggingReservation && 
    draggingReservation.suite_id !== suiteId;

  // Calculate actual occupancy (departing pets don't count on their departure day)
  const actualOccupancy = reservations.filter((r) => {
    const endDate = r.end_date ? parseISO(r.end_date) : null;
    // If pet is departing today, don't count them toward capacity
    if (endDate && isSameDay(endDate, date)) {
      return false;
    }
    return true;
  }).length;

  const isOverCapacity = !isUnassigned && actualOccupancy > capacity;

  if (reservations.length === 0 && !isUnassigned) {
    return (
      <div
        data-suite-id={suiteId === null ? 'null' : suiteId}
        className={cn(
          "h-full min-h-[60px] flex items-center justify-center rounded transition-all",
          showDropIndicator && "border-2 border-dashed border-primary/50 bg-primary/10",
          !showDropIndicator && "cursor-pointer hover:bg-muted/50 group"
        )}
        onClick={() => !draggingReservation && suiteId && onCreateBooking(suiteId, date)}
      >
        {showDropIndicator ? (
          <span className="text-xs font-medium text-primary">Drop here</span>
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <div
      data-suite-id={suiteId === null ? 'null' : suiteId}
      className={cn(
        "space-y-1 min-h-[60px] rounded transition-all p-0.5 relative",
        showDropIndicator && "border-2 border-dashed border-primary/50 bg-primary/10",
        isOverCapacity && "bg-destructive/10 border border-destructive/30"
      )}
    >
      {isOverCapacity && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 z-10 text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5"
        >
          <AlertTriangle className="h-3 w-3" />
          {actualOccupancy}/{capacity}
        </Badge>
      )}
      {reservations.map((reservation) => (
        <LodgingDraggableCell
          key={reservation.id}
          reservation={reservation}
          date={date}
          onPetClick={onPetClick}
          onAssignSuite={onAssignSuite}
          isUnassigned={isUnassigned}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
      {showDropIndicator && reservations.length > 0 && (
        <div className="text-xs text-center font-medium text-primary py-1">
          + Drop to add
        </div>
      )}
    </div>
  );
};
