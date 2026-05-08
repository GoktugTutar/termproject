import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(5)
  difficulty: number;
}
