import { IsInt, IsArray, IsBoolean, IsOptional, Min, Max, ValidateNested } from 'class-validator';
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
}

export class SubmitChecklistDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevel: number;

  @IsInt()
  @Min(1)
  @Max(5)
  fatigueLevel: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];
}
