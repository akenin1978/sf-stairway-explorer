import { describe, expect, it } from 'vitest';
import {
  GPS_THRESHOLD_FEET,
  GPS_THRESHOLD_METERS,
  getVerificationThresholdMeters,
  haversineDistanceMeters,
  pointToSegmentDistanceMeters,
} from './verificationUtils.js';

describe('haversineDistanceMeters', () => {
  it('returns zero for identical points', () => {
    expect(
      haversineDistanceMeters(37.7749, -122.4194, 37.7749, -122.4194)
    ).toBeCloseTo(0, 6);
  });

  it('returns a plausible distance for nearby SF coordinates', () => {
    const distance = haversineDistanceMeters(
      37.7749,
      -122.4194,
      37.7759,
      -122.4194
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });
});

describe('pointToSegmentDistanceMeters', () => {
  const start = { lat: 37.7749, lng: -122.42 };
  const end = { lat: 37.7749, lng: -122.418 };

  it('returns near zero for a point on the segment', () => {
    const distance = pointToSegmentDistanceMeters(
      { lat: 37.7749, lng: -122.419 },
      start,
      end
    );

    expect(distance).toBeLessThan(0.01);
  });

  it('measures perpendicular distance to the middle of a segment', () => {
    const distance = pointToSegmentDistanceMeters(
      { lat: 37.7759, lng: -122.419 },
      start,
      end
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });

  it('clamps to the nearest endpoint instead of the infinite line', () => {
    const distance = pointToSegmentDistanceMeters(
      { lat: 37.7749, lng: -122.421 },
      start,
      end
    );

    expect(distance).toBeGreaterThan(80);
    expect(distance).toBeLessThan(100);
  });
});

describe('verification threshold', () => {
  it('uses 300 feet by default', () => {
    expect(GPS_THRESHOLD_FEET).toBe(300);
    expect(GPS_THRESHOLD_METERS).toBeCloseTo(91.44, 2);
    expect(getVerificationThresholdMeters({})).toBeCloseTo(91.44, 2);
  });

  it('uses a stairway-specific override when present', () => {
    expect(
      getVerificationThresholdMeters({ verification_radius_feet: 500 })
    ).toBeCloseTo(152.4, 2);
  });
});
