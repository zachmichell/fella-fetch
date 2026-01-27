// Pet Trait Icon System
// 120+ icons with 10 color options each

import {
  // Animals
  Dog, Cat, Bird, Fish, Rabbit, Turtle, Bug, Squirrel,
  // Behavior & Emotion
  Heart, HeartOff, HeartCrack, HeartHandshake, Smile, SmilePlus, Frown, Meh,
  Angry, Laugh, PartyPopper, Ghost,
  // Alerts & Status
  AlertTriangle, AlertCircle, AlertOctagon, CircleAlert, TriangleAlert,
  Shield, ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion,
  Ban, CircleSlash, OctagonX, XCircle, CheckCircle, CheckCircle2,
  // Energy & Activity
  Zap, ZapOff, Activity, Gauge, TrendingUp, TrendingDown, Rocket,
  Bolt, BatteryFull, BatteryLow, BatteryWarning, Power, PowerOff,
  // Senses
  Eye, EyeOff, Ear, EarOff, Hand, HandMetal, Fingerprint,
  // Social
  Users, UserX, UserCheck, UserPlus, UserMinus, User, Users2,
  Baby, PersonStanding, Handshake,
  // Food & Care
  Bone, UtensilsCrossed, Apple, Cookie, Carrot, Leaf, Cherry, Grape,
  Pizza, Sandwich, Coffee, Milk, Droplet, Droplets, GlassWater,
  // Medical
  Pill, Syringe, Stethoscope, Thermometer, Bandage, Cross, CircleDot,
  HeartPulse, Scan, BrainCircuit, Dna,
  // Grooming
  Scissors, Wind, Brush, Paintbrush, Sparkles, Wand2, WandSparkles,
  Bath, ShowerHead, Waves,
  // Sound
  Volume2, VolumeX, Volume1, Volume, Bell, BellOff, BellRing,
  Music, Music2, Music4, Mic, MicOff,
  // Time
  Sun, Moon, Sunrise, Sunset, Clock, Timer, Hourglass, Calendar,
  CalendarClock, AlarmClock, Watch, History,
  // Environment
  Home, Bed, BedDouble, Sofa, Armchair, Tent, Building, Warehouse,
  Fence, DoorOpen, DoorClosed, Lock, Unlock, Key,
  // Nature
  Mountain, TreePine, Trees, Flower, Flower2, Clover, Shrub,
  Snowflake, CloudRain, CloudSun, Rainbow, Umbrella,
  // Movement
  Footprints, PawPrint, Route, MapPin, Navigation, Compass, Move,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw,
  // Special & Badges
  Star, Award, Crown, Trophy, Medal, Gem, Diamond, Gift,
  Sparkle, Flame, Lightbulb, Rocket as RocketIcon,
  // Symbols
  Target, Circle, Square, Triangle, Hexagon, Pentagon, Octagon,
  Plus, Minus, X, Check, Info, HelpCircle,
  // Misc
  Flag, Bookmark, Tag, Hash, AtSign, Percent, DollarSign,
  Package, Box, Archive, Briefcase, Folder, FileText,
  Camera, Image, Video, Phone, Mail, Send,
  Link, Unlink, Wifi, WifiOff, Bluetooth, Radio,
  // Tools & Objects
  Wrench, Hammer, Settings, Cog,
  Magnet, Anchor, Umbrella as UmbrellaIcon, Glasses, Binoculars,
  type LucideIcon,
} from 'lucide-react';

