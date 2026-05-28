// Kullanıcı tercihlerini (UserConstraint kayıtları) step8'in okuyabileceği
// tek bir config nesnesine dönüştürür. DB boşken DEFAULT döner ve davranış
// mevcut sistemle birebir aynı kalır.

export interface ConstraintConfig {
  // Wave 1 hard constraint kontrolleri — true ise mevcut yasak atlanır
  allowConsecutiveAgir: boolean;
  slottedModeDisabled: boolean;

  // freeWindows preprocessing — null = mevcut davranış (24:00 / 08:00)
  studyEndHour: number | null;
  studyStartHour: number | null;

  // Gün bazlı tercih saati override'ları (dayOfWeek 1-7 → "morning" vb.)
  // Boş ise tüm günler global preferredStudyTime kullanır.
  dayStudyTimeOverrides: Record<number, string>;
}

export const DEFAULT_CONSTRAINT_CONFIG: ConstraintConfig = {
  allowConsecutiveAgir: false,
  slottedModeDisabled: false,
  studyEndHour: null,
  studyStartHour: null,
  dayStudyTimeOverrides: {},
};

interface RawConstraint {
  type: string;
  params: any;
  isActive: boolean;
  expiresAt: Date | null;
}

// DB'den okunan UserConstraint kayıtlarını ConstraintConfig'e indirgir.
// Geçersiz/expired kayıtlar atlanır. Tanınmayan type'lar sessizce yok sayılır.
export function buildConstraintConfig(
  constraints: RawConstraint[],
  now: Date,
): ConstraintConfig {
  const config: ConstraintConfig = {
    ...DEFAULT_CONSTRAINT_CONFIG,
    dayStudyTimeOverrides: {},
  };

  for (const c of constraints) {
    if (!c.isActive) continue;
    if (c.expiresAt && c.expiresAt.getTime() < now.getTime()) continue;

    const params = (c.params ?? {}) as Record<string, any>;

    switch (c.type) {
      case 'allow_consecutive_agir':
        config.allowConsecutiveAgir = true;
        break;

      case 'disable_slotted_mode':
        config.slottedModeDisabled = true;
        break;

      case 'study_end_hour': {
        const hour = Number(params.hour);
        if (!Number.isNaN(hour) && hour >= 12 && hour <= 24) {
          config.studyEndHour = hour;
        }
        break;
      }

      case 'study_start_hour': {
        const hour = Number(params.hour);
        if (!Number.isNaN(hour) && hour >= 0 && hour <= 22) {
          config.studyStartHour = hour;
        }
        break;
      }

      case 'day_study_time': {
        const dow = Number(params.dayOfWeek);
        const preferredTime = String(params.preferredTime ?? '');
        const validTimes = ['morning', 'afternoon', 'evening', 'night'];
        if (dow >= 1 && dow <= 7 && validTimes.includes(preferredTime)) {
          config.dayStudyTimeOverrides[dow] = preferredTime;
        }
        break;
      }
    }
  }

  return config;
}
