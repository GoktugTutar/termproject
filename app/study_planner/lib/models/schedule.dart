class ScheduleSlot {
  final String day;
  final String dayLabel;
  final String lessonId;
  final String lessonName;
  final double hours;
  final double score;

  ScheduleSlot({
    required this.day,
    required this.dayLabel,
    required this.lessonId,
    required this.lessonName,
    required this.hours,
    required this.score,
  });

  factory ScheduleSlot.fromJson(Map<String, dynamic> json) => ScheduleSlot(
        day: json['day'] ?? '',
        dayLabel: json['dayLabel'] ?? '',
        lessonId: json['lessonId'] ?? '',
        lessonName: json['lessonName'] ?? '',
        hours: (json['hours'] ?? 0).toDouble(),
        score: (json['score'] ?? 0).toDouble(),
      );
}

class WeeklySchedule {
  final String generatedAt;
  final String weekStart;
  final List<ScheduleSlot> slots;

  WeeklySchedule({
    required this.generatedAt,
    required this.weekStart,
    required this.slots,
  });

  factory WeeklySchedule.fromJson(Map<String, dynamic> json) => WeeklySchedule(
        generatedAt: json['generatedAt'] ?? '',
        weekStart: json['weekStart'] ?? '',
        slots: (json['slots'] as List<dynamic>? ?? [])
            .map((s) => ScheduleSlot.fromJson(s))
            .toList(),
      );

  Map<String, List<ScheduleSlot>> get byDay {
    final map = <String, List<ScheduleSlot>>{};
    for (final slot in slots) {
      map.putIfAbsent(slot.day, () => []).add(slot);
    }
    return map;
  }
}

class ChecklistItem {
  final String id;
  final String userId;
  final String lessonId;
  final String lessonName;
  final double plannedHours;
  final double actualHours;
  final bool completed;
  final String date;

  ChecklistItem({
    required this.id,
    required this.userId,
    required this.lessonId,
    required this.lessonName,
    required this.plannedHours,
    required this.actualHours,
    required this.completed,
    required this.date,
  });

  factory ChecklistItem.fromJson(Map<String, dynamic> json) => ChecklistItem(
        id: json['id'] ?? '',
        userId: json['userId'] ?? '',
        lessonId: json['lessonId'] ?? '',
        lessonName: json['lessonName'] ?? '',
        plannedHours: (json['plannedHours'] ?? 0).toDouble(),
        actualHours: (json['actualHours'] ?? 0).toDouble(),
        completed: json['completed'] ?? false,
        date: json['date'] ?? '',
      );
}
