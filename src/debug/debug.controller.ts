import { Body, Controller, Get, Post } from '@nestjs/common';
import { getCurrentTime, setTestTimeOverride } from '../utils/time.util';

/** Sadece MODE=test ortamında kullanılır. Prod'da güvenlik riski oluşturur. */
@Controller('debug')
export class DebugController {
  /** Aktif modu döndürür: { mode: "test" | "prod", current: string } */
  @Get('mode')
  getMode(): { mode: string; current: string } {
    return {
      mode: process.env.MODE === 'test' ? 'test' : 'prod',
      current: getCurrentTime().toISOString(),
    };
  }

  /** Backend'in kullandığı saati override eder. Body: { datetime: string } */
  @Post('clock')
  setClock(@Body() body: { datetime?: string }): { current: string } {
    if (process.env.MODE !== 'test') {
      return { current: 'not in test mode' };
    }
    if (!body?.datetime) {
      setTestTimeOverride(null);
      return { current: 'reset' };
    }
    const dt = new Date(body.datetime);
    setTestTimeOverride(dt);
    return { current: dt.toISOString() };
  }
}
