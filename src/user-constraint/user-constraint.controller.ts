import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserConstraintService } from './user-constraint.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-constraint')
export class UserConstraintController {
  constructor(private service: UserConstraintService) {}

  // Profil ekranı için: kullanıcının aktif tercihlerini döndür
  @Get()
  list(@Request() req) {
    return this.service.list(req.user.id);
  }

  // Yeni tercih ekle — body: { type, params?, source?, expiresAt? }
  @Post()
  create(
    @Request() req,
    @Body() body: { type: string; params?: Record<string, any>; source?: string; expiresAt?: string },
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    return this.service.create(
      req.user.id,
      body.type,
      body.params ?? {},
      body.source ?? 'user_manual',
      expiresAt,
    );
  }

  // Tercihi kaldır → bir sonraki planda varsayılan davranışa döner
  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.user.id, id);
  }
}
