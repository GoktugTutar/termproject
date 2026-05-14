import * as fs from 'fs';
import * as path from 'path';

const OVERRIDE_FILE = path.join(process.cwd(), '.clock-override');

// Sunucu başlarken dosyadan yükle
let _testOverride: Date | null = null;
if (process.env.MODE === 'test') {
  try {
    const raw = fs.readFileSync(OVERRIDE_FILE, 'utf-8').trim();
    if (raw) _testOverride = new Date(raw);
  } catch (_) {}
}

export function setTestTimeOverride(dt: Date | null): void {
  _testOverride = dt ? new Date(dt) : null;
  if (process.env.MODE === 'test') {
    try {
      if (dt) {
        fs.writeFileSync(OVERRIDE_FILE, dt.toISOString(), 'utf-8');
      } else if (fs.existsSync(OVERRIDE_FILE)) {
        fs.unlinkSync(OVERRIDE_FILE);
      }
    } catch (_) {}
  }
}

// MODE=test ise önce override (bellekte + dosyada), sonra gerçek saat
export function getCurrentTime(): Date {
  if (process.env.MODE === 'test' && _testOverride) {
    return new Date(_testOverride);
  }
  return new Date();
}
