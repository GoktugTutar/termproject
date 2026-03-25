import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class TrackLessonDto {
  @IsInt()
  @Min(0)
  plannedHours: number;

  @IsInt()
  @Min(0)
  actualHours: number;

  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsBoolean()
  finishedEarly?: boolean;
}
