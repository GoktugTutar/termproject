import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

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
  busyTimes?: Record<string, Record<string, string>>;
}
