import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Loader2, Sparkles, Search } from 'lucide-react';
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

interface PetTraitsSectionProps {
  petId: string;
  petName: string;
}

interface ExistingTrait {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
}

interface TraitTemplate {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
}

export function PetTraitsSection({ petId, petName }: PetTraitsSectionProps) {
  const [existingTraits, setExistingTraits] = useState<ExistingTrait[]>([]);
  const [templates, setTemplates] = useState<TraitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Custom trait form state
  const [selectedIcon, setSelectedIcon] = useState<TraitIcon | null>(null);
  const [selectedColor, setSelectedColor] = useState<TraitColor | null>(null);
  const [traitTitle, setTraitTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('behavior');

  useEffect(() => {
    fetchData();
  }, [petId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [traitsRes, templatesRes] = await Promise.all([
        supabase
          .from('pet_traits')
          .select('*')
          .eq('pet_id', petId)
          .order('created_at', { ascending: true }),
        supabase
          .from('trait_templates')
          .select('*')
          .order('title', { ascending: true }),
      ]);

      if (traitsRes.error) throw traitsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setExistingTraits(traitsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load traits');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromTemplate = async (template: TraitTemplate) => {
    // Check if already exists
    const exists = existingTraits.some(
      (t) =>
        t.icon_name === template.icon_name &&
        t.color_key === template.color_key &&
        t.title === template.title
    );

    if (exists) {
      toast.error('This trait is already assigned to this pet');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('pet_traits').insert({
        pet_id: petId,
        icon_name: template.icon_name,
        color_key: template.color_key,
        title: template.title,
      });

      if (error) throw error;
      toast.success('Trait added');
      fetchData();
    } catch (error) {
      console.error('Error adding trait:', error);
      toast.error('Failed to add trait');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomTrait = async () => {
    if (!selectedIcon || !selectedColor || !traitTitle.trim()) {
      toast.error('Please select an icon, color, and enter a title');
      return;
    }

    setSaving(true);
    try {
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
          throw error;
        }
      } else {
        toast.success('Custom trait added');
        setSelectedIcon(null);
        setSelectedColor(null);
        setTraitTitle('');
        setShowCustomForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding custom trait:', error);
      toast.error('Failed to add trait');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrait = async (traitId: string) => {
    try {
      const { error } = await supabase.from('pet_traits').delete().eq('id', traitId);

      if (error) throw error;
      toast.success('Trait removed');
      setExistingTraits((prev) => prev.filter((t) => t.id !== traitId));
    } catch (error) {
      console.error('Error removing trait:', error);
      toast.error('Failed to remove trait');
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Traits & Warnings
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 space-y-4">
        {/* Current Traits */}
        {existingTraits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traits assigned yet</p>
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

        <Separator />

        {/* Quick Add from Templates */}
        {templates.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Quick add from templates
            </Label>
            {(showAllTemplates || templates.length > 5) && (
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search traits..."
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    if (e.target.value) setShowAllTemplates(true);
                  }}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(() => {
                const filtered = templates.filter(t => 
                  !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase())
                );
                const displayTemplates = showAllTemplates ? filtered : filtered.slice(0, 5);
                
                return (
                  <>
                    {displayTemplates.map((template) => {
                      const iconDef = getTraitIcon(template.icon_name);
                      const colorDef = getTraitColor(template.color_key);
                      if (!iconDef || !colorDef) return null;
                      const IconComponent = iconDef.icon;

                      const isAssigned = existingTraits.some(
                        (t) =>
                          t.icon_name === template.icon_name &&
                          t.color_key === template.color_key &&
                          t.title === template.title
                      );

                      return (
                        <button
                          key={template.id}
                          onClick={() => !isAssigned && handleAddFromTemplate(template)}
                          disabled={isAssigned || saving}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors ${
                            isAssigned
                              ? 'bg-muted/50 opacity-50 cursor-not-allowed'
                              : 'bg-muted hover:bg-accent cursor-pointer'
                          }`}
                          title={isAssigned ? 'Already assigned' : `Add: ${template.title}`}
                        >
                          <IconComponent className={`h-3.5 w-3.5 ${colorDef.textClass}`} />
                          <span className="truncate max-w-[120px]">{template.title}</span>
                        </button>
                      );
                    })}
                    {!showAllTemplates && filtered.length > 5 && (
                      <button
                        onClick={() => setShowAllTemplates(true)}
                        className="inline-flex items-center px-2 py-1 rounded-md text-sm text-primary hover:bg-accent transition-colors"
                      >
                        +{filtered.length - 5} more
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Custom Trait Form Toggle */}
        {!showCustomForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomForm(true)}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Trait
          </Button>
        ) : (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add Custom Trait</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomForm(false);
                  setSelectedIcon(null);
                  setSelectedColor(null);
                  setTraitTitle('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Icon Selection */}
            <div>
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
                    <ScrollArea className="h-20">
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
                              <IconComponent className="h-4 w-4" />
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
              <div>
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
                        <IconComponent className={`h-4 w-4 ${color.textClass}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title Input */}
            {selectedIcon && selectedColor && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  3. Enter a title
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Needs supervision"
                    value={traitTitle}
                    onChange={(e) => setTraitTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddCustomTrait}
                    disabled={saving || !traitTitle.trim()}
                    size="sm"
                    className="gap-1"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