export interface TraitIcon {
  id: string;
  label: string;
  icon: LucideIcon;
  category: 'behavior' | 'health' | 'social' | 'care' | 'environment' | 'special' | 'alerts' | 'objects';
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

// 120+ trait icons organized by category
export const traitIcons: TraitIcon[] = [
  // Animals (8)
  { id: 'dog', label: 'Dog', icon: Dog, category: 'behavior' },
  { id: 'cat', label: 'Cat', icon: Cat, category: 'behavior' },
  { id: 'bird', label: 'Bird', icon: Bird, category: 'behavior' },
  { id: 'fish', label: 'Fish', icon: Fish, category: 'behavior' },
  { id: 'rabbit', label: 'Rabbit', icon: Rabbit, category: 'behavior' },
  { id: 'turtle', label: 'Turtle', icon: Turtle, category: 'behavior' },
  { id: 'bug', label: 'Bug', icon: Bug, category: 'behavior' },
  { id: 'squirrel', label: 'Squirrel', icon: Squirrel, category: 'behavior' },

  // Behavior & Energy (20)
  { id: 'zap', label: 'High Energy', icon: Zap, category: 'behavior' },
  { id: 'zap-off', label: 'Low Energy', icon: ZapOff, category: 'behavior' },
  { id: 'activity', label: 'Active', icon: Activity, category: 'behavior' },
  { id: 'gauge', label: 'Energy Level', icon: Gauge, category: 'behavior' },
  { id: 'trending-up', label: 'Improving', icon: TrendingUp, category: 'behavior' },
  { id: 'trending-down', label: 'Declining', icon: TrendingDown, category: 'behavior' },
  { id: 'rocket', label: 'Hyperactive', icon: Rocket, category: 'behavior' },
  { id: 'bolt', label: 'Quick', icon: Bolt, category: 'behavior' },
  { id: 'battery-full', label: 'Full Energy', icon: BatteryFull, category: 'behavior' },
  { id: 'battery-low', label: 'Tired', icon: BatteryLow, category: 'behavior' },
  { id: 'battery-warning', label: 'Low Energy', icon: BatteryWarning, category: 'behavior' },
  { id: 'power', label: 'Powered Up', icon: Power, category: 'behavior' },
  { id: 'power-off', label: 'Calm', icon: PowerOff, category: 'behavior' },
  { id: 'smile', label: 'Friendly', icon: Smile, category: 'behavior' },
  { id: 'smile-plus', label: 'Very Friendly', icon: SmilePlus, category: 'behavior' },
  { id: 'frown', label: 'Anxious', icon: Frown, category: 'behavior' },
  { id: 'meh', label: 'Neutral', icon: Meh, category: 'behavior' },
  { id: 'angry', label: 'Aggressive', icon: Angry, category: 'behavior' },
  { id: 'laugh', label: 'Playful', icon: Laugh, category: 'behavior' },
  { id: 'party', label: 'Excited', icon: PartyPopper, category: 'behavior' },
  { id: 'ghost', label: 'Shy', icon: Ghost, category: 'behavior' },
  { id: 'wind', label: 'Excitable', icon: Wind, category: 'behavior' },
  { id: 'target', label: 'Focused', icon: Target, category: 'behavior' },

  // Alerts & Status (20)
  { id: 'alert-triangle', label: 'Caution', icon: AlertTriangle, category: 'alerts' },
  { id: 'alert-circle', label: 'Warning', icon: AlertCircle, category: 'alerts' },
  { id: 'alert-octagon', label: 'Stop', icon: AlertOctagon, category: 'alerts' },
  { id: 'circle-alert', label: 'Alert', icon: CircleAlert, category: 'alerts' },
  { id: 'triangle-alert', label: 'Danger', icon: TriangleAlert, category: 'alerts' },
  { id: 'shield', label: 'Protected', icon: Shield, category: 'alerts' },
  { id: 'shield-alert', label: 'Guard', icon: ShieldAlert, category: 'alerts' },
  { id: 'shield-check', label: 'Verified', icon: ShieldCheck, category: 'alerts' },
  { id: 'shield-x', label: 'Not Safe', icon: ShieldX, category: 'alerts' },
  { id: 'shield-question', label: 'Unknown', icon: ShieldQuestion, category: 'alerts' },
  { id: 'ban', label: 'Banned', icon: Ban, category: 'alerts' },
  { id: 'circle-slash', label: 'Restricted', icon: CircleSlash, category: 'alerts' },
  { id: 'octagon-x', label: 'Prohibited', icon: OctagonX, category: 'alerts' },
  { id: 'x-circle', label: 'Declined', icon: XCircle, category: 'alerts' },
  { id: 'check-circle', label: 'Approved', icon: CheckCircle, category: 'alerts' },
  { id: 'check-circle-2', label: 'Confirmed', icon: CheckCircle2, category: 'alerts' },
  { id: 'info', label: 'Info', icon: Info, category: 'alerts' },
  { id: 'help-circle', label: 'Help Needed', icon: HelpCircle, category: 'alerts' },
  { id: 'flag', label: 'Flagged', icon: Flag, category: 'alerts' },
  { id: 'bookmark', label: 'Bookmarked', icon: Bookmark, category: 'alerts' },

  // Health (25)
  { id: 'heart', label: 'Healthy', icon: Heart, category: 'health' },
  { id: 'heart-off', label: 'Health Issue', icon: HeartOff, category: 'health' },
  { id: 'heart-crack', label: 'Heartbroken', icon: HeartCrack, category: 'health' },
  { id: 'heart-handshake', label: 'Caring', icon: HeartHandshake, category: 'health' },
  { id: 'heart-pulse', label: 'Heart Monitor', icon: HeartPulse, category: 'health' },
  { id: 'pill', label: 'Medication', icon: Pill, category: 'health' },
  { id: 'syringe', label: 'Vaccinations', icon: Syringe, category: 'health' },
  { id: 'stethoscope', label: 'Vet Care', icon: Stethoscope, category: 'health' },
  { id: 'thermometer', label: 'Temperature', icon: Thermometer, category: 'health' },
  { id: 'bandage', label: 'Injured', icon: Bandage, category: 'health' },
  { id: 'cross', label: 'Medical', icon: Cross, category: 'health' },
  { id: 'circle-dot', label: 'Checkup', icon: CircleDot, category: 'health' },
  { id: 'scan', label: 'Scanned', icon: Scan, category: 'health' },
  { id: 'brain', label: 'Mental Health', icon: BrainCircuit, category: 'health' },
  { id: 'dna', label: 'Genetics', icon: Dna, category: 'health' },
  { id: 'droplets', label: 'Allergies', icon: Droplets, category: 'health' },
  { id: 'droplet', label: 'Hydration', icon: Droplet, category: 'health' },
  { id: 'eye', label: 'Vision', icon: Eye, category: 'health' },
  { id: 'eye-off', label: 'Vision Issue', icon: EyeOff, category: 'health' },
  { id: 'ear', label: 'Hearing', icon: Ear, category: 'health' },
  { id: 'ear-off', label: 'Hearing Issue', icon: EarOff, category: 'health' },
  { id: 'flame', label: 'Fever', icon: Flame, category: 'health' },
  { id: 'snowflake', label: 'Cold Sensitive', icon: Snowflake, category: 'health' },
  { id: 'scissors', label: 'Grooming', icon: Scissors, category: 'health' },
  { id: 'sparkles', label: 'Clean', icon: Sparkles, category: 'health' },

  // Social (15)
  { id: 'users', label: 'Good with Dogs', icon: Users, category: 'social' },
  { id: 'users-2', label: 'Pack Animal', icon: Users2, category: 'social' },
  { id: 'user-x', label: 'Dog Reactive', icon: UserX, category: 'social' },
  { id: 'user-check', label: 'People Friendly', icon: UserCheck, category: 'social' },
  { id: 'user-plus', label: 'Sociable', icon: UserPlus, category: 'social' },
  { id: 'user-minus', label: 'Antisocial', icon: UserMinus, category: 'social' },
  { id: 'user', label: 'One Person', icon: User, category: 'social' },
  { id: 'baby', label: 'Kid Friendly', icon: Baby, category: 'social' },
  { id: 'person-standing', label: 'Human Bond', icon: PersonStanding, category: 'social' },
  { id: 'handshake', label: 'Cooperative', icon: Handshake, category: 'social' },
  { id: 'hand', label: 'Touchable', icon: Hand, category: 'social' },
  { id: 'hand-metal', label: 'Rock On', icon: HandMetal, category: 'social' },
  { id: 'fingerprint', label: 'Unique', icon: Fingerprint, category: 'social' },
  { id: 'volume2', label: 'Vocal', icon: Volume2, category: 'social' },
  { id: 'volume-x', label: 'Quiet', icon: VolumeX, category: 'social' },

  // Care & Food (20)
  { id: 'bone', label: 'Food Motivated', icon: Bone, category: 'care' },
  { id: 'utensils', label: 'Special Diet', icon: UtensilsCrossed, category: 'care' },
  { id: 'apple', label: 'Treats OK', icon: Apple, category: 'care' },
  { id: 'cookie', label: 'No Treats', icon: Cookie, category: 'care' },
  { id: 'carrot', label: 'Veggie Lover', icon: Carrot, category: 'care' },
  { id: 'leaf', label: 'Natural Diet', icon: Leaf, category: 'care' },
  { id: 'cherry', label: 'Fruit Lover', icon: Cherry, category: 'care' },
  { id: 'grape', label: 'Grape Allergy', icon: Grape, category: 'care' },
  { id: 'pizza', label: 'Human Food', icon: Pizza, category: 'care' },
  { id: 'sandwich', label: 'Snacker', icon: Sandwich, category: 'care' },
  { id: 'coffee', label: 'Morning Dog', icon: Coffee, category: 'care' },
  { id: 'milk', label: 'Dairy', icon: Milk, category: 'care' },
  { id: 'glass-water', label: 'Water Bowl', icon: GlassWater, category: 'care' },
  { id: 'clock', label: 'Scheduled', icon: Clock, category: 'care' },
  { id: 'timer', label: 'Timed Meals', icon: Timer, category: 'care' },
  { id: 'hourglass', label: 'Patience', icon: Hourglass, category: 'care' },
  { id: 'calendar', label: 'Routine', icon: Calendar, category: 'care' },
  { id: 'paw', label: 'Paw Care', icon: PawPrint, category: 'care' },
  { id: 'footprints', label: 'Exercise', icon: Footprints, category: 'care' },
  { id: 'brush', label: 'Brushing', icon: Brush, category: 'care' },

  // Environment (20)
  { id: 'home', label: 'Indoor Only', icon: Home, category: 'environment' },
  { id: 'bed', label: 'Crate Trained', icon: Bed, category: 'environment' },
  { id: 'bed-double', label: 'Bed Sleeper', icon: BedDouble, category: 'environment' },
  { id: 'sofa', label: 'Couch Potato', icon: Sofa, category: 'environment' },
  { id: 'armchair', label: 'Lap Dog', icon: Armchair, category: 'environment' },
  { id: 'tent', label: 'Camping', icon: Tent, category: 'environment' },
  { id: 'building', label: 'City Dog', icon: Building, category: 'environment' },
  { id: 'warehouse', label: 'Large Space', icon: Warehouse, category: 'environment' },
  { id: 'fence', label: 'Fenced Yard', icon: Fence, category: 'environment' },
  { id: 'door-open', label: 'Door Dasher', icon: DoorOpen, category: 'environment' },
  { id: 'door-closed', label: 'Indoor', icon: DoorClosed, category: 'environment' },
  { id: 'lock', label: 'Secured', icon: Lock, category: 'environment' },
  { id: 'unlock', label: 'Escape Artist', icon: Unlock, category: 'environment' },
  { id: 'key', label: 'Special Access', icon: Key, category: 'environment' },
  { id: 'sun', label: 'Outdoor Lover', icon: Sun, category: 'environment' },
  { id: 'moon', label: 'Night Owl', icon: Moon, category: 'environment' },
  { id: 'sunrise', label: 'Early Bird', icon: Sunrise, category: 'environment' },
  { id: 'sunset', label: 'Evening', icon: Sunset, category: 'environment' },
  { id: 'waves', label: 'Water Lover', icon: Waves, category: 'environment' },
  { id: 'bath', label: 'Bath Time', icon: Bath, category: 'environment' },

  // Nature (12)
  { id: 'mountain', label: 'Adventurous', icon: Mountain, category: 'environment' },
  { id: 'tree', label: 'Nature Lover', icon: TreePine, category: 'environment' },
  { id: 'trees', label: 'Forest', icon: Trees, category: 'environment' },
  { id: 'flower', label: 'Garden', icon: Flower, category: 'environment' },
  { id: 'flower-2', label: 'Floral', icon: Flower2, category: 'environment' },
  { id: 'clover', label: 'Lucky', icon: Clover, category: 'environment' },
  { id: 'shrub', label: 'Bushes', icon: Shrub, category: 'environment' },
  { id: 'cloud-rain', label: 'Rain OK', icon: CloudRain, category: 'environment' },
  { id: 'cloud-sun', label: 'Any Weather', icon: CloudSun, category: 'environment' },
  { id: 'rainbow', label: 'Happy', icon: Rainbow, category: 'environment' },
  { id: 'umbrella', label: 'Rain Averse', icon: Umbrella, category: 'environment' },
  { id: 'compass', label: 'Explorer', icon: Compass, category: 'environment' },

  // Special & Awards (20)
  { id: 'star', label: 'Star Client', icon: Star, category: 'special' },
  { id: 'award', label: 'Top Dog', icon: Award, category: 'special' },
  { id: 'crown', label: 'VIP', icon: Crown, category: 'special' },
  { id: 'trophy', label: 'Champion', icon: Trophy, category: 'special' },
  { id: 'medal', label: 'Medal Winner', icon: Medal, category: 'special' },
  { id: 'gem', label: 'Precious', icon: Gem, category: 'special' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, category: 'special' },
  { id: 'gift', label: 'Gift', icon: Gift, category: 'special' },
  { id: 'sparkle', label: 'Sparkle', icon: Sparkle, category: 'special' },
  { id: 'flame', label: 'Hot', icon: Flame, category: 'special' },
  { id: 'lightbulb', label: 'Smart', icon: Lightbulb, category: 'special' },
  { id: 'wand', label: 'Magic', icon: Wand2, category: 'special' },
  { id: 'wand-sparkles', label: 'Magical', icon: WandSparkles, category: 'special' },
  { id: 'music', label: 'Musical', icon: Music, category: 'special' },
  { id: 'music-2', label: 'Melody', icon: Music2, category: 'special' },
  { id: 'music-4', label: 'Song', icon: Music4, category: 'special' },
  { id: 'mic', label: 'Voice', icon: Mic, category: 'special' },
  { id: 'bell', label: 'Bell Trained', icon: Bell, category: 'special' },
  { id: 'bell-ring', label: 'Alert Bell', icon: BellRing, category: 'special' },
  { id: 'bell-off', label: 'No Bell', icon: BellOff, category: 'special' },

  // Objects & Tools (15)
  { id: 'tag', label: 'Tagged', icon: Tag, category: 'objects' },
  { id: 'hash', label: 'ID', icon: Hash, category: 'objects' },
  { id: 'package', label: 'Package', icon: Package, category: 'objects' },
  { id: 'box', label: 'Box', icon: Box, category: 'objects' },
  { id: 'archive', label: 'Archived', icon: Archive, category: 'objects' },
  { id: 'briefcase', label: 'Business', icon: Briefcase, category: 'objects' },
  { id: 'folder', label: 'Folder', icon: Folder, category: 'objects' },
  { id: 'camera', label: 'Photogenic', icon: Camera, category: 'objects' },
  { id: 'video', label: 'Video Star', icon: Video, category: 'objects' },
  { id: 'phone', label: 'Call Owner', icon: Phone, category: 'objects' },
  { id: 'mail', label: 'Mail', icon: Mail, category: 'objects' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'objects' },
  { id: 'wrench', label: 'Needs Work', icon: Wrench, category: 'objects' },
  { id: 'glasses', label: 'Careful', icon: Glasses, category: 'objects' },
  { id: 'binoculars', label: 'Watchful', icon: Binoculars, category: 'objects' },
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
  behavior: 'Behavior & Animals',
  health: 'Health & Medical',
  social: 'Social',
  care: 'Care & Food',
  environment: 'Environment & Nature',
  special: 'Special & Awards',
  alerts: 'Alerts & Status',
  objects: 'Objects & Tools',
};
