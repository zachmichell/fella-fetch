import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

// Custom SVG icons for pet-related symbols not available in Lucide

export const DogLeash = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="6" cy="4" r="2" />
      <path d="M6 6v3c0 1.5 1 2.5 2 3l8 5" />
      <path d="M16 14l2 6" />
      <path d="M18 20h-4" />
      <path d="M4 9c-1 0-2 1-2 2v2c0 1 1 2 2 2" />
    </svg>
  )
);
DogLeash.displayName = 'DogLeash';

export const DogCollar = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <path d="M12 8v8" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <path d="M12 16c0 2-1 4-1 4" />
      <circle cx="11" cy="21" r="1" fill={color} />
    </svg>
  )
);
DogCollar.displayName = 'DogCollar';

export const DogBowl = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="17" rx="9" ry="3" />
      <path d="M3 17V14c0-2.5 4-4.5 9-4.5s9 2 9 4.5v3" />
      <path d="M7 9.5c0-1.5 2.2-3 5-3s5 1.5 5 3" />
    </svg>
  )
);
DogBowl.displayName = 'DogBowl';

export const DogTreat = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3c-1.5 0-3 1-3 2.5S10.5 8 12 8s3-1 3-2.5S13.5 3 12 3z" />
      <path d="M9 8v9c0 2 1.5 4 3 4s3-2 3-4V8" />
      <path d="M9 12h6" />
      <path d="M9 15h6" />
    </svg>
  )
);
DogTreat.displayName = 'DogTreat';

export const DogBone = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 8a3 3 0 0 1 3-3c1 0 2 .5 2.5 1.5L14.5 17.5c.5 1 1.5 1.5 2.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1-3-3c0-1 .5-2 1.5-2.5" />
      <path d="M19 8a3 3 0 0 0-3-3c-1 0-2 .5-2.5 1.5L9.5 17.5c-.5 1-1.5 1.5-2.5 1.5a3 3 0 1 0 0 6 3 3 0 0 0 3-3c0-1-.5-2-1.5-2.5" />
    </svg>
  )
);
DogBone.displayName = 'DogBone';

export const DogHouse = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6a3 3 0 0 1 6 0v6" />
    </svg>
  )
);
DogHouse.displayName = 'DogHouse';

export const DogTag = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v2" />
      <path d="M7 12c0-1 1-2 5-2s5 1 5 2v7c0 1.5-2 3-5 3s-5-1.5-5-3v-7z" />
      <path d="M9 15h6" />
      <path d="M9 18h6" />
    </svg>
  )
);
DogTag.displayName = 'DogTag';

export const DogWhistle = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="9" width="14" height="6" rx="3" />
      <circle cx="17" cy="12" r="4" />
      <path d="M21 10v4" />
      <circle cx="7" cy="12" r="1" fill={color} />
    </svg>
  )
);
DogWhistle.displayName = 'DogWhistle';

export const PawPrintHeart = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="8" cy="6" rx="2" ry="2.5" />
      <ellipse cx="16" cy="6" rx="2" ry="2.5" />
      <ellipse cx="5" cy="11" rx="2" ry="2.5" />
      <ellipse cx="19" cy="11" rx="2" ry="2.5" />
      <path d="M12 21l-4-4c-2-2-2-4 0-6 1.5-1.5 3.5-1 4 0 .5-1 2.5-1.5 4 0 2 2 2 4 0 6l-4 4z" />
    </svg>
  )
);
PawPrintHeart.displayName = 'PawPrintHeart';

export const DogCrate = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M6 6v14" />
      <path d="M10 6v14" />
      <path d="M14 6v14" />
      <path d="M18 6v14" />
      <path d="M2 10h20" />
    </svg>
  )
);
DogCrate.displayName = 'DogCrate';

export const FoodBag = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 4h12l2 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l2-4z" />
      <path d="M4 8h16" />
      <ellipse cx="12" cy="15" rx="3" ry="2" />
      <circle cx="12" cy="12" r="1" fill={color} />
    </svg>
  )
);
FoodBag.displayName = 'FoodBag';

