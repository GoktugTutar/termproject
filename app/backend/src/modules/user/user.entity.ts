import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

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
  semester: string;

  @Column({ default: 5 })
  stress: number;

  @Column({ type: 'jsonb', default: '[]' })
  busyTimes: string[];

  @CreateDateColumn()
  createdAt: Date;
}
