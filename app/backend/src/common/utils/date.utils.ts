export function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isDatePast(date: string): boolean {
  return new Date(date) < new Date();
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
