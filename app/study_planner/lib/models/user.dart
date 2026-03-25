class User {
  final String id;
  final String name;
  final String email;
  final String? department;
  final String? grade;
  final int stress;
  final String createdAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.department,
    this.grade,
    required this.stress,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        department: json['department'],
        grade: json['grade'],
        stress: (json['stress'] ?? 0) is int
            ? json['stress']
            : (json['stress'] as double).toInt(),
        createdAt: json['createdAt'] ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'department': department,
        'grade': grade,
        'stress': stress,
        'createdAt': createdAt,
      };
}
