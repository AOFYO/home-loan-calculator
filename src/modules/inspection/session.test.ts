import { describe, it, expect } from 'vitest';
import { getTimePeriodCategory } from './SessionList';

describe('Time Period Classification: getTimePeriodCategory', () => {
  it('correctly categorizes timestamp created today as "today"', () => {
    const now = new Date();
    const todayIso = now.toISOString();
    expect(getTimePeriodCategory(todayIso)).toBe('today');
  });

  it('correctly categorizes timestamp created 2 days ago as "week"', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTimePeriodCategory(twoDaysAgo)).toBe('week');
  });

  it('correctly categorizes timestamp created 15 days ago as "month"', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTimePeriodCategory(fifteenDaysAgo)).toBe('month');
  });

  it('correctly categorizes timestamp created 45 days ago as "older"', () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTimePeriodCategory(fortyFiveDaysAgo)).toBe('older');
  });
});
