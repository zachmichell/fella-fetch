import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Variable } from 'lucide-react';

interface DynamicVariableInsertProps {
  onInsert: (variable: string) => void;
}

const DYNAMIC_VARIABLES = [
  { group: 'Client', variables: [
    { key: 'client_first_name', label: 'First Name' },
    { key: 'client_last_name', label: 'Last Name' },
    { key: 'client_name', label: 'Full Name' },
    { key: 'client_email', label: 'Email' },
    { key: 'client_phone', label: 'Phone' },
  ]},
  { group: 'Pets', variables: [
    { key: 'pet_names', label: 'All Pet Names' },
    { key: 'first_pet_name', label: 'First Pet Name' },
    { key: 'pet_breeds', label: 'Pet Breeds' },
  ]},
  { group: 'Credits', variables: [
    { key: 'daycare_credits', label: 'Daycare Credits' },
    { key: 'half_daycare_credits', label: 'Half Day Credits' },
    { key: 'boarding_credits', label: 'Boarding Credits' },
  ]},
  { group: 'Activity', variables: [
    { key: 'days_since_last_visit', label: 'Days Since Last Visit' },
    { key: 'days_since_last_groom', label: 'Days Since Last Groom' },
    { key: 'last_visit_date', label: 'Last Visit Date' },
    { key: 'last_groom_date', label: 'Last Groom Date' },
  ]},
  { group: 'Business', variables: [
    { key: 'business_name', label: 'Business Name' },
    { key: 'business_phone', label: 'Business Phone' },
    { key: 'booking_link', label: 'Booking Link' },
  ]},
];

export const DynamicVariableInsert = ({ onInsert }: DynamicVariableInsertProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Variable className="h-4 w-4 mr-1" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
        {DYNAMIC_VARIABLES.map((group, idx) => (
          <div key={group.group}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
            {group.variables.map(variable => (
              <DropdownMenuItem
                key={variable.key}
                onClick={() => onInsert(variable.key)}
                className="flex justify-between"
              >
                <span>{variable.label}</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-3">
                  {`{{${variable.key}}}`}
                </code>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { DYNAMIC_VARIABLES };
