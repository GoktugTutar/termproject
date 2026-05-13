import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [ChecklistService],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
