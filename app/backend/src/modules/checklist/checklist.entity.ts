import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('checklists')
export class ChecklistEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  lessonId: string;

  @Column()
  lessonName: string;

  @Column()
  date: string;

  @Column({ type: 'float' })
  plannedHours: number;

  @Column({ type: 'float', nullable: true, default: null })
  actualHours: number | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'float', nullable: true, default: null })
  remaining: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
