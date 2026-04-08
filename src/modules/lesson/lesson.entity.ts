import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('lessons')
export class LessonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'float' })
  credit: number;

  @Column({ type: 'float' })
  difficulty: number; // D: 1–5

  @Column({ type: 'timestamptz', nullable: true })
  vizeDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalDate: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  homeworkDeadlines: string[]; // ISO date strings

  @Column()
  semester: number;

  @Column({ default: 0 })
  delayCount: number; // B
}
