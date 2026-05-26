import { Module } from '@nestjs/common';
import { UserConstraintService } from './user-constraint.service';
import { UserConstraintController } from './user-constraint.controller';

@Module({
  providers: [UserConstraintService],
  controllers: [UserConstraintController],
  exports: [UserConstraintService],
})
export class UserConstraintModule {}
