import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemFeedbackService {
  constructor(private prisma: PrismaService) {}

  // Sistemin topladığı verileri derleyip Claude Haiku'ya göndererek Türkçe mesaj üret
  async getMessage(userId: number): Promise<{ message: string }> {
    // TODO: implement
    return { message: '' };
  }
}
