import { addWeeks, format, isPast, isToday } from 'date-fns';

/**
 * Parse grooming frequency string and return number of weeks
 */
export function parseGroomingFrequency(frequency: string | null): number | null {
  if (!frequency) return null;
  
  const match = frequency.match(/(\d+)\s*weeks?/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Calculate the next recommended grooming date based on last appointment and frequency
 */
export function calculateNextGroomingDate(
  lastGroomingDate: string | null,
  groomingFrequency: string | null
): Date | null {
  if (!lastGroomingDate || !groomingFrequency) return null;
  
  const weeks = parseGroomingFrequency(groomingFrequency);
  if (!weeks) return null;
  
  const lastDate = new Date(lastGroomingDate);
  return addWeeks(lastDate, weeks);
}

/**
 * Get a human-readable status for the next grooming date
 */
export function getGroomingDueStatus(nextDate: Date | null): {
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
} {
  if (!nextDate) {
    return { label: '', isOverdue: false, isDueToday: false, isDueSoon: false };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(nextDate);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (isToday(nextDate)) {
    return { label: 'Due today', isOverdue: false, isDueToday: true, isDueSoon: false };
  }
  
  if (isPast(nextDate)) {
    const daysOverdue = Math.abs(diffDays);
    if (daysOverdue === 1) {
      return { label: 'Overdue by 1 day', isOverdue: true, isDueToday: false, isDueSoon: false };
    }
    if (daysOverdue < 7) {
      return { label: `Overdue by ${daysOverdue} days`, isOverdue: true, isDueToday: false, isDueSoon: false };
    }
    const weeksOverdue = Math.floor(daysOverdue / 7);
    return { label: `Overdue by ${weeksOverdue} week${weeksOverdue > 1 ? 's' : ''}`, isOverdue: true, isDueToday: false, isDueSoon: false };
  }
  
  // Future date
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, isOverdue: false, isDueToday: false, isDueSoon: true };
  }
  
  if (diffDays <= 14) {
    return { label: `Due in ${Math.ceil(diffDays / 7)} week${diffDays > 7 ? 's' : ''}`, isOverdue: false, isDueToday: false, isDueSoon: true };
  }
  
  return { label: format(nextDate, 'MMM d'), isOverdue: false, isDueToday: false, isDueSoon: false };
}
