// Çalışma zamanında override edilebilir test saati (sadece MODE=test)
let _testOverride: Date | null = null;

export function setTestTimeOverride(dt: Date | null): void {
  _testOverride = dt;
}

// MODE=test ise önce runtime override, sonra env değişkeni, son olarak gerçek saat
export function getCurrentTime(): Date {
  if (process.env.MODE === 'test') {
    if (_testOverride) return new Date(_testOverride);
    if (process.env.TEST_CURRENT_TIME) {
      return new Date(process.env.TEST_CURRENT_TIME);
    }
  }
  return new Date();
}