export const WaterBowl = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="17" rx="9" ry="3" />
      <path d="M3 17V14c0-2.5 4-4.5 9-4.5s9 2 9 4.5v3" />
      <path d="M8 6c0-2 1.5-3 2.5-3s1.5 1 2 2c.5-1 1-2 2-2s2.5 1 2.5 3" />
      <path d="M8 6c0 1.5 1.5 3 4 3s4-1.5 4-3" />
    </svg>
  )
);
WaterBowl.displayName = 'WaterBowl';

export const DogBall = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c-2 3-2 6 0 9s2 6 0 9" />
      <path d="M12 3c2 3 2 6 0 9s-2 6 0 9" />
      <path d="M3 12h18" />
    </svg>
  )
);
DogBall.displayName = 'DogBall';

export const DogToy = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M18 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M9 9l6 6" />
      <path d="M6 15l3-3" />
      <path d="M15 12l3 3" />
    </svg>
  )
);
DogToy.displayName = 'DogToy';

export const GroomingBrush = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="6" y="2" width="12" height="8" rx="2" />
      <path d="M8 10v4" />
      <path d="M10 10v5" />
      <path d="M12 10v6" />
      <path d="M14 10v5" />
      <path d="M16 10v4" />
      <path d="M9 22l3-6 3 6" />
    </svg>
  )
);
GroomingBrush.displayName = 'GroomingBrush';

export const NailClippers = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 4l7 7" />
      <path d="M20 4l-7 7" />
      <path d="M12 11v4" />
      <circle cx="12" cy="18" r="3" />
      <path d="M9 11h6" />
    </svg>
  )
);
NailClippers.displayName = 'NailClippers';

export const MedicineBottle = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="7" y="2" width="10" height="4" rx="1" />
      <path d="M6 6h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6z" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </svg>
  )
);
MedicineBottle.displayName = 'MedicineBottle';

export const VetCross = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </svg>
  )
);
VetCross.displayName = 'VetCross';

export const DogFace = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="8" cy="10" rx="1.5" ry="2" />
      <ellipse cx="16" cy="10" rx="1.5" ry="2" />
      <ellipse cx="12" cy="15" rx="2" ry="1.5" fill={color} />
      <path d="M9 17c1.5 1 4.5 1 6 0" />
      <path d="M3 8c-1-2 0-4 2-5" />
      <path d="M21 8c1-2 0-4-2-5" />
    </svg>
  )
);
DogFace.displayName = 'DogFace';

export const DogSitting = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="5" r="3" />
      <path d="M8 8c-2 0-3 1-3 3v4" />
      <path d="M16 8c2 0 3 1 3 3v4" />
      <path d="M9 8v6c0 2 1.5 4 3 4s3-2 3-4V8" />
      <path d="M5 18h4" />
      <path d="M15 18h4" />
    </svg>
  )
);
DogSitting.displayName = 'DogSitting';

// Export all custom icons as a map for easy access
export const customPetIconMap = {
  'dog-leash': DogLeash,
  'dog-collar': DogCollar,
  'dog-bowl': DogBowl,
  'dog-treat': DogTreat,
  'dog-bone-custom': DogBone,
  'dog-house': DogHouse,
  'dog-tag': DogTag,
  'dog-whistle': DogWhistle,
  'paw-heart': PawPrintHeart,
  'dog-crate': DogCrate,
  'food-bag': FoodBag,
  'water-bowl': WaterBowl,
  'dog-ball': DogBall,
  'dog-toy': DogToy,
  'grooming-brush': GroomingBrush,
  'nail-clippers': NailClippers,
  'medicine-bottle': MedicineBottle,
  'vet-cross': VetCross,
  'dog-face': DogFace,
  'dog-sitting': DogSitting,
} as const;

export const customPetIconCategories = {
  'Dog Accessories': ['dog-leash', 'dog-collar', 'dog-tag', 'dog-whistle'],
  'Food & Water': ['dog-bowl', 'water-bowl', 'food-bag', 'dog-treat'],
  'Toys & Play': ['dog-ball', 'dog-toy', 'dog-bone-custom'],
  'Housing': ['dog-house', 'dog-crate'],
  'Grooming': ['grooming-brush', 'nail-clippers'],
  'Health': ['medicine-bottle', 'vet-cross'],
  'Dog Characters': ['dog-face', 'dog-sitting', 'paw-heart'],
} as const;
