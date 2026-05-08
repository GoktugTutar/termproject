import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Uygulama başladığında veritabanı bağlantısını kur
  async onModuleInit() {
    await this.$connect();
  }
}
