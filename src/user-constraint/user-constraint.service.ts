import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Bir kullanıcının aktif planlama tercihlerini yönetir.
// Aynı tipte birden fazla aktif kayıt olmaması için yeni kayıt önce eskileri kapatır.
// İstisna: 'day_study_time' her gün için ayrı kayıt olduğundan dayOfWeek bazlı kapatılır.
@Injectable()
export class UserConstraintService {
  constructor(private prisma: PrismaService) {}

  private readonly VALID_TYPES = [
    'allow_consecutive_agir',
    'disable_slotted_mode',
    'study_end_hour',
    'study_start_hour',
    'day_study_time',
  ];

  // Kullanıcının aktif (ve süresi geçmemiş) tüm tercihlerini listele
  async list(userId: number) {
    const now = new Date();
    return this.prisma.userConstraint.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Yeni tercih kaydet; aynı tip varsa eskisini kapat
  async create(
    userId: number,
    type: string,
    params: Record<string, any> = {},
    source: string = 'user_manual',
    expiresAt: Date | null = null,
  ) {
    if (!this.VALID_TYPES.includes(type)) {
      throw new BadRequestException(`Geçersiz constraint tipi: ${type}`);
    }

    // Aynı tipten aktif kayıtları kapat (day_study_time için dayOfWeek bazında)
    if (type === 'day_study_time') {
      const dow = Number(params.dayOfWeek);
      if (dow < 1 || dow > 7) {
        throw new BadRequestException('dayOfWeek 1-7 arasında olmalı');
      }
      const existing = await this.prisma.userConstraint.findMany({
        where: { userId, type, isActive: true },
      });
      for (const e of existing) {
        const existingDow = Number((e.params as any)?.dayOfWeek);
        if (existingDow === dow) {
          await this.prisma.userConstraint.update({
            where: { id: e.id },
            data: { isActive: false },
          });
        }
      }
    } else {
      await this.prisma.userConstraint.updateMany({
        where: { userId, type, isActive: true },
        data: { isActive: false },
      });
    }

    return this.prisma.userConstraint.create({
      data: {
        userId,
        type,
        params,
        source,
        expiresAt,
        confirmedByUser: source === 'user_manual',
      },
    });
  }

  // Bir tercihi kaldır (isActive=false) — bir sonraki planda varsayılana döner
  async remove(userId: number, id: number) {
    const record = await this.prisma.userConstraint.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new BadRequestException('Tercih bulunamadı');
    }
    return this.prisma.userConstraint.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
