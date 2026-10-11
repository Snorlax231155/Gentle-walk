import { PlanResponse, WindowResponse, Hotspot, Sensitivity } from '../types';

export interface PlanParams {
  lat: number;
  lon: number;
  radiusM: number;
  minutes: number;
  sensitivity: Sensitivity;
  lowMobility: boolean;
  hour?: number;
  hotspots?: Hotspot[];
  demo: boolean;
}

export async function fetchWindow(lat: number, lon: number, hours = 1, demo = false): Promise<WindowResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    hours: hours.toString(),
    demo: demo.toString()
  });

  const response = await fetch(`/api/window?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || `Window API error (${response.status})`);
  }
  return response.json();
}

export async function planWalk(params: PlanParams): Promise<PlanResponse> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || `Plan API error (${response.status})`);
  }
  return response.json();
}

export async function searchPlacesApi(query: string): Promise<import('../types').PlaceSearchResult[]> {
  const url = `/api/places/search?q=${encodeURIComponent(query.trim())}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }
  return response.json();
}

export async function fetchCommunityRoutes(
  lat?: number,
  lon?: number,
  radiusKm?: number
): Promise<import('../types').CommunityRoute[]> {
  const params = new URLSearchParams();
  if (lat !== undefined) params.append('lat', lat.toString());
  if (lon !== undefined) params.append('lon', lon.toString());
  if (radiusKm !== undefined) params.append('radiusKm', radiusKm.toString());

  const url = `/api/community/routes${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch community routes (${response.status})`);
  }
  return response.json();
}

export async function submitCommunityRoute(
  data: import('../types').CreateCommunityRouteRequest
): Promise<import('../types').CommunityRoute> {
  const response = await fetch('/api/community/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || `Failed to submit community route (${response.status})`);
  }
  return response.json();
}

export async function cheerCommunityRoute(
  routeId: string
): Promise<import('../types').CommunityRoute> {
  const response = await fetch(`/api/community/routes/${encodeURIComponent(routeId)}/cheer`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to cheer route (${response.status})`);
  }
  return response.json();
}

export async function walkCommunityRoute(
  routeId: string
): Promise<import('../types').CommunityRoute> {
  const response = await fetch(`/api/community/routes/${encodeURIComponent(routeId)}/walk`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to record walk (${response.status})`);
  }
  return response.json();
}

