import { IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class SubmitChecklistDto {
  @IsString()
  lessonId: string;

  @IsInt()
  @Min(0)
  plannedHours: number;

  @IsInt()
  @Min(0)
  actualHours: number;

  @IsBoolean()
  completed: boolean;
}
