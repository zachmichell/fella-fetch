import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StaffCode {
  id: string;
  name: string;
  code: string;
  is_admin: boolean;
  is_active: boolean;
}

interface StaffCodeContextType {
  currentStaff: StaffCode | null;
  isLocked: boolean;
  isCodeAdmin: boolean;
  unlockWithCode: (code: string) => Promise<boolean>;
  lock: () => void;
  resetInactivityTimer: () => void;
}

const StaffCodeContext = createContext<StaffCodeContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 60 * 1000; // 60 seconds

export function StaffCodeProvider({ children }: { children: ReactNode }) {
  const { isStaffOrAdmin } = useAuth();
  const [currentStaff, setCurrentStaff] = useState<StaffCode | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  const isCodeAdmin = currentStaff?.is_admin ?? false;

  const lock = useCallback(() => {
    setIsLocked(true);
    setCurrentStaff(null);
  }, []);

  // Placeholder for external reset calls (activity listeners handle this internally)
  const resetInactivityTimer = useCallback(() => {
    // No-op: timer is managed internally by the activity listener effect
  }, []);

  const unlockWithCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('staff_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      setCurrentStaff(data);
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Set up activity listeners - resets the inactivity timer on user interaction
  useEffect(() => {
    if (!isStaffOrAdmin || isLocked || !currentStaff) return;

    let timer: NodeJS.Timeout | null = null;
    
    const startTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lock();
      }, INACTIVITY_TIMEOUT);
    };

    const handleActivity = () => {
      startTimer();
    };

    // Start the initial timer
    startTimer();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isStaffOrAdmin, isLocked, currentStaff, lock]);

  return (
    <StaffCodeContext.Provider
      value={{
        currentStaff,
        isLocked,
        isCodeAdmin,
        unlockWithCode,
        lock,
        resetInactivityTimer,
      }}
    >
      {children}
    </StaffCodeContext.Provider>
  );
}

export function useStaffCode() {
  const context = useContext(StaffCodeContext);
  if (context === undefined) {
    throw new Error('useStaffCode must be used within a StaffCodeProvider');
  }
  return context;
}
