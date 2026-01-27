import { BoardingReservation } from '@/pages/staff/StaffLodgingCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, User, ArrowRightLeft, LogIn, LogOut, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { motion, PanInfo } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface LodgingDraggableCellProps {
  reservation: BoardingReservation;
  date: Date;
  onPetClick: (reservation: BoardingReservation) => void;
  onAssignSuite: (reservation: BoardingReservation) => void;
  isUnassigned?: boolean;
  onDragStart: (reservation: BoardingReservation) => void;
  onDragEnd: (reservation: BoardingReservation, targetSuiteId: string | null | undefined) => void;
}

export const LodgingDraggableCell = ({
  reservation,
  date,
  onPetClick,
  onAssignSuite,
  isUnassigned = false,
  onDragStart,
  onDragEnd,
}: LodgingDraggableCellProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const pointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Track pointer position globally when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      pointerPos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [isDragging]);

  const handleCheckIn = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: 'Checked in',
        description: `${reservation.pet_name} has been checked in`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in',
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'checked_out',
          checked_out_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: 'Checked out',
        description: `${reservation.pet_name} has been checked out`,
      });

      queryClient.invalidateQueries({ queryKey: ['boarding-reservations'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out',
        variant: 'destructive',
      });
    }
  };

  const isStartDay = isSameDay(parseISO(reservation.start_date), date);
  const isEndDay = reservation.end_date && isSameDay(parseISO(reservation.end_date), date);

  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart(reservation);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Check if this was actually a drag (moved more than 10px)
    const wasDragged = Math.abs(info.offset.x) > 10 || Math.abs(info.offset.y) > 10;
    
    if (!wasDragged) {
      onDragEnd(reservation, undefined);
      return;
    }

    // Use the tracked pointer position
    const { x: clientX, y: clientY } = pointerPos.current;

    // Temporarily hide the dragged element to find what's underneath
    if (dragRef.current) {
      dragRef.current.style.pointerEvents = 'none';
    }
    
    const elementAtPoint = document.elementFromPoint(clientX, clientY);
    
    if (dragRef.current) {
      dragRef.current.style.pointerEvents = '';
    }

    // Find the drop zone by traversing up from the element at point
    const dropZone = elementAtPoint?.closest('[data-suite-id]') as HTMLElement | null;
    
    if (dropZone) {
      const targetSuiteId = dropZone.dataset.suiteId;
      // Handle 'null' string for unassigned zone
      const suiteId = targetSuiteId === 'null' ? null : targetSuiteId;
      onDragEnd(reservation, suiteId);
    } else {
      onDragEnd(reservation, undefined);
    }
  };

  const handleClick = () => {
    // Only trigger click if we weren't dragging
    if (!isDragging) {
      onPetClick(reservation);
    }
  };

  return (
    <motion.div
      ref={dragRef}
      drag
      dragSnapToOrigin
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={{ cursor: 'grab' }}
      whileDrag={{ 
        scale: 1.05, 
        zIndex: 100, 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        cursor: 'grabbing',
      }}
      className={cn(
        "p-2 rounded transition-colors min-h-[50px] relative touch-none select-none",
        reservation.status === 'checked_in' && "bg-green-100 dark:bg-green-900/30",
        reservation.status === 'confirmed' && "bg-blue-100 dark:bg-blue-900/30",
        reservation.status === 'checked_out' && "bg-gray-100 dark:bg-gray-800",
        isUnassigned && "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700"
      )}
      style={{ cursor: 'grab' }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0" onClick={handleClick}>
            <div className="font-medium text-sm truncate">{reservation.pet_name}</div>
            <div className="text-xs text-muted-foreground truncate">{reservation.client_name}</div>
            
            <div className="flex flex-wrap gap-1 mt-1">
              {isStartDay && (
                <Badge variant="outline" className="text-xs py-0">
                  Arrives
                </Badge>
              )}
              {isEndDay && (
                <Badge variant="outline" className="text-xs py-0">
                  Departs
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPetClick(reservation); }}>
              <User className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignSuite(reservation); }}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {reservation.suite_id ? 'Move Suite' : 'Assign Suite'}
            </DropdownMenuItem>

            {reservation.status === 'confirmed' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCheckIn(); }}>
                <LogIn className="h-4 w-4 mr-2" />
                Check In
              </DropdownMenuItem>
            )}

            {reservation.status === 'checked_in' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCheckOut(); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Check Out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};
