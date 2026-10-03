// src/lib/dateUtils.ts
// Date and time formatting helpers for Lucent dashboard & dispatches

export function getRelativeTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'recently';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'recently';
  
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function getDaysUntil(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  return `In ${days} days`;
}

export function getDateLabel(dateInput: Date | string | null | undefined): { month: string; day: string } {
  if (!dateInput) {
    const now = new Date();
    return {
      month: now.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: String(now.getDate()),
    };
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    const now = new Date();
    return {
      month: now.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: String(now.getDate()),
    };
  }
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}
