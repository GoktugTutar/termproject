import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.model';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

const DATA_PATH = path.join(__dirname, '../../data/users.json');

@Injectable()
export class UserService {
  private read(): User[] {
    try {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }

  private write(users: User[]): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2));
  }

  findById(id: string): User | undefined {
    return this.read().find((u) => u.id === id);
  }

  findByEmail(email: string): User | undefined {
    return this.read().find((u) => u.email === email);
  }

  create(data: Pick<User, 'email' | 'password'>): User {
    const users = this.read();
    const user: User = {
      id: uuidv4(),
      email: data.email,
      password: data.password,
      stress: 5,
      busyTimes: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this.write(users);
    return user;
  }

  updateProfile(id: string, dto: UpdateUserProfileDto): Omit<User, 'password'> {
    const users = this.read();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Kullanıcı bulunamadı');
    users[idx] = { ...users[idx], ...dto };
    this.write(users);
    const { password: _pw, ...rest } = users[idx];
    return rest;
  }
}
