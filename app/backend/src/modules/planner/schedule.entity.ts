import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * schedule JSON shape:
 * {
 *   "monday":    { "9-11": "<lessonId>", "11-14": "<lessonId2>", "14-16": "busy:iş" },
 *   "tuesday":   { ... },
 *   ...
 * }
 */
@Entity('schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  startDate: string; // Monday of the week (YYYY-MM-DD)

  @Column({ type: 'date' })
  endDate: string; // Sunday of the week

  @Column({ type: 'jsonb' })
  schedule: Record<string, Record<string, string>>;
}
