import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  traitIcons,
  traitColors,
  traitCategories,
  getTraitIcon,
  getTraitColor,
  type TraitIcon,
  type TraitColor,
} from '@/lib/petTraitIcons';

interface ManagePetTraitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  onTraitsUpdated?: () => void;
}

interface ExistingTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
}

export function ManagePetTraitsDialog({
  open,
  onOpenChange,
  petId,
  petName,
  onTraitsUpdated,
}: ManagePetTraitsDialogProps) {
  const [existingTraits, setExistingTraits] = useState<ExistingTrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<TraitIcon | null>(null);
  const [selectedColor, setSelectedColor] = useState<TraitColor | null>(null);
  const [traitTitle, setTraitTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('behavior');

  // Fetch existing traits
  useEffect(() => {
    if (open && petId) {
      fetchTraits();
    }
  }, [open, petId]);

  const fetchTraits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pet_traits')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load traits');
      console.error(error);
    } else {
      setExistingTraits(data || []);
    }
    setLoading(false);
  };

  const handleAddTrait = async () => {
    if (!selectedIcon || !selectedColor || !traitTitle.trim()) {
      toast.error('Please select an icon, color, and enter a title');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('pet_traits').insert({
      pet_id: petId,
      icon_name: selectedIcon.id,
      color_key: selectedColor.key,
      title: traitTitle.trim(),
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('This icon/color combination already exists for this pet');
      } else {
        toast.error('Failed to add trait');
        console.error(error);
      }
    } else {
      toast.success('Trait added');
      setSelectedIcon(null);
      setSelectedColor(null);
      setTraitTitle('');
      fetchTraits();
      onTraitsUpdated?.();
    }
    setSaving(false);
  };

  const handleRemoveTrait = async (traitId: string) => {
    const { error } = await supabase
      .from('pet_traits')
      .delete()
      .eq('id', traitId);

    if (error) {
      toast.error('Failed to remove trait');
      console.error(error);
    } else {
      toast.success('Trait removed');
      setExistingTraits((prev) => prev.filter((t) => t.id !== traitId));
      onTraitsUpdated?.();
    }
  };

  const iconsByCategory = traitIcons.reduce(
    (acc, icon) => {
      if (!acc[icon.category]) acc[icon.category] = [];
      acc[icon.category].push(icon);
      return acc;
    },
    {} as Record<string, TraitIcon[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Manage Traits for {petName}</DialogTitle>
          <DialogDescription>
            Add icons to show traits and warnings in the Control Center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Traits */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Current Traits</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : existingTraits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No traits added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {existingTraits.map((trait) => {
                  const iconDef = getTraitIcon(trait.icon_name);
                  const colorDef = getTraitColor(trait.color_key);
                  if (!iconDef || !colorDef) return null;
                  const IconComponent = iconDef.icon;

                  return (
                    <div
                      key={trait.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md group"
                    >
                      <IconComponent className={`h-4 w-4 ${colorDef.textClass}`} />
                      <span className="text-sm">{trait.title}</span>
                      <button
                        onClick={() => handleRemoveTrait(trait.id)}
                        className="ml-1 opacity-50 group-hover:opacity-100 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Trait */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Add New Trait</Label>

            {/* Icon Selection */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                1. Select an icon
              </Label>
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="h-auto flex-wrap">
                  {Object.entries(traitCategories).map(([key, label]) => (
                    <TabsTrigger key={key} value={key} className="text-xs px-2 py-1">
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(iconsByCategory).map(([category, icons]) => (
                  <TabsContent key={category} value={category} className="mt-2">
                    <ScrollArea className="h-24">
                      <div className="flex flex-wrap gap-1">
                        {icons.map((icon) => {
                          const IconComponent = icon.icon;
                          const isSelected = selectedIcon?.id === icon.id;
                          return (
                            <button
                              key={icon.id}
                              onClick={() => {
                                setSelectedIcon(icon);
                                if (!traitTitle) setTraitTitle(icon.label);
                              }}
                              className={`p-2 rounded hover:bg-accent transition-colors ${
                                isSelected ? 'bg-primary text-primary-foreground' : ''
                              }`}
                              title={icon.label}
                            >
                              <IconComponent className="h-5 w-5" />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Color Selection */}
            {selectedIcon && (
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  2. Choose a color
                </Label>
                <div className="flex flex-wrap gap-2">
                  {traitColors.map((color) => {
                    const isSelected = selectedColor?.key === color.key;
                    const IconComponent = selectedIcon.icon;
                    return (
                      <button
                        key={color.key}
                        onClick={() => setSelectedColor(color)}
                        className={`p-2 rounded border-2 transition-all ${
                          isSelected
                            ? 'border-primary scale-110'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        title={color.label}
                      >
                        <IconComponent className={`h-5 w-5 ${color.textClass}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title Input */}
            {selectedIcon && selectedColor && (
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  3. Enter a title (shown on hover)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Needs supervision with small dogs"
                    value={traitTitle}
                    onChange={(e) => setTraitTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddTrait}
                    disabled={saving || !traitTitle.trim()}
                    className="gap-1"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Preview */}
            {selectedIcon && selectedColor && traitTitle && (
              <div className="bg-muted/50 rounded-md p-3">
                <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                <div className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = selectedIcon.icon;
                    return (
                      <IconComponent className={`h-5 w-5 ${selectedColor.textClass}`} />
                    );
                  })()}
                  <span className="text-sm">{traitTitle}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
