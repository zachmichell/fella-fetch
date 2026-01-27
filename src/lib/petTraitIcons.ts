// Pet Trait Icon System
// 50 icons with 10 color options each

import {
  Dog, Cat, Heart, HeartOff, AlertTriangle, AlertCircle, Shield, ShieldAlert,
  Zap, ZapOff, Smile, Frown, ThumbsUp, ThumbsDown, Eye, EyeOff,
  Users, UserX, Baby, Bone, Activity, Pill, Syringe, Droplets,
  Scissors, Wind, Volume2, VolumeX, Sun, Moon, Clock, Timer,
  Home, Bed, UtensilsCrossed, Apple, Cookie, Carrot, Leaf, Flame,
  Snowflake, Waves, Mountain, TreePine, Footprints, PawPrint, Star, Award,
  Crown, Sparkles, Target, Circle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TraitIcon {
  id: string;
  label: string;
  icon: LucideIcon;
  category: 'behavior' | 'health' | 'social' | 'care' | 'environment' | 'special';
}

export interface TraitColor {
  key: string;
  label: string;
  bgClass: string;
  textClass: string;
  hex: string;
}

// 10 color options for icons
export const traitColors: TraitColor[] = [
  { key: 'black', label: 'Black', bgClass: 'bg-gray-900', textClass: 'text-gray-900', hex: '#1a1a1a' },
  { key: 'red', label: 'Red', bgClass: 'bg-red-500', textClass: 'text-red-500', hex: '#ef4444' },
  { key: 'orange', label: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-orange-500', hex: '#f97316' },
  { key: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500', hex: '#eab308' },
  { key: 'green', label: 'Green', bgClass: 'bg-green-500', textClass: 'text-green-500', hex: '#22c55e' },
  { key: 'teal', label: 'Teal', bgClass: 'bg-teal-500', textClass: 'text-teal-500', hex: '#14b8a6' },
  { key: 'blue', label: 'Blue', bgClass: 'bg-blue-500', textClass: 'text-blue-500', hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', bgClass: 'bg-purple-500', textClass: 'text-purple-500', hex: '#a855f7' },
  { key: 'pink', label: 'Pink', bgClass: 'bg-pink-500', textClass: 'text-pink-500', hex: '#ec4899' },
  { key: 'gray', label: 'Gray', bgClass: 'bg-gray-400', textClass: 'text-gray-400', hex: '#9ca3af' },
];

// 50 trait icons organized by category
export const traitIcons: TraitIcon[] = [
  // Behavior (10)
  { id: 'dog', label: 'Dog', icon: Dog, category: 'behavior' },
  { id: 'zap', label: 'High Energy', icon: Zap, category: 'behavior' },
  { id: 'zap-off', label: 'Low Energy', icon: ZapOff, category: 'behavior' },
  { id: 'smile', label: 'Friendly', icon: Smile, category: 'behavior' },
  { id: 'frown', label: 'Anxious', icon: Frown, category: 'behavior' },
  { id: 'volume2', label: 'Vocal', icon: Volume2, category: 'behavior' },
  { id: 'volume-x', label: 'Quiet', icon: VolumeX, category: 'behavior' },
  { id: 'target', label: 'Focused', icon: Target, category: 'behavior' },
  { id: 'wind', label: 'Excitable', icon: Wind, category: 'behavior' },
  { id: 'activity', label: 'Active', icon: Activity, category: 'behavior' },

  // Health (10)
  { id: 'heart', label: 'Healthy', icon: Heart, category: 'health' },
  { id: 'heart-off', label: 'Health Issue', icon: HeartOff, category: 'health' },
  { id: 'pill', label: 'Medication', icon: Pill, category: 'health' },
  { id: 'syringe', label: 'Vaccinations', icon: Syringe, category: 'health' },
  { id: 'droplets', label: 'Allergies', icon: Droplets, category: 'health' },
  { id: 'eye', label: 'Vision', icon: Eye, category: 'health' },
  { id: 'eye-off', label: 'Vision Issue', icon: EyeOff, category: 'health' },
  { id: 'scissors', label: 'Grooming Needed', icon: Scissors, category: 'health' },
  { id: 'flame', label: 'Fever Watch', icon: Flame, category: 'health' },
  { id: 'snowflake', label: 'Cold Sensitive', icon: Snowflake, category: 'health' },

  // Social (10)
  { id: 'users', label: 'Good with Dogs', icon: Users, category: 'social' },
  { id: 'user-x', label: 'Dog Reactive', icon: UserX, category: 'social' },
  { id: 'cat', label: 'Cat Friendly', icon: Cat, category: 'social' },
  { id: 'baby', label: 'Kid Friendly', icon: Baby, category: 'social' },
  { id: 'thumbs-up', label: 'Well Behaved', icon: ThumbsUp, category: 'social' },
  { id: 'thumbs-down', label: 'Needs Work', icon: ThumbsDown, category: 'social' },
  { id: 'shield', label: 'Protective', icon: Shield, category: 'social' },
  { id: 'shield-alert', label: 'Guard Dog', icon: ShieldAlert, category: 'social' },
  { id: 'alert-triangle', label: 'Caution', icon: AlertTriangle, category: 'social' },
  { id: 'alert-circle', label: 'Warning', icon: AlertCircle, category: 'social' },

  // Care (10)
  { id: 'bone', label: 'Food Motivated', icon: Bone, category: 'care' },
  { id: 'utensils', label: 'Special Diet', icon: UtensilsCrossed, category: 'care' },
  { id: 'apple', label: 'Treats OK', icon: Apple, category: 'care' },
  { id: 'cookie', label: 'No Treats', icon: Cookie, category: 'care' },
  { id: 'carrot', label: 'Veggie Lover', icon: Carrot, category: 'care' },
  { id: 'leaf', label: 'Natural Diet', icon: Leaf, category: 'care' },
  { id: 'clock', label: 'Scheduled Feeding', icon: Clock, category: 'care' },
  { id: 'timer', label: 'Timed Meals', icon: Timer, category: 'care' },
  { id: 'paw', label: 'Paw Care', icon: PawPrint, category: 'care' },
  { id: 'footprints', label: 'Exercise Need', icon: Footprints, category: 'care' },

  // Environment (5)
  { id: 'home', label: 'Indoor Only', icon: Home, category: 'environment' },
  { id: 'bed', label: 'Crate Trained', icon: Bed, category: 'environment' },
  { id: 'sun', label: 'Outdoor Lover', icon: Sun, category: 'environment' },
  { id: 'moon', label: 'Night Owl', icon: Moon, category: 'environment' },
  { id: 'waves', label: 'Water Lover', icon: Waves, category: 'environment' },

  // Special (5)
  { id: 'mountain', label: 'Adventurous', icon: Mountain, category: 'special' },
  { id: 'tree', label: 'Nature Lover', icon: TreePine, category: 'special' },
  { id: 'star', label: 'Star Client', icon: Star, category: 'special' },
  { id: 'award', label: 'Top Dog', icon: Award, category: 'special' },
  { id: 'crown', label: 'VIP', icon: Crown, category: 'special' },
];

// Helper to get icon by id
export const getTraitIcon = (iconId: string): TraitIcon | undefined => {
  return traitIcons.find(icon => icon.id === iconId);
};

// Helper to get color by key
export const getTraitColor = (colorKey: string): TraitColor | undefined => {
  return traitColors.find(color => color.key === colorKey);
};

// Category labels for grouping
export const traitCategories: Record<TraitIcon['category'], string> = {
  behavior: 'Behavior',
  health: 'Health',
  social: 'Social',
  care: 'Care',
  environment: 'Environment',
  special: 'Special',
};
