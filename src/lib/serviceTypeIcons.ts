// Service Type Icon System
// Maps icon_name strings from database to Lucide React components

import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Scissors,
  GraduationCap,
  Hand,
  Droplets,
  Bone,
  Heart,
  Star,
  Dog,
  BedDouble,
  Clock,
  Sparkles,
  Package,
  Bath,
  Brush,
  Paintbrush,
  PawPrint,
  Activity,
  Dumbbell,
  Trophy,
  Award,
  Stethoscope,
  Syringe,
  Pill,
  Thermometer,
  ShowerHead,
  Wind,
  Leaf,
  Flower2,
  Footprints,
  Baby,
  Users,
  UserCheck,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';

// Icon mapping from database icon_name to Lucide component
export const serviceTypeIconMap: Record<string, LucideIcon> = {
  // Time/Schedule
  'sun': Sun,
  'sunrise': Sunrise,
  'sunset': Sunset,
  'moon': Moon,
  'calendar': Calendar,
  'calendar-days': CalendarDays,
  'clock': Clock,
  
  // Admin/Check
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  'check-circle': CheckCircle,
  'user-check': UserCheck,
  
  // Grooming
  'scissors': Scissors,
  'bath': Bath,
  'shower-head': ShowerHead,
  'droplets': Droplets,
  'brush': Brush,
  'comb': Paintbrush,
  'wind': Wind,
  'sparkles': Sparkles,
  
  // Training/Activity
  'graduation-cap': GraduationCap,
  'activity': Activity,
  'dumbbell': Dumbbell,
  'trophy': Trophy,
  'award': Award,
  'footprints': Footprints,
  
  // Animals/Care
  'dog': Dog,
  'paw-print': PawPrint,
  'bone': Bone,
  'hand': Hand,
  'baby': Baby,
  'users': Users,
  
  // Lodging
  'bed-double': BedDouble,
  
  // Health
  'heart': Heart,
  'stethoscope': Stethoscope,
  'syringe': Syringe,
  'pill': Pill,
  'thermometer': Thermometer,
  
  // Nature
  'leaf': Leaf,
  'flower': Flower2,
  
  // Other
  'star': Star,
  'package': Package,
};

// List of available icons for the picker
export interface ServiceIconOption {
  value: string;
  label: string;
  icon: LucideIcon;
  category: 'time' | 'grooming' | 'training' | 'care' | 'health' | 'other';
}

export const serviceIconOptions: ServiceIconOption[] = [
  // Time/Schedule
  { value: 'sun', label: 'Sun', icon: Sun, category: 'time' },
  { value: 'sunrise', label: 'Sunrise', icon: Sunrise, category: 'time' },
  { value: 'sunset', label: 'Sunset', icon: Sunset, category: 'time' },
  { value: 'moon', label: 'Moon', icon: Moon, category: 'time' },
  { value: 'calendar', label: 'Calendar', icon: Calendar, category: 'time' },
  { value: 'calendar-days', label: 'Calendar Days', icon: CalendarDays, category: 'time' },
  { value: 'clock', label: 'Clock', icon: Clock, category: 'time' },
  
  // Grooming
  { value: 'scissors', label: 'Scissors', icon: Scissors, category: 'grooming' },
  { value: 'bath', label: 'Bath', icon: Bath, category: 'grooming' },
  { value: 'shower-head', label: 'Shower', icon: ShowerHead, category: 'grooming' },
  { value: 'droplets', label: 'Droplets', icon: Droplets, category: 'grooming' },
  { value: 'brush', label: 'Brush', icon: Brush, category: 'grooming' },
  { value: 'comb', label: 'Comb', icon: Paintbrush, category: 'grooming' },
  { value: 'wind', label: 'Wind/Dry', icon: Wind, category: 'grooming' },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles, category: 'grooming' },
  
  // Training/Activity
  { value: 'graduation-cap', label: 'Graduation Cap', icon: GraduationCap, category: 'training' },
  { value: 'activity', label: 'Activity', icon: Activity, category: 'training' },
  { value: 'dumbbell', label: 'Dumbbell', icon: Dumbbell, category: 'training' },
  { value: 'trophy', label: 'Trophy', icon: Trophy, category: 'training' },
  { value: 'award', label: 'Award', icon: Award, category: 'training' },
  { value: 'footprints', label: 'Footprints', icon: Footprints, category: 'training' },
  
  // Care
  { value: 'dog', label: 'Dog', icon: Dog, category: 'care' },
  { value: 'paw-print', label: 'Paw Print', icon: PawPrint, category: 'care' },
  { value: 'bone', label: 'Bone', icon: Bone, category: 'care' },
  { value: 'hand', label: 'Hand', icon: Hand, category: 'care' },
  { value: 'baby', label: 'Baby', icon: Baby, category: 'care' },
  { value: 'users', label: 'Users', icon: Users, category: 'care' },
  { value: 'bed-double', label: 'Bed', icon: BedDouble, category: 'care' },
  
  // Health
  { value: 'heart', label: 'Heart', icon: Heart, category: 'health' },
  { value: 'stethoscope', label: 'Stethoscope', icon: Stethoscope, category: 'health' },
  { value: 'syringe', label: 'Syringe', icon: Syringe, category: 'health' },
  { value: 'pill', label: 'Pill', icon: Pill, category: 'health' },
  { value: 'thermometer', label: 'Thermometer', icon: Thermometer, category: 'health' },
  
  // Other
  { value: 'clipboard-check', label: 'Clipboard Check', icon: ClipboardCheck, category: 'other' },
  { value: 'clipboard-list', label: 'Clipboard List', icon: ClipboardList, category: 'other' },
  { value: 'check-circle', label: 'Check Circle', icon: CheckCircle, category: 'other' },
  { value: 'user-check', label: 'User Check', icon: UserCheck, category: 'other' },
  { value: 'star', label: 'Star', icon: Star, category: 'other' },
  { value: 'package', label: 'Package', icon: Package, category: 'other' },
  { value: 'leaf', label: 'Leaf', icon: Leaf, category: 'other' },
  { value: 'flower', label: 'Flower', icon: Flower2, category: 'other' },
];

// Category labels for grouping in picker
export const serviceIconCategories: Record<ServiceIconOption['category'], string> = {
  time: 'Time & Schedule',
  grooming: 'Grooming',
  training: 'Training & Activity',
  care: 'Pet Care',
  health: 'Health',
  other: 'Other',
};

// Get the Lucide component for a given icon name
export const getServiceTypeIcon = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return Calendar;
  return serviceTypeIconMap[iconName] || Calendar;
};
