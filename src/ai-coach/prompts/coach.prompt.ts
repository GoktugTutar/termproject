export interface CoachPromptInput {
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
  weeklyFeedback: 'cok_yogundu' | 'tam_uygundu' | 'yetersizdi' | null;
  thisWeekBlocks: Array<{
    lessonName: string;
    blockCount: number;
    isReview: boolean;
  }>;
  delayedLessons: Array<{
    lessonName: string;
    delayCount: number;
  }>;
  sleepMetrics?: {
    goodSleepCompletionRate: number;
    badSleepCompletionRate: number | null;
    goodSleepAvgStress: number | null;
    badSleepAvgStress: number | null;
  } | null;
}

export function buildCoachPrompt(input: CoachPromptInput): string {
  const lines: string[] = [];

  lines.push('You are a personal study coach in a student progress tracking system.');
  lines.push('Based on the student\'s current situation, generate a short, motivating, and actionable coaching message.');
  lines.push('No judgment or criticism. Write in English. Maximum 3 sentences. No bullet points.');
  lines.push('IMPORTANT: Do not suggest session lengths, scheduling, block placement, or timing — the planner handles that. Focus on mindset, awareness of risk, or one behavioural nudge.');
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
        lines.push(`  → Current stress is ${stressDelta.toFixed(1)} points above their own exam baseline — higher than usual even for exam season`);
      } else if (stressDelta <= -0.5) {
        lines.push(`  → Current stress is ${Math.abs(stressDelta).toFixed(1)} points below their own exam baseline — relatively calm`);
      } else {
        lines.push(`  → Current stress is in line with their typical exam-period level`);
      }
    }
    lines.push('');
  }

  // This week's blocks
  if (input.thisWeekBlocks.length > 0) {
    const totalBlocks = input.thisWeekBlocks.reduce((s, b) => s + b.blockCount, 0);
    const lessonSummary = input.thisWeekBlocks
      .filter((b) => !b.isReview)
      .map((b) => `${b.lessonName} (${b.blockCount} blocks)`)
      .join(', ');
    lines.push(`This week's plan: ${totalBlocks} total blocks — ${lessonSummary}`);
    lines.push('');
  }

  // Last week's feedback
  if (input.weeklyFeedback) {
    const feedbackMap = {
      cok_yogundu: 'Found last week too heavy.',
      tam_uygundu: 'Found last week well-balanced.',
      yetersizdi: 'Found last week insufficient.',
    };
    lines.push(`Last week's self-assessment: ${feedbackMap[input.weeklyFeedback]}`);
    lines.push('');
  }

  // Upcoming exams
  if (input.upcomingExams.length > 0) {
    lines.push('Upcoming exams:');
    for (const e of input.upcomingExams) {
      lines.push(`- ${e.lessonName}: ${e.daysLeft} days left, difficulty ${e.difficulty}/5`);
    }
    lines.push('');
  }

  // Frequently delayed lessons
  if (input.delayedLessons.length > 0) {
    lines.push('Frequently delayed lessons:');
    for (const d of input.delayedLessons) {
      lines.push(`- ${d.lessonName}: delayed ${d.delayCount} times`);
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
      lines.push('Sleep & performance correlation (personal data, last 14 days):');
      if (compDiff !== null) {
        lines.push(`- Completion rate on good-sleep days: ${Math.round(s.goodSleepCompletionRate * 100)}%, on poor-sleep days: ${Math.round((s.badSleepCompletionRate ?? 0) * 100)}%`);
      }
      if (stressDiff !== null) {
        lines.push(`- Stress is ${stressDiff} points higher on poor-sleep days`);
      }
      lines.push('');
    }
  }

  lines.push('Based on the data above, write a short coaching message for the student for today.');
  lines.push('Identify the top priority focus (exam risk, stress, procrastination — whichever stands out most).');

  return lines.join('\n');
}