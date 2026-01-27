import { useState } from 'react';
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
  onDragEnd: () => void;
  isUnassigned?: boolean;
  onHoverZone: (suiteId: string | null) => void;
  hoveredZone: string | null | undefined;
}

export const LodgingDropZone = ({
  reservations,
  date,
  suiteId,
  onPetClick,
  onAssignSuite,
  onCreateBooking,
  onDropReservation,
  draggingReservation,
  onDragStart,
  onDragEnd,
  isUnassigned = false,
  onHoverZone,
  hoveredZone,
}: LodgingDropZoneProps) => {
  const showDropIndicator = draggingReservation && 
    draggingReservation.suite_id !== suiteId;

  const isHovered = hoveredZone === suiteId;

  const handlePointerEnter = () => {
    if (draggingReservation) {
      onHoverZone(suiteId);
    }
  };

  const handlePointerLeave = () => {
    if (draggingReservation && hoveredZone === suiteId) {
      onHoverZone(undefined);
    }
  };

  if (reservations.length === 0 && !isUnassigned) {
    return (
      <div
        className={cn(
          "h-full min-h-[60px] flex items-center justify-center rounded transition-all",
          showDropIndicator && isHovered && "border-2 border-dashed border-primary bg-primary/20",
          showDropIndicator && !isHovered && "border-2 border-dashed border-muted-foreground/30 bg-muted/30",
          !showDropIndicator && "cursor-pointer hover:bg-muted/50 group"
        )}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => !draggingReservation && suiteId && onCreateBooking(suiteId, date)}
      >
        {showDropIndicator ? (
          <span className={cn(
            "text-xs font-medium",
            isHovered ? "text-primary" : "text-muted-foreground"
          )}>
            {isHovered ? "Release to drop" : "Drop here"}
          </span>
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-1 min-h-[60px] rounded transition-all p-0.5",
        showDropIndicator && isHovered && "border-2 border-dashed border-primary bg-primary/20",
        showDropIndicator && !isHovered && "border-2 border-dashed border-muted-foreground/30"
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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
        <div className={cn(
          "text-xs text-center font-medium py-1",
          isHovered ? "text-primary" : "text-muted-foreground"
        )}>
          {isHovered ? "+ Release to add" : "+ Add here"}
        </div>
      )}
    </div>
  );
};
