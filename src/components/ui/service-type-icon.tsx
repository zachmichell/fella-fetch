import { getServiceTypeIcon } from '@/lib/serviceTypeIcons';
import { cn } from '@/lib/utils';

interface ServiceTypeIconProps {
  iconName: string | null | undefined;
  className?: string;
  size?: number;
}

/**
 * Renders a dynamic icon based on the icon_name stored in the database.
 * Falls back to Calendar icon if no match is found.
 */
export const ServiceTypeIcon = ({ iconName, className, size }: ServiceTypeIconProps) => {
  const IconComponent = getServiceTypeIcon(iconName);
  return <IconComponent className={cn('h-4 w-4', className)} size={size} />;
};
