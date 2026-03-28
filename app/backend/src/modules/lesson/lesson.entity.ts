import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Deadline } from './lesson.model';

@Entity('lessons')
export class LessonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  lessonName: string;

  @Column()
  difficulty: number;

  @Column({ type: 'jsonb', default: '[]' })
  deadlines: Deadline[];

  @Column()
  semester: string;

  @Column({ default: 0 })
  delay: number;

  @CreateDateColumn()
  createdAt: Date;
}
