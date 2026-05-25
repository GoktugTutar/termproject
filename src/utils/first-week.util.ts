export function getLocalWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Paz, 1=Pzt
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Verilen `date`'in, dönem başlangıcı (`currentTermStartedAt`) ile aynı takvim
 *  haftasında (Pzt–Paz) olup olmadığını döner.
 *  `currentTermStartedAt` null/undefined ise false döner → koruma devreye girmez. */
export function isFirstWeekDate(
  currentTermStartedAt: Date | null | undefined,
  date: Date,
): boolean {
  if (!currentTermStartedAt) return false;
  return (
    getLocalWeekStart(currentTermStartedAt).getTime() ===
    getLocalWeekStart(date).getTime()
  );
}
