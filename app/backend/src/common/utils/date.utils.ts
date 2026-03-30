export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDayName(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

export function isMonday(date: Date = new Date()): boolean {
  return date.getDay() === 1;
}

export function parseTimeRange(range: string): { start: number; end: number } {
  const [start, end] = range.split('-').map(Number);
  return { start, end };
}

export function formatTimeRange(start: number, end: number): string {
  return `${start}-${end}`;
}
