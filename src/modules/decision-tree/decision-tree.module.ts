import { Module } from '@nestjs/common';
import { DecisionTreeService } from './decision-tree.service';

@Module({
  providers: [DecisionTreeService],
  exports: [DecisionTreeService],
})
export class DecisionTreeModule {}
