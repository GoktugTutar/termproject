import { Module } from '@nestjs/common';
import { HeuristicService } from './heuristic.service';

@Module({
  providers: [HeuristicService],
  exports: [HeuristicService],
})
export class HeuristicModule {}
