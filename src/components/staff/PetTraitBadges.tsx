import { getTraitIcon, getTraitColor } from '@/lib/petTraitIcons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface PetTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
  is_alert?: boolean;
}

interface PetTraitBadgesProps {
  traits: PetTrait[];
  maxDisplay?: number;
}

export function PetTraitBadges({ traits, maxDisplay = 5 }: PetTraitBadgesProps) {
  if (!traits || traits.length === 0) {
    return null;
  }

  const displayTraits = maxDisplay ? traits.slice(0, maxDisplay) : traits;
  const remainingCount = traits.length - displayTraits.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        {displayTraits.map((trait) => {
          const iconDef = getTraitIcon(trait.icon_name);
          const colorDef = getTraitColor(trait.color_key);

          if (!iconDef || !colorDef) return null;

          const IconComponent = iconDef.icon;

          return (
            <Tooltip key={trait.id}>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help">
                  <IconComponent 
                    className={`h-4 w-4 ${colorDef.textClass}`}
                    strokeWidth={2}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {trait.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center h-4 w-4 text-[10px] font-medium bg-muted text-muted-foreground rounded-full cursor-help">
                +{remainingCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {remainingCount} more trait{remainingCount > 1 ? 's' : ''}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
