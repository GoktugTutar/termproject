export type WhatIfScenario =
  | 'daha_fazla_calis'
  | 'ders_durumu'
  | 'calisma_tarzi'
  | 'derse_odaklan'
  | 'gun_bos';

export interface WhatIfInput {
  scenario: WhatIfScenario;
  profile: {
    completionRate7d: number;
    avgStress7d: number;
    consistencyScore: number;
    stressNearExam: number;
    hasUpcomingExam: boolean;
  } | null;
  upcomingExams: Array<{
    lessonName: string;
    daysLeft: number;
    difficulty: number;
  }>;
  // For 'ders_durumu' and 'derse_odaklan'
  focusLessonName?: string;
  focusLessonCompletion?: number; // 0–1
  focusLessonKeyfiDelayCount?: number;
  // For 'gun_bos'
  emptyDayName?: string;
  emptyDayBlockCount?: number;
  // Sleep & performance correlation
  sleepMetrics?: {
    goodSleepCompletionRate: number;
    badSleepCompletionRate: number | null;
    goodSleepAvgStress: number | null;
    badSleepAvgStress: number | null;
  } | null;
}

const SCENARIO_LABELS: Record<WhatIfScenario, string> = {
  daha_fazla_calis: 'What happens if I study more?',
  ders_durumu: 'Where do I stand in this lesson?',
  calisma_tarzi: 'What study style suits me best?',
  derse_odaklan: 'What if I focus more on one lesson?',
  gun_bos: 'What if I can\'t study that day?',
};

export function buildWhatIfPrompt(input: WhatIfInput): string {
  const lines: string[] = [];

  lines.push('You are a study coach in a student progress tracking system.');
  lines.push('Explain the selected scenario to the student in a data-driven but supportive, non-judgmental coaching tone.');
  lines.push('Write in English. Maximum 3 sentences. No bullet points.');
  lines.push('IMPORTANT: Do not suggest specific session lengths, times of day, which day to study, or how to arrange blocks — the planner handles all scheduling. Focus only on the likely outcome and one motivational or risk-awareness insight.');
  lines.push('');

  lines.push(`Scenario: "${SCENARIO_LABELS[input.scenario]}"`);
  lines.push('');

  // Profile
  if (input.profile) {
    const p = input.profile;
    lines.push('Student\'s last 7 days:');
    lines.push(`- Completion rate: ${Math.round(p.completionRate7d * 100)}%`);
    lines.push(`- Average stress: ${p.avgStress7d.toFixed(1)} / 5`);
    lines.push(`- Study consistency: ${Math.round(p.consistencyScore * 100)}%`);
    if (p.hasUpcomingExam) {
      lines.push(`- Typical stress when an exam is close: ${p.stressNearExam.toFixed(1)} / 5`);
      const stressDelta = p.avgStress7d - p.stressNearExam;
      if (stressDelta >= 0.5) {
        lines.push(`  → Current stress is ${stressDelta.toFixed(1)} points above their own exam baseline`);
      } else if (stressDelta <= -0.5) {
        lines.push(`  → Current stress is ${Math.abs(stressDelta).toFixed(1)} points below their own exam baseline — relatively calm`);
      } else {
        lines.push(`  → Current stress is in line with their typical exam-period level`);
      }
    }
    lines.push('');
  }

  // Sleep & performance correlation
  if (input.sleepMetrics) {
    const s = input.sleepMetrics;
    const compDiff = s.badSleepCompletionRate !== null
      ? Math.round((s.goodSleepCompletionRate - (s.badSleepCompletionRate ?? 0)) * 100)
      : null;
    const stressDiff = (s.goodSleepAvgStress !== null && s.badSleepAvgStress !== null)
      ? (s.badSleepAvgStress - s.goodSleepAvgStress).toFixed(1)
      : null;

    if (compDiff !== null || stressDiff !== null) {
      lines.push('Sleep & performance correlation (last 14 days):');
      if (compDiff !== null) {
        lines.push(`- Completion rate on good-sleep days: ${Math.round(s.goodSleepCompletionRate * 100)}%, on poor-sleep days: ${Math.round((s.badSleepCompletionRate ?? 0) * 100)}% (difference: ${compDiff}%)`);
      }
      if (stressDiff !== null) {
        lines.push(`- Average stress on good-sleep days: ${s.goodSleepAvgStress?.toFixed(1)}, on poor-sleep days: ${s.badSleepAvgStress?.toFixed(1)} (difference: ${stressDiff})`);
      }
      lines.push('');
    }
  }

  // Upcoming exams
  if (input.upcomingExams.length > 0) {
    lines.push('Upcoming exams (within 14 days):');
    for (const e of input.upcomingExams) {
      lines.push(`- ${e.lessonName}: ${e.daysLeft} days left, difficulty ${e.difficulty}/5`);
    }
    lines.push('');
  }

  // Scenario-specific context
  switch (input.scenario) {
    case 'daha_fazla_calis':
      lines.push('Context: The student is wondering what difference it would make to study more, based on their current completion rate.');
      lines.push('Evaluate sustainability with stress level in mind.');
      break;

    case 'ders_durumu':
      if (input.focusLessonName) {
        lines.push(`Focus lesson: ${input.focusLessonName}`);
        if (input.focusLessonCompletion !== undefined) {
          lines.push(`Completion rate in this lesson: ${Math.round(input.focusLessonCompletion * 100)}%`);
        }
        if (input.focusLessonKeyfiDelayCount !== undefined && input.focusLessonKeyfiDelayCount > 0) {
          lines.push(`Times voluntarily delayed: ${input.focusLessonKeyfiDelayCount}`);
        }
      }
      lines.push('Clearly explain where the student stands in this lesson and what they should do next.');
      break;

    case 'calisma_tarzi':
      lines.push('Context: Based on their completion rate and consistency data, the student is wondering whether longer-infrequent or shorter-frequent sessions work better for them.');
      lines.push('Interpret the data and give a concrete recommendation.');
      break;

    case 'derse_odaklan':
      if (input.focusLessonName) {
        lines.push(`Lesson to focus on: ${input.focusLessonName}`);
      }
      lines.push('Context: Explain how allocating more time to one lesson might affect the others and overall exam risk.');
      if (input.upcomingExams.length > 1) {
        lines.push('Multiple exams are coming up, so emphasise the importance of balance.');
      }
      break;

    case 'gun_bos':
      if (input.emptyDayName) {
        lines.push(`Day off: ${input.emptyDayName}`);
        if (input.emptyDayBlockCount !== undefined) {
          lines.push(`Blocks planned for that day: ${input.emptyDayBlockCount}`);
        }
      }
      lines.push('Context: Explain the likely impact of skipping that day entirely on the weekly plan.');
      lines.push('Suggest a way to make up for it, but do not modify the plan yourself.');
      break;
  }

  return lines.join('\n');
}