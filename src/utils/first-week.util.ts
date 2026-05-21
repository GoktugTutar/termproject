export function getLocalWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Paz, 1=Pzt
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isFirstWeekDate(
  firstWeekStartedAt: Date | null | undefined,
  date: Date,
): boolean {
  if (!firstWeekStartedAt) return false;
  return (
    getLocalWeekStart(firstWeekStartedAt).getTime() ===
    getLocalWeekStart(date).getTime()
  );
}
