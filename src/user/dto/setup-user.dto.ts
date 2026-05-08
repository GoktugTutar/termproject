import { IsEnum, IsOptional, IsArray, ValidateNested, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { StudyTime, StudyStyle } from '@prisma/client';

export class BusySlotDto {
  @IsInt()
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  @Min(1)
  @Max(5)
  fatigueLevel: number;
}

export class SetupUserDto {
  @IsOptional()
  @IsEnum(StudyTime)
  preferredStudyTime?: StudyTime;

  @IsOptional()
  @IsEnum(StudyStyle)
  studyStyle?: StudyStyle;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusySlotDto)
  busySlots?: BusySlotDto[];
}
