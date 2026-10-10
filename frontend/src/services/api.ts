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
