// BusyTime format: { "monday": { "9-12": "iş", "14-16": "spor" }, ... }
export type BusyTimeMap = Record<string, Record<string, string>>;

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  gpa: number | null;
  semester: number | null;
  stressLevel: number; // S: 1–5
  busyTimes: BusyTimeMap | null;
}
