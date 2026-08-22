export const GPS_THRESHOLD_FEET = 300;
export const GPS_THRESHOLD_METERS = GPS_THRESHOLD_FEET * 0.3048;

export function pointToSegmentDistanceMeters(point, segStart, segEnd) {
  const refLat = segStart.lat;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);

  const toLocalXY = (lat, lng) => ({
    x: lng * metersPerDegLng,
    y: lat * metersPerDegLat,
  });

  const p = toLocalXY(point.lat, point.lng);
  const a = toLocalXY(segStart.lat, segStart.lng);
  const b = toLocalXY(segEnd.lat, segEnd.lng);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  const ddx = p.x - closestX;
  const ddy = p.y - closestY;

  return Math.sqrt(ddx * ddx + ddy * ddy);
}

export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getVerificationThresholdMeters(stairway) {
  return stairway.verification_radius_feet != null
    ? stairway.verification_radius_feet * 0.3048
    : GPS_THRESHOLD_METERS;
}
