import { describe, expect, it } from 'vitest';
import {
  RATING_STYLES,
  UNRATED_STYLE,
  getRatingStyle,
} from './ratingColors.js';

describe('getRatingStyle', () => {
  it('returns the correct style for ratings 1 through 5', () => {
    for (let rating = 1; rating <= 5; rating += 1) {
      expect(getRatingStyle(rating)).toBe(RATING_STYLES[rating]);
    }
  });

  it('returns the unrated style for unknown ratings', () => {
    expect(getRatingStyle(null)).toBe(UNRATED_STYLE);
    expect(getRatingStyle(undefined)).toBe(UNRATED_STYLE);
    expect(getRatingStyle(0)).toBe(UNRATED_STYLE);
    expect(getRatingStyle(6)).toBe(UNRATED_STYLE);
  });

  it('preserves the five map rating colors', () => {
    expect(RATING_STYLES[5].color).toBe('#E65100');
    expect(RATING_STYLES[4].color).toBe('#F57C00');
    expect(RATING_STYLES[3].color).toBe('#FFD600');
    expect(RATING_STYLES[2].color).toBe('#558B2F');
    expect(RATING_STYLES[1].color).toBe('#0288D1');
  });

  it('uses gray for unrated stairways', () => {
    expect(UNRATED_STYLE.color).toBe('#9e9e9e');
  });
});
