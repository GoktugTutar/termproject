import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
  @IsString()
  semester?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  stress?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  busyTimes?: string[];
}
