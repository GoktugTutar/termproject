import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { User } from './user.model';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(data: Pick<User, 'email' | 'password'>): Promise<User> {
    const user = this.userRepo.create({
      email: data.email,
      password: data.password,
      stress: 5,
      busyTimes: [],
    });
    return this.userRepo.save(user);
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto): Promise<Omit<User, 'password'>> {
    await this.userRepo.update(id, dto as Partial<UserEntity>);
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    const { password: _pw, ...rest } = user;
    return rest;
  }
}
