export type TrafficLight = 'GREEN' | 'YELLOW' | 'RED';

export type Sensitivity = 'NORMAL' | 'SENSITIVE' | 'VERY_SENSITIVE';

export interface Hotspot {
  lat: number;
  lon: number;
  description?: string;
}

export interface WindowResult {
  startHour: number;
  endHour: number;
  meanPm25: number;
  worstSlotMean: number;
  trafficLight: TrafficLight;
  hourlyPm25: number[];
}

export interface LoopResult {
  lengthMeters: number;
  durationMinutes: number;
  dose: number;
  benchCount: number;
  coordinates: [number, number][]; // [lon, lat]
  roadClassBreakdownMeters: Record<string, number>;
}

export interface PlanResponse {
  mode: 'demo' | 'live';
  window: WindowResult;
  bestLoop: LoopResult;
  baselineLoop: LoopResult;
  reductionPct: number;
  extraMinutes: number;
  disclaimer: string;
}

export interface WindowResponse {
  mode: 'demo' | 'live';
  window: WindowResult;
  disclaimer: string;
}
