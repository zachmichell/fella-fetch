import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { getTraitIcon, getTraitColor } from '@/lib/petTraitIcons';

interface AlertTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
  is_alert: boolean;
}

interface TraitAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  alertTraits: AlertTrait[];
  onAcknowledge: () => void;
}

export function TraitAlertDialog({
  open,
  onOpenChange,
  petName,
  alertTraits,
  onAcknowledge,
}: TraitAlertDialogProps) {
  const handleAcknowledge = () => {
    onOpenChange(false);
    onAcknowledge();
  };

  if (alertTraits.length === 0) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle>Alert for {petName}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Please review the following important information:
              </p>
              <div className="space-y-2">
                {alertTraits.map((trait) => {
                  const iconDef = getTraitIcon(trait.icon_name);
                  const colorDef = getTraitColor(trait.color_key);
                  if (!iconDef || !colorDef) return null;
                  const IconComponent = iconDef.icon;

                  return (
                    <div
                      key={trait.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className={`mt-0.5 ${colorDef.textClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="text-sm text-foreground font-medium">
                        {trait.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAcknowledge}>
            I Acknowledge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
