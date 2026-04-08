import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty: number; // D

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

  @IsNumber()
  @Min(1)
  semester: number;
}
