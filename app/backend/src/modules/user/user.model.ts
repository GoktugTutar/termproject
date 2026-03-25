export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  department?: string;
  grade?: string;
  stress: number; // 0-10
  createdAt: string;
}
