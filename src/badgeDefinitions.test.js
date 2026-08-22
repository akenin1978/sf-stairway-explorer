import { describe, expect, it } from 'vitest';
import {
  MILESTONE_BADGES,
  SPECIAL_BADGES,
  NEIGHBORHOOD_BADGES,
  milestoneTier,
} from './badgeDefinitions.js';

describe('milestoneTier', () => {
  it('assigns bronze below 200', () => {
    expect(milestoneTier(1)).toBe('bronze');
    expect(milestoneTier(25)).toBe('bronze');
    expect(milestoneTier(100)).toBe('bronze');
  });

  it('assigns silver from 200 through 999', () => {
    expect(milestoneTier(200)).toBe('silver');
    expect(milestoneTier(500)).toBe('silver');
    expect(milestoneTier(999)).toBe('silver');
  });

  it('assigns gold at 1000+, and for the all badge', () => {
    expect(milestoneTier(1000)).toBe('gold');
    expect(milestoneTier(1100)).toBe('gold');
    expect(milestoneTier('all')).toBe('gold');
  });
});

describe('badge definitions', () => {
  it('has unique badge ids across all badge categories', () => {
    const ids = [
      ...NEIGHBORHOOD_BADGES.map((badge) => badge.id),
      ...MILESTONE_BADGES.map((badge) => badge.id),
      ...SPECIAL_BADGES.map((badge) => badge.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves critical permanent milestone ids', () => {
    expect(MILESTONE_BADGES.find((b) => b.threshold === 1)?.id).toBe('milestone-1');
    expect(MILESTONE_BADGES.find((b) => b.threshold === 1000)?.id).toBe('milestone-1000');
    expect(MILESTONE_BADGES.find((b) => b.threshold === 'all')?.id).toBe('milestone-all');
  });

  it('preserves the special Best of the Best badge id', () => {
    expect(SPECIAL_BADGES[0]?.id).toBe('special-best-of-the-best');
  });
});
