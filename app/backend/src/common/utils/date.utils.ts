/**
 * İki tarih arasındaki gün farkını döner
 */
export function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Sınav tarihi geçmiş mi?
 */
export function isExamPast(examDate: string): boolean {
  return new Date(examDate) < new Date();
}

/**
 * Bugünün ISO tarihini döner (YYYY-MM-DD)
 */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * "09:00" gibi bir saat string'ini dakikaya çevirir
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Dakikayı "HH:MM" formatına çevirir
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
