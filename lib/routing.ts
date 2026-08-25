/**
 * Free routing via OSRM's public demo server — no API key needed.
 *
 * NOTE: This is a shared public demo instance meant for testing/light
 * use, not production traffic. Perfect for a hackathon demo; if you
 * ever ship this for real, self-host OSRM or switch to a paid provider.
 */

export interface RouteResult {
  /** Array of [lat, lng] points forming the route line, ready for Leaflet's <Polyline positions={...} />. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Routing request failed: ${res.status}`);
  }

  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No route found between these two points.');
  }

  const route = data.routes[0];

  // GeoJSON coordinates come as [lng, lat] — Leaflet wants [lat, lng], so flip them.
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  return {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
