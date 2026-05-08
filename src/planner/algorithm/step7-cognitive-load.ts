// Bilişsel yük dengesi: KRITIK dersler başa, sonra zor→kolay→orta sıralaması (ADIM 7)
// KRİTİK öncelik tüm diğer kurallara karşı kazanır

export function step7CognitiveLoad(
  orderedLessons: Array<{ lessonId: number; difficulty: number; priority: string }>,
): Array<{ lessonId: number; difficulty: number; priority: string }> {
  // KRITIK dersler her zaman önce gelir
  const kritik = orderedLessons.filter((l) => l.priority === 'KRITIK');
  const others = orderedLessons.filter((l) => l.priority !== 'KRITIK');

  // Diğerleri: difficulty>=4 → difficulty<=2 → difficulty=3
  const hard = others.filter((l) => l.difficulty >= 4);
  const easy = others.filter((l) => l.difficulty <= 2);
  const medium = others.filter((l) => l.difficulty === 3);

  return [...kritik, ...hard, ...easy, ...medium];
}
