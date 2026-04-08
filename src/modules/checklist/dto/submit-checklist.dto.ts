import {
  IsArray, IsBoolean, IsNumber, IsOptional, IsString,
  Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LessonSubmissionDto {
  @IsString()
  lessonId: string;

  /** positive = completed hours, negative = partial/skipped, 9999 = completed early, -9999 = not done at all */
  @IsNumber()
  hoursCompleted: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyFeedback?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  focusFeedback?: number;

  @IsOptional()
  @IsBoolean()
  taskFeltLong?: boolean;

  @IsOptional()
  @IsString()
  postponementReason?: string;
}

export class SubmitChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonSubmissionDto)
  lessons: LessonSubmissionDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallFocusScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallEnergyScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  todaySleeped?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  stressLevel?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
