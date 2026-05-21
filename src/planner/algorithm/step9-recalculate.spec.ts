import { step9Recalculate } from './step9-recalculate';

describe('step9Recalculate', () => {
  it('subtracts completed blocks from today/future allocations', () => {
    expect(
      step9Recalculate(
        { 1: 4, 2: 2, 3: 1 },
        { 1: 1, 2: 2 },
      ),
    ).toEqual({ 1: 3, 3: 1 });
  });
});
