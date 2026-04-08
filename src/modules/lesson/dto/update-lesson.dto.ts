import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty?: number;

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
  @IsNumber()
  @Min(1)
  semester?: number;
}
