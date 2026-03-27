import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeadlineDto } from './create-lesson.dto';

export class UpdateLessonDto {
  @IsString()
  lessonName: string; // Hangi dersin güncelleneceğini belirtir (isimle arama)

  @IsOptional()
  @IsString()
  newLessonName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeadlineDto)
  deadlines?: DeadlineDto[];

  @IsOptional()
  @IsString()
  semester?: string;
}
