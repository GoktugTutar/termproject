import { IsString, IsNumber, IsOptional, Min, Max, IsObject } from 'class-validator';
import type { BusyTimeMap } from '../user.model.js';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  semester?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  stressLevel?: number;

  @IsOptional()
  @IsObject()
  busyTimes?: BusyTimeMap;
}
