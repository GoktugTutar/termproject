// Haftalık blokları günlere dağıt ve gün bazlı session limitlerini belirle (ADIM 5)

export interface DayConfig {
  date: Date;
  dayOfWeek: number; // 1=Pzt...7=Paz
  maxBlocks: number;
  maxSessions: number;
  maxBlocksPerSession: number;
  avgFatigue: number;
  isCokYorucu: boolean;
  isRahat: boolean;
}

// Günlere blok dağıtımı ve session sınırlarını hesapla
export function step5DayDistribution(
  weekDays: Array<{ date: Date; dayOfWeek: number; busySlots: Array<{ fatigueLevel: number }> }>,
  studyStyle: string,
  maxBlocksPerSessionFromBurnout: number,
  lessonCount: number,
): DayConfig[] {
  const daysAvailable = weekDays.length;

  // Study style bazlı session yapısı
  let baseMaxSessions: number;
  let baseMaxBlocksPerSession: number;

  switch (studyStyle) {
    case 'deep_focus':
      baseMaxSessions = 1;
      baseMaxBlocksPerSession = Math.min(4, maxBlocksPerSessionFromBurnout);
      break;
    case 'distributed':
      baseMaxSessions = 3;
      baseMaxBlocksPerSession = Math.min(2, maxBlocksPerSessionFromBurnout);
      break;
    default: // normal
      baseMaxSessions = 2;
      baseMaxBlocksPerSession = Math.min(3, maxBlocksPerSessionFromBurnout);
      break;
  }

  // Tüm dersler haftaya en az bir kez girebilsin garantisi
  const minRequiredSessions = daysAvailable > 0 ? Math.ceil(lessonCount / daysAvailable) : 1;
  const maxSessions = Math.max(baseMaxSessions, minRequiredSessions);
  const maxBlocksPerSession = baseMaxBlocksPerSession;

  // Günlük üst kapasite: session sayısı × session uzunluğu
  const maxBlocks = maxSessions * maxBlocksPerSession;

  return weekDays.map((day) => {
    const avgFatigue =
      day.busySlots.length === 0
        ? 1
        : day.busySlots.reduce((a, b) => a + b.fatigueLevel, 0) / day.busySlots.length;

    return {
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      maxBlocks,
      maxSessions,
      maxBlocksPerSession,
      avgFatigue,
      isCokYorucu: avgFatigue >= 4,
      isRahat: avgFatigue <= 2,
    };
  });
}
