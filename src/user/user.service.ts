import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetupUserDto } from './dto/setup-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcı tercihlerini kaydet/güncelle
  async setup(userId: number, dto: SetupUserDto) {
    const { busySlots, ...rest } = dto;

    await this.prisma.user.update({
      where: { id: userId },
      data: rest,
    });

    if (busySlots !== undefined) {
      // Mevcut busy slotları sil ve yenilerini ekle
      await this.prisma.userBusySlot.deleteMany({ where: { userId } });
      if (busySlots.length > 0) {
        await this.prisma.userBusySlot.createMany({
          data: busySlots.map((s) => ({ ...s, userId })),
        });
      }
    }

    return this.getProfile(userId);
  }

  // BusySlot'ları tamamen güncelle (eski slotları sil, yenilerini ekle)
  async updateBusySlots(userId: number, busySlots: any[]) {
    await this.prisma.userBusySlot.deleteMany({ where: { userId } });
    if (busySlots.length > 0) {
      await this.prisma.userBusySlot.createMany({
        data: busySlots.map((s) => ({ ...s, userId })),
      });
    }
    return this.getProfile(userId);
  }

  // Kullanıcı profili ve busy slotları getir
  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { busySlots: true },
    });
  }
}
