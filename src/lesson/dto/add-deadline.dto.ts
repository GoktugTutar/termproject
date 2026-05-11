import { IsString, IsOptional, Matches } from 'class-validator';

export class AddDeadlineDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deadlineDate must be YYYY-MM-DD' })
  deadlineDate!: string;

  @IsOptional()
  @IsString()
  title?: string;
}