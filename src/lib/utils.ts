import type { DiagnosisSeverity } from '@/types/diagnosis';

/**
 * Get Tailwind color classes for diagnosis severity
 */
export function getSeverityColor(severity?: DiagnosisSeverity | string): string {
  switch (severity) {
    case 'healthy':
      return 'bg-green-100 text-green-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'critical':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format currency with Korean units (만, 억)
 */
export function formatCurrency(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${Math.round(value / 10000)}만`;
  return `${value.toLocaleString()}`;
}

/**
 * Format date string to Korean format (YYYY.MM.DD)
 */
export function formatDateKorean(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
