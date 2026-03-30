import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LessonSubmissionDto {
  @IsString()
  lessonId: string;

  /**
   * hoursCompleted encoding:
   *   9999  → erken bitti (inf)
   *  -9999  → hiç yapılmadı (-inf)
   *   > 0   → tamamlandı (#)
   *   < 0   → eksik (-#, value = -(hours done))
   */
  @IsNumber()
  hoursCompleted: number;
}

export class SubmitChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonSubmissionDto)
  lessons: LessonSubmissionDto[];
}
