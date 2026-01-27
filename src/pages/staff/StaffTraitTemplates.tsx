import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Sparkles, Search, Bell } from 'lucide-react';
import {
  traitIcons,
  traitColors,
  traitCategories,
  getTraitIcon,
  getTraitColor,
  type TraitIcon,
  type TraitColor,
} from '@/lib/petTraitIcons';

interface TraitTemplate {
  id: string;
  icon_name: string;
  color_key: string;
  title: string;
  is_alert: boolean;
  created_at: string;
}

const StaffTraitTemplates = () => {
  const { isStaffOrAdmin } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TraitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [selectedIcon, setSelectedIcon] = useState<TraitIcon | null>(null);
  const [selectedColor, setSelectedColor] = useState<TraitColor | null>(null);
  const [traitTitle, setTraitTitle] = useState('');
  const [isAlert, setIsAlert] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('behavior');

  const fetchTemplates = async () => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trait_templates')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trait templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [isStaffOrAdmin]);

  const handleCreateTemplate = async () => {
    if (!selectedIcon || !selectedColor || !traitTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please select an icon, color, and enter a title',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('trait_templates').insert({
        icon_name: selectedIcon.id,
        color_key: selectedColor.key,
        title: traitTitle.trim(),
        is_alert: isAlert,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate',
            description: 'This icon/color/title combination already exists',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Trait template created!' });
        setSelectedIcon(null);
        setSelectedColor(null);
        setTraitTitle('');
        setIsAlert(false);
        setIsDialogOpen(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create trait template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('trait_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast({ title: 'Template deleted' });
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
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

  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.icon_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Trait Templates
            </h1>
            <p className="text-muted-foreground">
              Create reusable trait icons that can be quickly assigned to pets
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Trait Template</DialogTitle>
                <DialogDescription>
                  Define a new trait icon that can be assigned to pets
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Icon Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
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
                        <ScrollArea className="h-28">
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
                                  className={`p-2.5 rounded-md hover:bg-accent transition-colors ${
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
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
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
                            className={`p-2.5 rounded-md border-2 transition-all ${
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
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      3. Enter a title (shown on hover)
                    </Label>
                    <Input
                      placeholder="e.g., Needs supervision with small dogs"
                      value={traitTitle}
                      onChange={(e) => setTraitTitle(e.target.value)}
                    />
                  </div>
                )}

                {/* Alert Toggle */}
                {selectedIcon && selectedColor && traitTitle && (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Bell className={`h-5 w-5 ${isAlert ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <div>
                        <Label htmlFor="is-alert" className="text-sm font-medium cursor-pointer">
                          Show as Alert
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Display a popup when checking in/out pets with this trait
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="is-alert"
                      checked={isAlert}
                      onCheckedChange={setIsAlert}
                    />
                  </div>
                )}

                {/* Preview */}
                {selectedIcon && selectedColor && traitTitle && (
                  <div className="bg-muted/50 rounded-md p-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = selectedIcon.icon;
                        return (
                          <IconComponent className={`h-6 w-6 ${selectedColor.textClass}`} />
                        );
                      })()}
                      <span className="font-medium">{traitTitle}</span>
                      {isAlert && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                          <Bell className="h-3 w-3 mr-1" />
                          Alert
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={saving || !selectedIcon || !selectedColor || !traitTitle.trim()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Template'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Trait Templates</CardTitle>
            <CardDescription>
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'No templates match your search' : 'No trait templates yet'}</p>
                <p className="text-sm mt-1">Create your first template to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const iconDef = getTraitIcon(template.icon_name);
                    const colorDef = getTraitColor(template.color_key);
                    if (!iconDef || !colorDef) return null;
                    const IconComponent = iconDef.icon;

                    return (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <IconComponent className={`h-5 w-5 ${colorDef.textClass}`} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-full ${colorDef.bgClass}`}
                            />
                            <span className="text-sm text-muted-foreground">
                              {colorDef.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.is_alert ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                              <Bell className="h-3 w-3 mr-1" />
                              Alert
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">
                            {traitCategories[iconDef.category as keyof typeof traitCategories]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
};

export default StaffTraitTemplates;
