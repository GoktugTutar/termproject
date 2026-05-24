export interface ExamResultPromptInput {
  lessonName: string;
  difficulty: number;
  failReason: string;

  // Prep data for this lesson in the weeks before the exam
  prepCompletionRate: number;   // 0-1, how much of planned blocks were completed
  prepAvgStress: number;        // average stress during prep period
  prepDelayCount: number;       // voluntary delays during prep period

  // Student's general profile at exam time
  profile: {
    completionRate7d: number;
    avgStress7d: number;
    consistencyScore: number;
    stressNearExam: number;
  } | null;

  // Sleep the night before (if recorded)
  sleptWellBeforeExam: boolean | null;
}

const FAIL_REASON_LABELS: Record<string, string> = {
  insufficient_preparation: 'felt they didn\'t prepare enough',
  poor_understanding:        'studied but the material didn\'t fully sink in',
  exam_anxiety:              'knew the material but felt anxious during the exam',
  time_management_in_exam:   'ran out of time during the exam itself',
  poor_sleep_before:         'had poor sleep the night before',
  overwhelmed_by_workload:   'felt overwhelmed by the overall workload',
  lack_of_focus:             'studied but struggled to concentrate',
};

export function buildExamResultPrompt(input: ExamResultPromptInput): string {
  const lines: string[] = [];

  lines.push('You are a supportive study coach in a student progress tracking system.');
  lines.push('A student just received their exam result and indicated they are not satisfied with it.');
  lines.push('Write a short, empathetic, and constructive response in English. Maximum 3 sentences. No bullet points.');
  lines.push('IMPORTANT: Do not suggest session lengths, scheduling, block placement, or timing — the planner handles all of that. Focus on the pattern you see in the data and one forward-looking insight.');
  lines.push('');

  // Exam context
  lines.push(`Exam: ${input.lessonName} (difficulty ${input.difficulty}/5)`);
  lines.push(`Student's reason for dissatisfaction: ${FAIL_REASON_LABELS[input.failReason] ?? input.failReason}`);
  lines.push('');

  // Prep data
  lines.push('Preparation data for this lesson in the weeks leading up to the exam:');
  lines.push(`- Completion rate of planned study blocks: ${Math.round(input.prepCompletionRate * 100)}%`);
  lines.push(`- Average stress during prep period: ${input.prepAvgStress.toFixed(1)} / 5`);
  if (input.prepDelayCount > 0) {
    lines.push(`- Sessions voluntarily delayed: ${input.prepDelayCount} times`);
  }
  lines.push('');

  // Sleep before exam
  if (input.sleptWellBeforeExam !== null) {
    lines.push(`Sleep the night before the exam: ${input.sleptWellBeforeExam ? 'good' : 'poor'}`);
    lines.push('');
  }

  // General profile
  if (input.profile) {
    const p = input.profile;
    lines.push('Student\'s general profile at exam time:');
    lines.push(`- Overall 7-day completion rate: ${Math.round(p.completionRate7d * 100)}%`);
    lines.push(`- Average stress (7 days): ${p.avgStress7d.toFixed(1)} / 5`);
    lines.push(`- Typical stress near exams: ${p.stressNearExam.toFixed(1)} / 5`);
    lines.push(`- Study consistency: ${Math.round(p.consistencyScore * 100)}%`);
    lines.push('');
  }

  lines.push('Based on the data above, acknowledge the student\'s result with empathy, identify one clear pattern that likely contributed to the outcome, and offer one forward-looking insight for next time.');

  return lines.join('\n');
}