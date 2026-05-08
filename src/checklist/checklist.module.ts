import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';

@Module({
  providers: [ChecklistService],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
