import {
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistItemDto {
  @IsInt()
  lessonId: number;

  @IsInt()
  @Min(0)
  plannedBlocks: number;

  @IsInt()
  @Min(0)
  completedBlocks: number;

  @IsOptional()
  @IsBoolean()
  delayed?: boolean;

  @IsOptional()
  @IsBoolean()
  isReview?: boolean; // tekrar bloğu ise true
}

export class SubmitChecklistDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stressLevel: number;

  @IsInt()
  @Min(1)
  @Max(5)
  fatigueLevel: number;

  @IsOptional()
  @IsBoolean()
  sleptWell?: boolean; // frontend hazır olunca doldurulur

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];
}