import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeadlineDto {
  @IsIn(['midterm', 'final', 'homework'])
  type: 'midterm' | 'final' | 'homework';

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateLessonDto {
  @IsString()
  lessonName: string;

  @IsInt()
  @Min(1)
  @Max(5)
  difficulty: number; // D = Kredisi-zorluk

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeadlineDto)
  deadlines: DeadlineDto[];

  @IsString()
  semester: string;
}
