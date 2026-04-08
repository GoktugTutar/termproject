export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

function pad(v: number): string {
  return v.toString().padStart(2, '0');
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString(): string {
  return formatDateKey(new Date());
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

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysToDateString(value: string, days: number): string {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

export function dateDiffInDays(from: string | Date, to: string | Date): number {
  const fromDate = typeof from === 'string' ? parseDateKey(from) : from;
  const toDate = typeof to === 'string' ? parseDateKey(to) : to;
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

/** "08:00:00" string → 8 */
export function timeStringToHour(value: string): number {
  const [hour] = value.split(':').map(Number);
  return hour;
}

/** Prisma Time(6) field (Date obj, UTC) → hour number */
export function timeToHour(value: Date | string): number {
  if (typeof value === 'string') return timeStringToHour(value);
  return value.getUTCHours();
}

/** hour number → Prisma Time-compatible Date (UTC) */
export function hourToTimeDate(hour: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, 0, 0, 0));
}

/** "HH:00:00" string for legacy compatibility */
export function formatHourToTime(hour: number): string {
  return `${pad(hour)}:00:00`;
}

/** YYYY-MM-DD string → Date at midnight UTC */
export function dateStringToDate(s: string): Date {
  return parseDateKey(s);
}

/** Prisma Date field (Date obj) → "YYYY-MM-DD" string */
export function prismaDateToString(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function getCurrentHour(): number {
  return new Date().getHours();
}
