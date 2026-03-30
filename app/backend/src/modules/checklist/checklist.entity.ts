import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ChecklistLesson } from './checklist.model.js';

@Entity('checklists')
export class ChecklistEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'jsonb' })
  lessons: ChecklistLesson[];

  @Column({ default: false })
  submitted: boolean;
}
