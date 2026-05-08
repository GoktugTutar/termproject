import { IsString, IsArray, IsInt, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class LessonFeedbackDto {
  @IsInt()
  lessonId: number;

  @IsInt()
  needsMoreTime: number; // -1 | 0 | +1
}

export class WeeklyFeedbackDto {
  @IsString()
  @IsIn(['cok_yogundu', 'tam_uygundu', 'yetersizdi'])
  weekloadFeedback: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonFeedbackDto)
  lessonFeedbacks: LessonFeedbackDto[];
}
