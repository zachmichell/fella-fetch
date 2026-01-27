import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LodgingDraggableCell } from './LodgingDraggableCell';

interface LodgingDropZoneProps {
  reservations: BoardingReservation[];
  date: Date;
  suiteId: string | null;
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
        "space-y-1 min-h-[60px] rounded transition-all p-0.5",
        showDropIndicator && "border-2 border-dashed border-primary/50 bg-primary/10"
      )}
    >
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
