import { useState, useCallback } from 'react';
import { useStaffCode } from '@/contexts/StaffCodeContext';
import { Button } from '@/components/ui/button';
import { Dog, Delete, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StaffCodeLock() {
  const { isLocked, unlockWithCode } = useStaffCode();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (code.length < 4) {
      const newCode = code + digit;
      setCode(newCode);
      setError(false);

      if (newCode.length === 4) {
        // Auto-submit when 4 digits entered
        unlockWithCode(newCode).then((success) => {
          if (!success) {
            setError(true);
            setIsShaking(true);
            setTimeout(() => {
              setCode('');
              setIsShaking(false);
            }, 500);
          }
        });
      }
    }
  }, [code, unlockWithCode]);

  const handleBackspace = useCallback(() => {
    setCode(code.slice(0, -1));
    setError(false);
  }, [code]);

  const handleClear = useCallback(() => {
    setCode('');
    setError(false);
  }, []);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-2xl bg-primary text-primary-foreground">
            <Dog className="h-10 w-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Fella & Fetch</h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
              <Lock className="h-4 w-4" />
              Enter your staff code
            </p>
          </div>
        </div>

        {/* Code Display */}
        <div className={cn(
          "flex justify-center gap-3 transition-transform",
          isShaking && "animate-shake"
        )}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors",
                code.length > i 
                  ? error 
                    ? "border-destructive bg-destructive/10" 
                    : "border-primary bg-primary/10"
                  : "border-muted bg-muted/50"
              )}
            >
              {code.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">
            Invalid code. Please try again.
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-sm"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => handleDigit('0')}
          >
            0
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16"
            onClick={handleBackspace}
          >
            <Delete className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
