// Service Type Icon System
// Maps icon_name strings from database to Lucide React components
// 100+ icons available for service types

import {
  // Time/Schedule
  Sun, Sunrise, Sunset, Moon, Calendar, CalendarDays, CalendarClock, CalendarCheck,
  CalendarX, CalendarPlus, CalendarMinus, CalendarRange, Clock, Clock1, Clock2, Clock3,
  Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, Clock10, Clock11, Clock12,
  Timer, TimerOff, TimerReset, Hourglass, AlarmClock, Watch, History,
  
  // Admin/Check
  ClipboardCheck, ClipboardList, ClipboardCopy, ClipboardPaste, Clipboard,
  CheckCircle, CheckCircle2, CheckSquare, Check, CircleCheck, SquareCheck,
  UserCheck, ListChecks, ListTodo, FileCheck, FileCheck2,
  
  // Grooming
  Scissors, Bath, ShowerHead, Droplets, Droplet, Brush, Paintbrush,
  Wind, Sparkles, Sparkle, WandSparkles, Wand2, Eraser,
  
  // Training/Activity
  GraduationCap, Activity, Dumbbell, Trophy, Award, Medal, Footprints,
  Target, Crosshair, Focus, Radar, Route, MapPin, Navigation, Compass,
  TrendingUp, TrendingDown, BarChart, BarChart2, BarChart3, PieChart,
  
  // Animals/Care
  Dog, Cat, Bird, Fish, Rabbit, Turtle, Bug, Squirrel,
  PawPrint, Bone, Hand, HandMetal, Baby, Users, Users2, User, UserPlus,
  Heart, HeartHandshake, HeartPulse, Smile, SmilePlus,
  
  // Lodging
  BedDouble, Bed, BedSingle, Sofa, Armchair, Home, Building, Warehouse,
  Tent, DoorOpen, DoorClosed, Lock, Unlock, Key,
  
  // Health/Medical
  Stethoscope, Syringe, Pill, Thermometer, Bandage, Cross, CircleDot,
  Scan, BrainCircuit, Dna, HeartOff, HeartCrack, Eye, EyeOff, Ear, EarOff,
  
  // Nature
  Leaf, Flower, Flower2, Clover, Shrub, TreePine, Trees, Mountain,
  Waves, Snowflake, CloudRain, CloudSun, Rainbow, Umbrella,
  
  // Food
  Apple, Cookie, Carrot, Cherry, Grape, Pizza, Sandwich, Coffee, Milk,
  UtensilsCrossed, GlassWater,
  
  // Packages/Items
  Star, Package, Box, Archive, Gift, Gem, Diamond, Crown,
  Tag, Hash, Bookmark, Flag, Briefcase,
  
  // Transport/Movement
  Car, Truck, Bus, Plane, Ship, Rocket, Move,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, RotateCcw, Repeat,
  
  // Communication
  Phone, PhoneCall, PhoneOff, Mail, Send, MessageSquare, MessageCircle,
  Bell, BellRing, BellOff, Volume2, VolumeX,
  
  // Tools
  Wrench, Hammer, Settings, Cog, Zap, ZapOff,
  Bolt, Power, PowerOff, Plug, Battery, BatteryFull,
  
  // Status/Alerts
  AlertTriangle, AlertCircle, AlertOctagon, Info, HelpCircle,
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Ban, CircleSlash, XCircle, X, Plus, Minus,
  
  // Media
  Camera, Image, Video, Music, Music2, Mic, MicOff,
  
  // Misc
  Lightbulb, Flame, Sun as SunIcon, Glasses, Binoculars,
  Wifi, WifiOff, Bluetooth, Radio, Link, Unlink,
  Circle, Square, Triangle, Hexagon, Pentagon, Octagon,
  
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
  'calendar-clock': CalendarClock,
  'calendar-check': CalendarCheck,
  'calendar-x': CalendarX,
  'calendar-plus': CalendarPlus,
  'calendar-minus': CalendarMinus,
  'calendar-range': CalendarRange,
  'clock': Clock,
  'clock-1': Clock1,
  'clock-2': Clock2,
  'clock-3': Clock3,
  'clock-4': Clock4,
  'clock-5': Clock5,
  'clock-6': Clock6,
  'clock-7': Clock7,
  'clock-8': Clock8,
  'clock-9': Clock9,
  'clock-10': Clock10,
  'clock-11': Clock11,
  'clock-12': Clock12,
  'timer': Timer,
  'timer-off': TimerOff,
  'timer-reset': TimerReset,
  'hourglass': Hourglass,
  'alarm-clock': AlarmClock,
  'watch': Watch,
  'history': History,
  
  // Admin/Check
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  'clipboard-copy': ClipboardCopy,
  'clipboard-paste': ClipboardPaste,
  'clipboard': Clipboard,
  'check-circle': CheckCircle,
  'check-circle-2': CheckCircle2,
  'check-square': CheckSquare,
  'check': Check,
  'circle-check': CircleCheck,
  'square-check': SquareCheck,
  'user-check': UserCheck,
  'list-checks': ListChecks,
  'list-todo': ListTodo,
  'file-check': FileCheck,
  'file-check-2': FileCheck2,
  
  // Grooming
  'scissors': Scissors,
  'bath': Bath,
  'shower-head': ShowerHead,
  'droplets': Droplets,
  'droplet': Droplet,
  'brush': Brush,
  'paintbrush': Paintbrush,
  'wind': Wind,
  'sparkles': Sparkles,
  'sparkle': Sparkle,
  'wand-sparkles': WandSparkles,
  'wand': Wand2,
  'eraser': Eraser,
  
  // Training/Activity
  'graduation-cap': GraduationCap,
  'activity': Activity,
  'dumbbell': Dumbbell,
  'trophy': Trophy,
  'award': Award,
  'medal': Medal,
  'footprints': Footprints,
  'target': Target,
  'crosshair': Crosshair,
  'focus': Focus,
  'radar': Radar,
  'route': Route,
  'map-pin': MapPin,
  'navigation': Navigation,
  'compass': Compass,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'bar-chart': BarChart,
  'bar-chart-2': BarChart2,
  'bar-chart-3': BarChart3,
  'pie-chart': PieChart,
  
  // Animals/Care
  'dog': Dog,
  'cat': Cat,
  'bird': Bird,
  'fish': Fish,
  'rabbit': Rabbit,
  'turtle': Turtle,
  'bug': Bug,
  'squirrel': Squirrel,
  'paw-print': PawPrint,
  'bone': Bone,
  'hand': Hand,
  'hand-metal': HandMetal,
  'baby': Baby,
  'users': Users,
  'users-2': Users2,
  'user': User,
  'user-plus': UserPlus,
  'heart': Heart,
  'heart-handshake': HeartHandshake,
  'heart-pulse': HeartPulse,
  'smile': Smile,
  'smile-plus': SmilePlus,
  
  // Lodging
  'bed-double': BedDouble,
  'bed': Bed,
  'bed-single': BedSingle,
  'sofa': Sofa,
  'armchair': Armchair,
  'home': Home,
  'building': Building,
  'warehouse': Warehouse,
  'tent': Tent,
  'door-open': DoorOpen,
  'door-closed': DoorClosed,
  'lock': Lock,
  'unlock': Unlock,
  'key': Key,
  
  // Health/Medical
  'stethoscope': Stethoscope,
  'syringe': Syringe,
  'pill': Pill,
  'thermometer': Thermometer,
  'bandage': Bandage,
  'cross': Cross,
  'circle-dot': CircleDot,
  'scan': Scan,
  'brain': BrainCircuit,
  'dna': Dna,
  'heart-off': HeartOff,
  'heart-crack': HeartCrack,
  'eye': Eye,
  'eye-off': EyeOff,
  'ear': Ear,
  'ear-off': EarOff,
  
  // Nature
  'leaf': Leaf,
  'flower': Flower,
  'flower-2': Flower2,
  'clover': Clover,
  'shrub': Shrub,
  'tree': TreePine,
  'trees': Trees,
  'mountain': Mountain,
  'waves': Waves,
  'snowflake': Snowflake,
  'cloud-rain': CloudRain,
  'cloud-sun': CloudSun,
  'rainbow': Rainbow,
  'umbrella': Umbrella,
  
  // Food
  'apple': Apple,
  'cookie': Cookie,
  'carrot': Carrot,
  'cherry': Cherry,
  'grape': Grape,
  'pizza': Pizza,
  'sandwich': Sandwich,
  'coffee': Coffee,
  'milk': Milk,
  'utensils': UtensilsCrossed,
  'glass-water': GlassWater,
  
  // Packages/Items
  'star': Star,
  'package': Package,
  'box': Box,
  'archive': Archive,
  'gift': Gift,
  'gem': Gem,
  'diamond': Diamond,
  'crown': Crown,
  'tag': Tag,
  'hash': Hash,
  'bookmark': Bookmark,
  'flag': Flag,
  'briefcase': Briefcase,
  
  // Transport/Movement
  'car': Car,
  'truck': Truck,
  'bus': Bus,
  'plane': Plane,
  'ship': Ship,
  'rocket': Rocket,
  'move': Move,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'rotate-cw': RotateCw,
  'rotate-ccw': RotateCcw,
  'repeat': Repeat,
  
  // Communication
  'phone': Phone,
  'phone-call': PhoneCall,
  'phone-off': PhoneOff,
  'mail': Mail,
  'send': Send,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  'bell': Bell,
  'bell-ring': BellRing,
  'bell-off': BellOff,
  'volume': Volume2,
  'volume-x': VolumeX,
  
  // Tools
  'wrench': Wrench,
  'hammer': Hammer,
  'settings': Settings,
  'cog': Cog,
  'zap': Zap,
  'zap-off': ZapOff,
  'bolt': Bolt,
  'power': Power,
  'power-off': PowerOff,
  'plug': Plug,
  'battery': Battery,
  'battery-full': BatteryFull,
  
  // Status/Alerts
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'alert-octagon': AlertOctagon,
  'info': Info,
  'help-circle': HelpCircle,
  'shield': Shield,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  'shield-x': ShieldX,
  'ban': Ban,
  'circle-slash': CircleSlash,
  'x-circle': XCircle,
  'x': X,
  'plus': Plus,
  'minus': Minus,
  
  // Media
  'camera': Camera,
  'image': Image,
  'video': Video,
  'music': Music,
  'music-2': Music2,
  'mic': Mic,
  'mic-off': MicOff,
  
  // Misc
  'lightbulb': Lightbulb,
  'flame': Flame,
  'glasses': Glasses,
  'binoculars': Binoculars,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'bluetooth': Bluetooth,
  'radio': Radio,
  'link': Link,
  'unlink': Unlink,
  'circle': Circle,
  'square': Square,
  'triangle': Triangle,
  'hexagon': Hexagon,
  'pentagon': Pentagon,
  'octagon': Octagon,
};

