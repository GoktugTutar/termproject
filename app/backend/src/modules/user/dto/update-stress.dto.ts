import { IsInt, Max, Min } from 'class-validator';

export class UpdateStressDto {
  @IsInt()
  @Min(0)
  @Max(10)
  stress: number;
}
