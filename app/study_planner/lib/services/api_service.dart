import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/lesson.dart';
import '../models/schedule.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> _handleResponse(
      http.Response res) async {
    final body = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw ApiException(
        body['message'] ?? 'Bir hata oluştu', res.statusCode);
  }

  // Auth
  static Future<String> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: await _headers(auth: false),
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = await _handleResponse(res);
    await saveToken(data['access_token']);
    return data['access_token'];
  }

  static Future<String> register(
      String name, String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: await _headers(auth: false),
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    final data = await _handleResponse(res);
    await saveToken(data['access_token']);
    return data['access_token'];
  }

  static Future<User> getMe() async {
    final res = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: await _headers(),
    );
    final data = await _handleResponse(res);
    return User.fromJson(data);
  }

  // User
  static Future<User> getProfile() async {
    final res = await http.get(
      Uri.parse('$baseUrl/user/profile'),
      headers: await _headers(),
    );
    final data = await _handleResponse(res);
    return User.fromJson(data);
  }

  static Future<User> updateProfile(Map<String, dynamic> body) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/user/profile'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _handleResponse(res);
    return User.fromJson(data);
  }

  static Future<User> updateStress(int stress) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/user/stress'),
      headers: await _headers(),
      body: jsonEncode({'stress': stress}),
    );
    final data = await _handleResponse(res);
    return User.fromJson(data);
  }

  // Lessons
  static Future<List<Lesson>> getLessons() async {
    final res = await http.get(
      Uri.parse('$baseUrl/lesson'),
      headers: await _headers(),
    );
    final List data = await _handleResponse(res) as List? ?? [];
    return data.map((l) => Lesson.fromJson(l)).toList();
  }

  static Future<Lesson> createLesson(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl/lesson'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _handleResponse(res);
    return Lesson.fromJson(data);
  }

  static Future<Lesson> updateLesson(
      String id, Map<String, dynamic> body) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/lesson/$id'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _handleResponse(res);
    return Lesson.fromJson(data);
  }

  static Future<void> deleteLesson(String id) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/lesson/$id'),
      headers: await _headers(),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final body = jsonDecode(res.body);
      throw ApiException(body['message'] ?? 'Silinemedi', res.statusCode);
    }
  }

  // Planner
  static Future<WeeklySchedule> getSchedule() async {
    final res = await http.get(
      Uri.parse('$baseUrl/planner/schedule'),
      headers: await _headers(),
    );
    final data = await _handleResponse(res);
    return WeeklySchedule.fromJson(data);
  }

  // Checklist
  static Future<List<ChecklistItem>> getTodayChecklist() async {
    final res = await http.get(
      Uri.parse('$baseUrl/checklist/today'),
      headers: await _headers(),
    );
    final List data = jsonDecode(res.body);
    return data.map((c) => ChecklistItem.fromJson(c)).toList();
  }

  static Future<ChecklistItem> submitChecklist(
      Map<String, dynamic> body) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/checklist/submit'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _handleResponse(res);
    return ChecklistItem.fromJson(data);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
