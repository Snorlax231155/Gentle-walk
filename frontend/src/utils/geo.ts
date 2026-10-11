/**
 * Geospatial utilities for distance and walking duration estimation
 */

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates total distance in meters along a sequential coordinate path [[lon, lat], ...]
 */
export function calculatePathDistanceMeters(coordinates: [number, number][]): number {
  if (!coordinates || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    total += haversineDistanceMeters(lat1, lon1, lat2, lon2);
  }
  return Math.round(total);
}

/**
 * Estimates elder gentle walking minutes based on distance (~4 km/h pace = ~67 meters/min)
 */
export function estimateElderMinutes(meters: number): number {
  if (meters <= 0) return 0;
  return Math.max(2, Math.round(meters / 67));
}
