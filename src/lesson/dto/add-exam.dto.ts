import { IsDateString } from 'class-validator';

export class AddExamDto {
  @IsDateString()
  examDate: string;
}
