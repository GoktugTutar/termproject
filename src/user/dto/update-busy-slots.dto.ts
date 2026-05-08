import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BusySlotDto } from './setup-user.dto';

export class UpdateBuslySlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusySlotDto)
  busySlots: BusySlotDto[];
}
