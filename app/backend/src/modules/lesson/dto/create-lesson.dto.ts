import { IsDateString, IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  lessonName: string;

  @IsInt()
  @Min(1)
  @Max(3)
  difficulty: number;

  @IsDateString()
  examDate: string;

  @IsIn(['quiz', 'midterm', 'final'])
  examType: string;

  @IsInt()
  @Min(1)
  allocatedHours: number;
}
