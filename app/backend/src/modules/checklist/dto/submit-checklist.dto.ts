import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitChecklistDto {
  @IsString()
  lessonId: string;

  /**
   * Kullanıcının gerçekten harcadığı saat.
   * null göndermek "tamamlanmadı" (not_done) anlamına gelir.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  /**
   * Kullanıcı ne yaptığını belirtir:
   * 'early'      → erken bitti
   * 'completed'  → tamamlandı
   * 'incomplete' → eksik
   * 'not_done'   → tamamlanmadı
   */
  @IsIn(['early', 'completed', 'incomplete', 'not_done'])
  status: 'early' | 'completed' | 'incomplete' | 'not_done';
}
