import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    const existing = this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Bu email zaten kayıtlı');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userService.create({
      email: dto.email,
      password: hashedPassword,
    });

    return this.signToken(user);
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email veya şifre hatalı');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Email veya şifre hatalı');

    return this.signToken(user);
  }

  getMe(userId: string): Omit<User, 'password'> {
    const user = this.userService.findById(userId);
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    const { password: _pw, ...rest } = user;
    return rest;
  }

  private signToken(user: User): { access_token: string } {
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
