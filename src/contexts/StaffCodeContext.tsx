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
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  const isCodeAdmin = currentStaff?.is_admin ?? false;

  const lock = useCallback(() => {
    setIsLocked(true);
    setCurrentStaff(null);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    if (!isLocked && currentStaff) {
      const timer = setTimeout(() => {
        lock();
      }, INACTIVITY_TIMEOUT);
      setInactivityTimer(timer);
    }
  }, [inactivityTimer, isLocked, currentStaff, lock]);

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

  // Set up activity listeners
  useEffect(() => {
    if (!isStaffOrAdmin) return;

    const handleActivity = () => {
      resetInactivityTimer();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [isStaffOrAdmin, resetInactivityTimer, inactivityTimer]);

  // Start inactivity timer when unlocked
  useEffect(() => {
    if (!isLocked && currentStaff) {
      resetInactivityTimer();
    }
  }, [isLocked, currentStaff, resetInactivityTimer]);

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
