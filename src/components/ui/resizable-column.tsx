import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableColumnProps {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
}

export const ResizableColumn = ({
  width,
  minWidth = 60,
  maxWidth = 400,
  onResize,
  children,
  className,
  isHeader = false,
}: ResizableColumnProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const diff = e.clientX - startX.current;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + diff));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minWidth, maxWidth, onResize]);

  return (
    <div
      ref={columnRef}
      className={cn('relative flex-shrink-0', className)}
      style={{ width }}
    >
      {children}
      {isHeader && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};

interface UseColumnWidthsOptions {
  columns: { key: string; defaultWidth: number }[];
  storageKey?: string;
}

export const useColumnWidths = ({ columns, storageKey }: UseColumnWidthsOptions) => {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        // Ignore errors
      }
    }
    return columns.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultWidth }), {});
  });

  const setWidth = useCallback((key: string, width: number) => {
    setWidths(prev => {
      const next = { ...prev, [key]: width };
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  }, [storageKey]);

  return { widths, setWidth };
};
