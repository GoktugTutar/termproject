export interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  gpa?: number;          // GPA (0.0 - 4.0)
  semester?: string;     // Hangi dönem (örn. "2024-2025 Bahar")
  stress: number;        // S = stres seviyesi (0-10)
  busyTimes: string[];   // Dolu olduğu zamanlar (örn. ["Pazartesi 09:00-11:00"])
  createdAt: string;
}
