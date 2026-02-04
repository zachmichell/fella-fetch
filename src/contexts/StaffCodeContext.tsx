import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type StaffCodeRole = 'basic' | 'supervisor' | 'admin';

interface StaffCode {
  id: string;
  name: string;
  code: string;
  role: StaffCodeRole;
  is_active: boolean;
}

interface StaffCodeContextType {
  currentStaff: StaffCode | null;
  isLocked: boolean;
  staffRole: StaffCodeRole | null;
  isCodeAdmin: boolean;
  isSupervisorOrAbove: boolean;
  unlockWithCode: (code: string) => Promise<boolean>;
  lock: () => void;
  resetInactivityTimer: () => void;
}

const StaffCodeContext = createContext<StaffCodeContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 60 * 1000; // 60 seconds
const SESSION_KEY = 'staff_code_session';

export function StaffCodeProvider({ children }: { children: ReactNode }) {
  const { isStaffOrAdmin } = useAuth();
  const [currentStaff, setCurrentStaff] = useState<StaffCode | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const staffRole = currentStaff?.role ?? null;
  const isCodeAdmin = staffRole === 'admin';
  const isSupervisorOrAbove = staffRole === 'admin' || staffRole === 'supervisor';

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedStaffId = sessionStorage.getItem(SESSION_KEY);
      if (savedStaffId) {
        try {
          const { data, error } = await supabase
            .from('staff_codes')
            .select('*')
            .eq('id', savedStaffId)
            .eq('is_active', true)
            .single();

          if (!error && data) {
            setCurrentStaff(data);
            setIsLocked(false);
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setInitialized(true);
    };

    restoreSession();
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
    setCurrentStaff(null);
    sessionStorage.removeItem(SESSION_KEY);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      lock();
    }, INACTIVITY_TIMEOUT);
  }, [lock]);

  const resetInactivityTimer = useCallback(() => {
    if (!isLocked && currentStaff) {
      startInactivityTimer();
    }
  }, [isLocked, currentStaff, startInactivityTimer]);

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
      sessionStorage.setItem(SESSION_KEY, data.id);
      startInactivityTimer();
      return true;
    } catch {
      return false;
    }
  }, [startInactivityTimer]);

  // Set up activity listeners - resets the inactivity timer on user interaction
  useEffect(() => {
    if (!isStaffOrAdmin || isLocked || !currentStaff) return;

    const handleActivity = () => {
      startInactivityTimer();
    };

    // Start the initial timer
    startInactivityTimer();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isStaffOrAdmin, isLocked, currentStaff, startInactivityTimer]);

  // Don't render children until we've checked for an existing session
  if (!initialized) {
    return null;
  }

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
