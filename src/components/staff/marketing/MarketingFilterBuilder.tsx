import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

export interface FilterCondition {
  field: string;
  operator: string;
  value: number | string;
}

interface FilterOption {
  value: string;
  label: string;
  category: 'inactivity' | 'credits' | 'special' | 'pet';
  type: 'number' | 'string' | 'boolean';
}

const FILTER_FIELDS: FilterOption[] = [
  { value: 'days_since_last_visit', label: 'Days since last visit', category: 'inactivity', type: 'number' },
  { value: 'days_since_last_groom', label: 'Days since last groom', category: 'inactivity', type: 'number' },
  { value: 'never_visited', label: 'Never visited', category: 'special', type: 'boolean' },
  { value: 'never_groomed', label: 'Never groomed', category: 'special', type: 'boolean' },
  { value: 'has_active_subscription', label: 'Has active recurring daycare', category: 'special', type: 'boolean' },
  { value: 'pet_name', label: 'Pet name', category: 'pet', type: 'string' },
  { value: 'pet_breed', label: 'Pet breed', category: 'pet', type: 'string' },
  { value: 'daycare_credits', label: 'Daycare credits', category: 'credits', type: 'number' },
  { value: 'half_daycare_credits', label: 'Half-day credits', category: 'credits', type: 'number' },
  { value: 'boarding_credits', label: 'Boarding credits', category: 'credits', type: 'number' },
];

const NUMERIC_OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'at least' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'at most' },
];

const STRING_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'starts_with', label: 'starts with' },
];

interface MarketingFilterBuilderProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export const MarketingFilterBuilder = ({
  filters,
  onFiltersChange,
}: MarketingFilterBuilderProps) => {
  const addFilter = () => {
    onFiltersChange([
      ...filters,
      { field: 'days_since_last_visit', operator: 'gte', value: 30 },
    ]);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onFiltersChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const isSpecialField = (field: string) => {
    return field === 'never_visited' || field === 'never_groomed';
  };

  return (
    <div className="space-y-3">
      {filters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No filters applied. Add a filter to segment your clients.
        </p>
      ) : (
        filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            {index > 0 && (
              <span className="text-sm text-muted-foreground font-medium">AND</span>
            )}
            
            <Select
              value={filter.field}
              onValueChange={(value) => updateFilter(index, { field: value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header-inactivity" disabled className="font-semibold text-xs text-muted-foreground">
                  — Inactivity —
                </SelectItem>
                {FILTER_FIELDS.filter(f => f.category === 'inactivity').map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
                <SelectItem value="header-special" disabled className="font-semibold text-xs text-muted-foreground">
                  — Special —
                </SelectItem>
                {FILTER_FIELDS.filter(f => f.category === 'special').map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
                <SelectItem value="header-credits" disabled className="font-semibold text-xs text-muted-foreground">
                  — Credits —
                </SelectItem>
                {FILTER_FIELDS.filter(f => f.category === 'credits').map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!isSpecialField(filter.field) && (
              <>
                <Select
                  value={filter.operator}
                  onValueChange={(value) => updateFilter(index, { operator: value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: parseInt(e.target.value) || 0 })}
                  className="w-[100px]"
                />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFilter(index)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}

      <Button variant="outline" size="sm" onClick={addFilter}>
        <Plus className="h-4 w-4 mr-2" />
        Add Filter
      </Button>
    </div>
  );
};
