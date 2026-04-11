import { Check, User, Sparkles, CalendarSearch } from "lucide-react";
import { format } from "date-fns";

interface Groomer {
  id: string;
  name: string;
  color: string | null;
  bio: string | null;
}

interface GroomerSchedule {
  groomer_id: string;
  available_date: string;
}

interface GroomerSelectorProps {
  groomers: Groomer[];
  selectedGroomerId: string | null;
  onSelect: (groomerId: string | null) => void;
  loading?: boolean;
  schedules?: GroomerSchedule[];
  showNextAvailable?: boolean;
  onFindNextAvailable?: () => void;
  nextAvailableDate?: string | null;
  nextAvailableGroomers?: string[];
}

export const GroomerSelector = ({
  groomers,
  selectedGroomerId,
  onSelect,
  loading = false,
  schedules = [],
  showNextAvailable = false,
  onFindNextAvailable,
  nextAvailableDate,
  nextAvailableGroomers = [],
}: GroomerSelectorProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Filter groomers to show when "next available" was clicked
  const displayGroomers = showNextAvailable && nextAvailableGroomers.length > 0
    ? groomers.filter(g => nextAvailableGroomers.includes(g.id))
    : groomers;

  return (
    <div className="space-y-3">
      {/* Find Next Available Date Option */}
      {!showNextAvailable ? (
        <button
          onClick={() => onFindNextAvailable?.()}
          className="w-full p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card flex items-center gap-4 transition-all text-left"
        >
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
          >
            <CalendarSearch className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">Find Next Available Date</h3>
            <p className="text-sm text-muted-foreground">
              See which groomers are available soonest
            </p>
          </div>
        </button>
      ) : nextAvailableDate ? (
        <div className="p-4 rounded-2xl bg-accent/30 border border-primary/30 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">
              Next available: {format(new Date(nextAvailableDate + 'T12:00:00'), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a groomer below to continue booking
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">No available dates found. Please try again later.</p>
        </div>
      )}

      {/* Individual Groomers */}
      {displayGroomers.map((groomer) => {
        const isSelected = selectedGroomerId === groomer.id;
        return (
          <button
            key={groomer.id}
            onClick={() => onSelect(groomer.id)}
            className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all text-left ${
              isSelected
                ? "border-primary bg-accent/30"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: groomer.color || '#3b82f6' }}
            >
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg">{groomer.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {groomer.bio || 'Professional groomer'}
              </p>
            </div>
            {isSelected && (
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};
