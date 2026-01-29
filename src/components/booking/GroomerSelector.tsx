import { Check, User, Sparkles } from "lucide-react";

interface Groomer {
  id: string;
  name: string;
  color: string | null;
}

interface GroomerSelectorProps {
  groomers: Groomer[];
  selectedGroomerId: string | null;
  onSelect: (groomerId: string | null) => void;
  loading?: boolean;
}

export const GroomerSelector = ({
  groomers,
  selectedGroomerId,
  onSelect,
  loading = false,
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

  return (
    <div className="space-y-3">
      {/* Any Available Option */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all text-left ${
          selectedGroomerId === null
            ? "border-primary bg-accent/30"
            : "border-border hover:border-primary/50 bg-card"
        }`}
      >
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
        >
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">Any Available Groomer</h3>
          <p className="text-sm text-muted-foreground">
            We'll match you with the first available groomer
          </p>
        </div>
        {selectedGroomerId === null && (
          <Check className="w-5 h-5 text-primary flex-shrink-0" />
        )}
      </button>

      {/* Individual Groomers */}
      {groomers.map((groomer) => {
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
              <p className="text-sm text-muted-foreground">
                Professional groomer
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
