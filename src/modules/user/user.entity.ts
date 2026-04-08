import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import type { BusyTimeMap } from './user.model.js';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'float', nullable: true })
  gpa: number;

  @Column({ nullable: true })
  semester: number;

  @Column({ type: 'float', default: 1 })
  stressLevel: number; // S: 1–5

  @Column({ type: 'jsonb', nullable: true })
  busyTimes: BusyTimeMap;
}
