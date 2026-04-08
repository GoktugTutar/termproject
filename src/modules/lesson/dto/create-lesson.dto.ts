import {
  IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString,
  Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLessonExamDto {
  @IsString()
  @IsIn(['midterm', 'final', 'quiz'])
  examType: string;

  @IsDateString()
  examDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercentage?: number;
}

export class CreateLessonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty: number;

  @IsOptional()
  @IsDateString()
  vizeDate?: string;

  @IsOptional()
  @IsDateString()
  finalDate?: string;

  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  homeworkDeadlines?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonExamDto)
  exams?: CreateLessonExamDto[];

  @IsNumber()
  @Min(1)
  semester: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingTopicsCount?: number;
}
