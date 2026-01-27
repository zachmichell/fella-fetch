import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { serviceIconOptions, serviceIconCategories, getServiceTypeIcon, type ServiceIconOption } from '@/lib/serviceTypeIcons';

interface ServiceTypeIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  color?: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  'blue': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'sky': { bg: 'bg-sky-100', text: 'text-sky-700' },
  'purple': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'pink': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'green': { bg: 'bg-green-100', text: 'text-green-700' },
  'amber': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'orange': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'red': { bg: 'bg-red-100', text: 'text-red-700' },
  'cyan': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  'gray': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export const ServiceTypeIconPicker = ({ value, onChange, color = 'gray' }: ServiceTypeIconPickerProps) => {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getServiceTypeIcon(value);
  const colors = colorMap[color] || colorMap.gray;

  const groupedIcons = serviceIconOptions.reduce((acc, icon) => {
    if (!acc[icon.category]) {
      acc[icon.category] = [];
    }
    acc[icon.category].push(icon);
    return acc;
  }, {} as Record<string, ServiceIconOption[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start gap-2"
        >
          <div className={cn('w-8 h-8 rounded flex items-center justify-center', colors.bg, colors.text)}>
            <SelectedIcon className="h-5 w-5" />
          </div>
          <span className="text-sm">
            {serviceIconOptions.find(i => i.value === value)?.label || 'Select icon...'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-4">
            {Object.entries(groupedIcons).map(([category, icons]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  {serviceIconCategories[category as keyof typeof serviceIconCategories]}
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {icons.map((icon) => {
                    const IconComponent = icon.icon;
                    const isSelected = value === icon.value;
                    return (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => {
                          onChange(icon.value);
                          setOpen(false);
                        }}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                          isSelected 
                            ? cn(colors.bg, colors.text, 'ring-2 ring-primary') 
                            : 'hover:bg-muted'
                        )}
                        title={icon.label}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
