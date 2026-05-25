import { isFirstWeekDate } from './first-week.util';

describe('isFirstWeekDate', () => {
  it('returns false when the user has no first week start date', () => {
    expect(isFirstWeekDate(null, new Date(2026, 4, 21))).toBe(false);
  });

  it('returns true for dates in the registration Monday-Sunday week', () => {
    const currentTermStartedAt = new Date(2026, 4, 21); // Thursday

    expect(isFirstWeekDate(currentTermStartedAt, new Date(2026, 4, 18))).toBe(
      true,
    );
    expect(isFirstWeekDate(currentTermStartedAt, new Date(2026, 4, 24))).toBe(
      true,
    );
  });

  it('returns false for dates outside the registration week', () => {
    const currentTermStartedAt = new Date(2026, 4, 21);

    expect(isFirstWeekDate(currentTermStartedAt, new Date(2026, 4, 25))).toBe(
      false,
    );
  });
});