// List of available icons for the picker
export interface ServiceIconOption {
  value: string;
  label: string;
  icon: LucideIcon;
  category: 'time' | 'grooming' | 'training' | 'care' | 'health' | 'lodging' | 'transport' | 'communication' | 'tools' | 'status' | 'nature' | 'other';
}

export const serviceIconOptions: ServiceIconOption[] = [
  // Time/Schedule
  { value: 'sun', label: 'Sun', icon: Sun, category: 'time' },
  { value: 'sunrise', label: 'Sunrise', icon: Sunrise, category: 'time' },
  { value: 'sunset', label: 'Sunset', icon: Sunset, category: 'time' },
  { value: 'moon', label: 'Moon', icon: Moon, category: 'time' },
  { value: 'calendar', label: 'Calendar', icon: Calendar, category: 'time' },
  { value: 'calendar-days', label: 'Calendar Days', icon: CalendarDays, category: 'time' },
  { value: 'calendar-clock', label: 'Calendar Clock', icon: CalendarClock, category: 'time' },
  { value: 'calendar-check', label: 'Calendar Check', icon: CalendarCheck, category: 'time' },
  { value: 'calendar-x', label: 'Calendar X', icon: CalendarX, category: 'time' },
  { value: 'calendar-plus', label: 'Calendar Plus', icon: CalendarPlus, category: 'time' },
  { value: 'calendar-range', label: 'Calendar Range', icon: CalendarRange, category: 'time' },
  { value: 'clock', label: 'Clock', icon: Clock, category: 'time' },
  { value: 'timer', label: 'Timer', icon: Timer, category: 'time' },
  { value: 'timer-off', label: 'Timer Off', icon: TimerOff, category: 'time' },
  { value: 'hourglass', label: 'Hourglass', icon: Hourglass, category: 'time' },
  { value: 'alarm-clock', label: 'Alarm Clock', icon: AlarmClock, category: 'time' },
  { value: 'watch', label: 'Watch', icon: Watch, category: 'time' },
  { value: 'history', label: 'History', icon: History, category: 'time' },
  
  // Grooming
  { value: 'scissors', label: 'Scissors', icon: Scissors, category: 'grooming' },
  { value: 'bath', label: 'Bath', icon: Bath, category: 'grooming' },
  { value: 'shower-head', label: 'Shower', icon: ShowerHead, category: 'grooming' },
  { value: 'droplets', label: 'Droplets', icon: Droplets, category: 'grooming' },
  { value: 'droplet', label: 'Droplet', icon: Droplet, category: 'grooming' },
  { value: 'brush', label: 'Brush', icon: Brush, category: 'grooming' },
  { value: 'paintbrush', label: 'Paintbrush', icon: Paintbrush, category: 'grooming' },
  { value: 'wind', label: 'Wind/Dry', icon: Wind, category: 'grooming' },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles, category: 'grooming' },
  { value: 'sparkle', label: 'Sparkle', icon: Sparkle, category: 'grooming' },
  { value: 'wand-sparkles', label: 'Magic Wand', icon: WandSparkles, category: 'grooming' },
  { value: 'wand', label: 'Wand', icon: Wand2, category: 'grooming' },
  { value: 'eraser', label: 'Eraser', icon: Eraser, category: 'grooming' },
  
  // Training/Activity
  { value: 'graduation-cap', label: 'Graduation', icon: GraduationCap, category: 'training' },
  { value: 'activity', label: 'Activity', icon: Activity, category: 'training' },
  { value: 'dumbbell', label: 'Dumbbell', icon: Dumbbell, category: 'training' },
  { value: 'trophy', label: 'Trophy', icon: Trophy, category: 'training' },
  { value: 'award', label: 'Award', icon: Award, category: 'training' },
  { value: 'medal', label: 'Medal', icon: Medal, category: 'training' },
  { value: 'footprints', label: 'Footprints', icon: Footprints, category: 'training' },
  { value: 'target', label: 'Target', icon: Target, category: 'training' },
  { value: 'crosshair', label: 'Crosshair', icon: Crosshair, category: 'training' },
  { value: 'focus', label: 'Focus', icon: Focus, category: 'training' },
  { value: 'radar', label: 'Radar', icon: Radar, category: 'training' },
  { value: 'route', label: 'Route', icon: Route, category: 'training' },
  { value: 'map-pin', label: 'Map Pin', icon: MapPin, category: 'training' },
  { value: 'navigation', label: 'Navigation', icon: Navigation, category: 'training' },
  { value: 'compass', label: 'Compass', icon: Compass, category: 'training' },
  { value: 'trending-up', label: 'Trending Up', icon: TrendingUp, category: 'training' },
  { value: 'bar-chart', label: 'Bar Chart', icon: BarChart, category: 'training' },
  
  // Care/Animals
  { value: 'dog', label: 'Dog', icon: Dog, category: 'care' },
  { value: 'cat', label: 'Cat', icon: Cat, category: 'care' },
  { value: 'bird', label: 'Bird', icon: Bird, category: 'care' },
  { value: 'fish', label: 'Fish', icon: Fish, category: 'care' },
  { value: 'rabbit', label: 'Rabbit', icon: Rabbit, category: 'care' },
  { value: 'turtle', label: 'Turtle', icon: Turtle, category: 'care' },
  { value: 'paw-print', label: 'Paw Print', icon: PawPrint, category: 'care' },
  { value: 'bone', label: 'Bone', icon: Bone, category: 'care' },
  { value: 'hand', label: 'Hand', icon: Hand, category: 'care' },
  { value: 'baby', label: 'Baby', icon: Baby, category: 'care' },
  { value: 'users', label: 'Users', icon: Users, category: 'care' },
  { value: 'user', label: 'User', icon: User, category: 'care' },
  { value: 'heart', label: 'Heart', icon: Heart, category: 'care' },
  { value: 'heart-handshake', label: 'Heart Handshake', icon: HeartHandshake, category: 'care' },
  { value: 'smile', label: 'Smile', icon: Smile, category: 'care' },
  
  // Lodging
  { value: 'bed-double', label: 'Bed Double', icon: BedDouble, category: 'lodging' },
  { value: 'bed', label: 'Bed', icon: Bed, category: 'lodging' },
  { value: 'bed-single', label: 'Bed Single', icon: BedSingle, category: 'lodging' },
  { value: 'sofa', label: 'Sofa', icon: Sofa, category: 'lodging' },
  { value: 'armchair', label: 'Armchair', icon: Armchair, category: 'lodging' },
  { value: 'home', label: 'Home', icon: Home, category: 'lodging' },
  { value: 'building', label: 'Building', icon: Building, category: 'lodging' },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse, category: 'lodging' },
  { value: 'tent', label: 'Tent', icon: Tent, category: 'lodging' },
  { value: 'door-open', label: 'Door Open', icon: DoorOpen, category: 'lodging' },
  { value: 'door-closed', label: 'Door Closed', icon: DoorClosed, category: 'lodging' },
  { value: 'lock', label: 'Lock', icon: Lock, category: 'lodging' },
  { value: 'key', label: 'Key', icon: Key, category: 'lodging' },
  
  // Health
  { value: 'stethoscope', label: 'Stethoscope', icon: Stethoscope, category: 'health' },
  { value: 'syringe', label: 'Syringe', icon: Syringe, category: 'health' },
  { value: 'pill', label: 'Pill', icon: Pill, category: 'health' },
  { value: 'thermometer', label: 'Thermometer', icon: Thermometer, category: 'health' },
  { value: 'bandage', label: 'Bandage', icon: Bandage, category: 'health' },
  { value: 'cross', label: 'Cross', icon: Cross, category: 'health' },
  { value: 'heart-pulse', label: 'Heart Pulse', icon: HeartPulse, category: 'health' },
  { value: 'scan', label: 'Scan', icon: Scan, category: 'health' },
  { value: 'brain', label: 'Brain', icon: BrainCircuit, category: 'health' },
  { value: 'dna', label: 'DNA', icon: Dna, category: 'health' },
  { value: 'eye', label: 'Eye', icon: Eye, category: 'health' },
  { value: 'eye-off', label: 'Eye Off', icon: EyeOff, category: 'health' },
  { value: 'ear', label: 'Ear', icon: Ear, category: 'health' },
  
  // Nature
  { value: 'leaf', label: 'Leaf', icon: Leaf, category: 'nature' },
  { value: 'flower', label: 'Flower', icon: Flower, category: 'nature' },
  { value: 'flower-2', label: 'Flower 2', icon: Flower2, category: 'nature' },
  { value: 'clover', label: 'Clover', icon: Clover, category: 'nature' },
  { value: 'tree', label: 'Tree', icon: TreePine, category: 'nature' },
  { value: 'trees', label: 'Trees', icon: Trees, category: 'nature' },
  { value: 'mountain', label: 'Mountain', icon: Mountain, category: 'nature' },
  { value: 'waves', label: 'Waves', icon: Waves, category: 'nature' },
  { value: 'snowflake', label: 'Snowflake', icon: Snowflake, category: 'nature' },
  { value: 'cloud-rain', label: 'Rain', icon: CloudRain, category: 'nature' },
  { value: 'cloud-sun', label: 'Cloudy', icon: CloudSun, category: 'nature' },
  { value: 'rainbow', label: 'Rainbow', icon: Rainbow, category: 'nature' },
  { value: 'umbrella', label: 'Umbrella', icon: Umbrella, category: 'nature' },
  
  // Transport
  { value: 'car', label: 'Car', icon: Car, category: 'transport' },
  { value: 'truck', label: 'Truck', icon: Truck, category: 'transport' },
  { value: 'bus', label: 'Bus', icon: Bus, category: 'transport' },
  { value: 'plane', label: 'Plane', icon: Plane, category: 'transport' },
  { value: 'ship', label: 'Ship', icon: Ship, category: 'transport' },
  { value: 'rocket', label: 'Rocket', icon: Rocket, category: 'transport' },
  { value: 'move', label: 'Move', icon: Move, category: 'transport' },
  
  // Communication
  { value: 'phone', label: 'Phone', icon: Phone, category: 'communication' },
  { value: 'phone-call', label: 'Phone Call', icon: PhoneCall, category: 'communication' },
  { value: 'mail', label: 'Mail', icon: Mail, category: 'communication' },
  { value: 'send', label: 'Send', icon: Send, category: 'communication' },
  { value: 'message-square', label: 'Message', icon: MessageSquare, category: 'communication' },
  { value: 'bell', label: 'Bell', icon: Bell, category: 'communication' },
  { value: 'bell-ring', label: 'Bell Ring', icon: BellRing, category: 'communication' },
  { value: 'volume', label: 'Volume', icon: Volume2, category: 'communication' },
  
  // Tools
  { value: 'wrench', label: 'Wrench', icon: Wrench, category: 'tools' },
  { value: 'hammer', label: 'Hammer', icon: Hammer, category: 'tools' },
  { value: 'settings', label: 'Settings', icon: Settings, category: 'tools' },
  { value: 'cog', label: 'Cog', icon: Cog, category: 'tools' },
  { value: 'zap', label: 'Zap', icon: Zap, category: 'tools' },
  { value: 'bolt', label: 'Bolt', icon: Bolt, category: 'tools' },
  { value: 'power', label: 'Power', icon: Power, category: 'tools' },
  { value: 'plug', label: 'Plug', icon: Plug, category: 'tools' },
  { value: 'battery-full', label: 'Battery', icon: BatteryFull, category: 'tools' },
  
  // Status/Alerts
  { value: 'alert-triangle', label: 'Warning', icon: AlertTriangle, category: 'status' },
  { value: 'alert-circle', label: 'Alert', icon: AlertCircle, category: 'status' },
  { value: 'info', label: 'Info', icon: Info, category: 'status' },
  { value: 'help-circle', label: 'Help', icon: HelpCircle, category: 'status' },
  { value: 'shield', label: 'Shield', icon: Shield, category: 'status' },
  { value: 'shield-check', label: 'Shield Check', icon: ShieldCheck, category: 'status' },
  { value: 'shield-alert', label: 'Shield Alert', icon: ShieldAlert, category: 'status' },
  { value: 'ban', label: 'Ban', icon: Ban, category: 'status' },
  { value: 'check-circle', label: 'Check Circle', icon: CheckCircle, category: 'status' },
  { value: 'x-circle', label: 'X Circle', icon: XCircle, category: 'status' },
  { value: 'clipboard-check', label: 'Clipboard Check', icon: ClipboardCheck, category: 'status' },
  { value: 'clipboard-list', label: 'Clipboard List', icon: ClipboardList, category: 'status' },
  { value: 'list-checks', label: 'List Checks', icon: ListChecks, category: 'status' },
  { value: 'list-todo', label: 'Todo List', icon: ListTodo, category: 'status' },
  { value: 'user-check', label: 'User Check', icon: UserCheck, category: 'status' },
  
  // Other
  { value: 'star', label: 'Star', icon: Star, category: 'other' },
  { value: 'package', label: 'Package', icon: Package, category: 'other' },
  { value: 'box', label: 'Box', icon: Box, category: 'other' },
  { value: 'gift', label: 'Gift', icon: Gift, category: 'other' },
  { value: 'gem', label: 'Gem', icon: Gem, category: 'other' },
  { value: 'diamond', label: 'Diamond', icon: Diamond, category: 'other' },
  { value: 'crown', label: 'Crown', icon: Crown, category: 'other' },
  { value: 'tag', label: 'Tag', icon: Tag, category: 'other' },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark, category: 'other' },
  { value: 'flag', label: 'Flag', icon: Flag, category: 'other' },
  { value: 'lightbulb', label: 'Lightbulb', icon: Lightbulb, category: 'other' },
  { value: 'flame', label: 'Flame', icon: Flame, category: 'other' },
  { value: 'camera', label: 'Camera', icon: Camera, category: 'other' },
  { value: 'image', label: 'Image', icon: Image, category: 'other' },
  { value: 'video', label: 'Video', icon: Video, category: 'other' },
  { value: 'music', label: 'Music', icon: Music, category: 'other' },
  { value: 'mic', label: 'Microphone', icon: Mic, category: 'other' },
  { value: 'glasses', label: 'Glasses', icon: Glasses, category: 'other' },
  { value: 'circle', label: 'Circle', icon: Circle, category: 'other' },
  { value: 'square', label: 'Square', icon: Square, category: 'other' },
  { value: 'triangle', label: 'Triangle', icon: Triangle, category: 'other' },
  { value: 'hexagon', label: 'Hexagon', icon: Hexagon, category: 'other' },
];

// Category labels for grouping in picker
export const serviceIconCategories: Record<ServiceIconOption['category'], string> = {
  time: 'Time & Schedule',
  grooming: 'Grooming',
  training: 'Training & Activity',
  care: 'Pet Care & Animals',
  lodging: 'Lodging & Housing',
  health: 'Health & Medical',
  nature: 'Nature & Weather',
  transport: 'Transport',
  communication: 'Communication',
  tools: 'Tools & Power',
  status: 'Status & Admin',
  other: 'Other',
};

// Get the Lucide component for a given icon name
export const getServiceTypeIcon = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return Calendar;
  return serviceTypeIconMap[iconName] || Calendar;
};
