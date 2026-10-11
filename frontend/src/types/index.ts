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

export interface IndoorVenue {
  name: string;
  category: string;
  lat: number;
  lon: number;
  distanceKm: number;
  estimatedLoopMeters: number;
  filtrationStatus: string;
  hasRestBenches: boolean;
  elevatorAccessible: boolean;
  openingHours: string;
  seniorTip: string;
  amenities: string[];
}

export interface PlanResponse {
  mode: 'demo' | 'live';
  window: WindowResult;
  bestLoop: LoopResult;
  baselineLoop: LoopResult;
  reductionPct: number;
  extraMinutes: number;
  disclaimer: string;
  indoorFallbacks?: IndoorVenue[];
}

export interface WindowResponse {
  mode: 'demo' | 'live';
  window: WindowResult;
  disclaimer: string;
}

export interface PlaceSearchResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  isCurated: boolean;
}

export type StopType = 'BENCH' | 'SHADE' | 'WATER' | 'GARDEN' | 'SANCTUARY' | 'VIEWPOINT' | 'CAFE' | 'RESTROOM';

export interface CommunityStop {
  id: string;
  name: string;
  type: StopType | string;
  description: string;
  lat: number;
  lon: number;
}

export interface CommunityRoute {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  startLat: number;
  startLon: number;
  lengthMeters: number;
  durationMinutes: number;
  benchCount: number;
  estimatedPm25: number;
  trafficLight: TrafficLight | string;
  coordinates: [number, number][]; // [lon, lat] pairs
  stops: CommunityStop[];
  walkersCount: number;
  cheersCount: number;
  createdAt: string;
}

export interface CreateCommunityRouteRequest {
  title: string;
  author: string;
  description: string;
  tags: string[];
  startLat: number;
  startLon: number;
  lengthMeters: number;
  durationMinutes: number;
  benchCount: number;
  estimatedPm25?: number;
  trafficLight?: string;
  coordinates: [number, number][];
  stops?: CommunityStop[];
}
