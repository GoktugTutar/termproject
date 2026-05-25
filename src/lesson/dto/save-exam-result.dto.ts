import { ExamFailReason } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class SaveExamResultDto {
  @IsInt()
  examId: number;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsBoolean()
  satisfied?: boolean;

  @IsOptional()
  @IsEnum(ExamFailReason)
  failReason?: ExamFailReason;
}
