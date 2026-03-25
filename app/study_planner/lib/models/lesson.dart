class Lesson {
  final String id;
  final String userId;
  final String lessonName;
  final int difficulty;
  final String examDate;
  final String examType;
  final int allocatedHours;
  final double remaining;
  final double delay;
  final String createdAt;

  Lesson({
    required this.id,
    required this.userId,
    required this.lessonName,
    required this.difficulty,
    required this.examDate,
    required this.examType,
    required this.allocatedHours,
    required this.remaining,
    required this.delay,
    required this.createdAt,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
        id: json['id'] ?? '',
        userId: json['userId'] ?? '',
        lessonName: json['lessonName'] ?? '',
        difficulty: (json['difficulty'] ?? 1) is int
            ? json['difficulty']
            : (json['difficulty'] as double).toInt(),
        examDate: json['examDate'] ?? '',
        examType: json['examType'] ?? 'midterm',
        allocatedHours: (json['allocatedHours'] ?? 1) is int
            ? json['allocatedHours']
            : (json['allocatedHours'] as double).toInt(),
        remaining: (json['remaining'] ?? 0).toDouble(),
        delay: (json['delay'] ?? 0).toDouble(),
        createdAt: json['createdAt'] ?? '',
      );

  String get difficultyLabel {
    switch (difficulty) {
      case 1:
        return 'Kolay';
      case 2:
        return 'Orta';
      case 3:
        return 'Zor';
      default:
        return 'Orta';
    }
  }

  String get examTypeLabel {
    switch (examType) {
      case 'quiz':
        return 'Quiz';
      case 'midterm':
        return 'Vize';
      case 'final':
        return 'Final';
      default:
        return examType;
    }
  }

  double get progressPercent {
    if (allocatedHours == 0) return 0;
    return ((allocatedHours - remaining) / allocatedHours).clamp(0.0, 1.0);
  }

  int get daysUntilExam {
    try {
      final exam = DateTime.parse(examDate);
      final now = DateTime.now();
      return exam.difference(now).inDays;
    } catch (_) {
      return 0;
    }
  }
}
