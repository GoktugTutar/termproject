import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StudyTime, StudyStyle } from '@prisma/client';

export class BusySlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  @Min(1)
  @Max(5)
  fatigueLevel: number;

  @IsOptional()
  @IsBoolean()
  isRoutine?: boolean;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  iconKey?: string;
}

export class SetupUserDto {
  @IsOptional()
  @IsEnum(StudyTime)
  preferredStudyTime?: StudyTime;

  @IsOptional()
  @IsEnum(StudyStyle)
  studyStyle?: StudyStyle;

  /** Öğrencinin sınıfı (1–8). Onboarding adım 0'da girilir. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  gradeLevel?: number;

  /** Öğrencinin GPA'sı (0–4). Onboarding adım 0'da girilir. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  /** Dönem adı (ör. "2026 Bahar"). User.academicTerm ve aktif Term.name'e yazılır. */
  @IsOptional()
  @IsString()
  academicTerm?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(70)
  weeklyStudyHours?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusySlotDto)
  busySlots?: BusySlotDto[];
}
