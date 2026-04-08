import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { LessonEntity } from '../lesson/lesson.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';

export type PublicUser = Omit<UserEntity, 'password'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(ChecklistEntity)
    private readonly checklistRepo: Repository<ChecklistEntity>,
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
  ) {}

  async create(data: { email: string; password: string }): Promise<UserEntity> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async updateProfile(
    id: string,
    dto: UpdateUserProfileDto,
  ): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async getProfile(id: string): Promise<PublicUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.lessonRepo.delete({ userId: id });
    await this.checklistRepo.delete({ userId: id });
    await this.scheduleRepo.delete({ userId: id });
    await this.repo.remove(user);
  }

  toPublic(user: UserEntity): PublicUser {
    const { password: _password, ...publicUser } = user;
    return publicUser;
  }
}
