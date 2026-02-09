/**
 * Normalizes a phone number to +1XXXXXXXXXX format for SMS delivery.
 * Strips all non-digit characters, then ensures a +1 country code prefix.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // If already 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If 10 digits (no country code), prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Return as-is with + prefix if it looks like an international number
  return `+${digits}`;
}

/**
 * Formats a phone number for display as +1 (XXX) XXX-XXXX
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 12) return phone || '';
  
  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return normalized;
}
