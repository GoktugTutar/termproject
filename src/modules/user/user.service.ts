import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { hourToTimeDate, todayString, dateStringToDate } from '../../common/utils/date.utils';

type BusyTimeMap = Record<string, Record<string, string>>;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { email: string; password: string; name?: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name?.trim() || this.fallbackNameFromEmail(data.email),
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { busySlots: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { busySlots: true },
    });
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gpa !== undefined && { gpa: dto.gpa }),
        ...(dto.semester !== undefined && { semester: dto.semester }),
      },
    });

    if (dto.busyTimes !== undefined) {
      await this.replaceBusySlots(id, dto.busyTimes);
    }

    if (dto.stressLevel !== undefined) {
      await this.upsertTodayStressLevel(id, dto.stressLevel);
    }

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('User not found');
    return this.toPublic(updated, await this.getLatestStressLevel(id));
  }

  async getProfile(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user, await this.getLatestStressLevel(id));
  }

  async delete(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
  }

  getBusyTimeMap(user: { busySlots: any[] }): BusyTimeMap {
    return this.busySlotsToMap(user.busySlots ?? []);
  }

  private toPublic(user: any, stressLevel: number) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      gpa: user.gpa,
      semester: user.semester,
      stressLevel,
      busyTimes: this.getBusyTimeMap(user),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async replaceBusySlots(userId: string, busyTimes: BusyTimeMap) {
    await this.prisma.userBusySlot.deleteMany({ where: { userId } });

    const slots = this.normalizeBusyTimes(busyTimes).map((slot) => ({
      userId,
      dayOfWeek: slot.dayOfWeek,
      startTime: hourToTimeDate(slot.startHour),
      endTime: hourToTimeDate(slot.endHour),
      reason: slot.reason,
    }));

    if (slots.length > 0) {
      await this.prisma.userBusySlot.createMany({ data: slots });
    }
  }

  async upsertTodayStressLevel(userId: string, stressLevel: number) {
    const checklistDate = dateStringToDate(todayString());
    await this.prisma.dailyChecklist.upsert({
      where: { userId_checklistDate: { userId, checklistDate } },
      update: { stressLevel },
      create: { userId, checklistDate, stressLevel, submitted: false },
    });
  }

  async getLatestStressLevel(userId: string): Promise<number> {
    const latest = await this.prisma.dailyChecklist.findFirst({
      where: { userId },
      orderBy: { checklistDate: 'desc' },
    });
    return latest?.stressLevel ?? 3;
  }

  private fallbackNameFromEmail(email: string): string {
    const local = email.split('@')[0]?.trim();
    return local ? local.replace(/[._-]+/g, ' ') : 'User';
  }

  private busySlotsToMap(slots: any[]): BusyTimeMap {
    const result: BusyTimeMap = {};
    for (const slot of slots) {
      const day = this.normalizeDayOfWeek(slot.dayOfWeek);
      const startHour = slot.startTime instanceof Date
        ? slot.startTime.getUTCHours()
        : Number(String(slot.startTime).split(':')[0]);
      const endHour = slot.endTime instanceof Date
        ? slot.endTime.getUTCHours()
        : Number(String(slot.endTime).split(':')[0]);
      if (!day || endHour <= startHour) continue;
      (result[day] ??= {})[`${startHour}-${endHour}`] = slot.reason?.trim() || 'Mesgul';
    }
    return result;
  }

  private normalizeBusyTimes(busyTimes: BusyTimeMap) {
    const normalized: { dayOfWeek: string; startHour: number; endHour: number; reason: string | null }[] = [];
    for (const [rawDay, ranges] of Object.entries(busyTimes ?? {})) {
      const dayOfWeek = this.normalizeDayOfWeek(rawDay);
      if (!dayOfWeek || !ranges || typeof ranges !== 'object') continue;
      for (const [range, reason] of Object.entries(ranges)) {
        const parsed = this.normalizeRange(range);
        if (!parsed) continue;
        normalized.push({
          dayOfWeek,
          startHour: parsed.startHour,
          endHour: parsed.endHour,
          reason: (reason as string)?.trim() || null,
        });
      }
    }
    return normalized;
  }

  private normalizeDayOfWeek(day: string): string | null {
    const n = day
      .toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .trim();
    if (n.includes('monday') || n.includes('pazartesi')) return 'monday';
    if (n.includes('tuesday') || n.includes('sali')) return 'tuesday';
    if (n.includes('wednesday') || n.includes('carsamba')) return 'wednesday';
    if (n.includes('thursday') || n.includes('persembe')) return 'thursday';
    if (n.includes('friday') || n.includes('cuma')) return 'friday';
    if (n.includes('saturday') || n.includes('cumartesi')) return 'saturday';
    if (n.includes('sunday') || n.includes('pazar')) return 'sunday';
    return null;
  }

  private normalizeRange(range: string): { startHour: number; endHour: number } | null {
    const match = range.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;
    const startHour = Number(match[1]);
    const endMinute = Number(match[4] ?? '0');
    const rawEndHour = Number(match[3]);
    const endHour = rawEndHour + (endMinute > 0 ? 1 : 0);
    if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || startHour < 0 || endHour > 24) return null;
    if (endHour <= startHour) return null;
    return { startHour, endHour };
  }
}
