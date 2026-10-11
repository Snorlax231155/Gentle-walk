import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { LoopResult, Hotspot, CommunityStop } from '../types';

interface GoogleRouteMapProps {
  apiKey: string;
  center: [number, number];
  cleanLoop?: LoopResult;
  typicalLoop?: LoopResult;
  hotspots: Hotspot[];
  onAddHotspot: (lat: number, lon: number) => void;
  onSetStartCoords?: (lat: number, lon: number) => void;
  cleanLoopLabel: string;
  typicalLoopLabel: string;
  clickAction?: 'set-start' | 'add-hotspot';
  communityStops?: CommunityStop[];
}

// Polyline component using Google Maps JS API within @vis.gl/react-google-maps
function GooglePolyline({
  path,
  strokeColor,
  strokeWeight,
  strokeOpacity,
  dashed,
}: {
  path: google.maps.LatLngLiteral[];
  strokeColor: string;
  strokeWeight: number;
  strokeOpacity: number;
  dashed?: boolean;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length === 0) return;

    const lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 3,
    };

    const polyline = new google.maps.Polyline({
      path,
      strokeColor,
      strokeOpacity: dashed ? 0 : strokeOpacity,
      strokeWeight,
      icons: dashed
        ? [
            {
              icon: lineSymbol,
              offset: '0',
              repeat: '15px',
            },
          ]
        : undefined,
      map,
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, strokeColor, strokeWeight, strokeOpacity, dashed]);

  return null;
}

// Auto-fit bounds controller
function MapBoundsController({
  cleanPath,
  center,
}: {
  cleanPath: google.maps.LatLngLiteral[];
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (cleanPath.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      cleanPath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 50);
    } else {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(16);
    }
  }, [map, cleanPath, center]);

  return null;
}

export const GoogleRouteMap: React.FC<GoogleRouteMapProps> = ({
  apiKey,
  center,
  cleanLoop,
  typicalLoop,
  hotspots,
  onAddHotspot,
  onSetStartCoords,
  cleanLoopLabel,
  typicalLoopLabel,
  clickAction = 'set-start',
  communityStops,
}) => {
  // Convert GeoJSON [lon, lat] pairs to Google Maps LatLngLiteral { lat, lng }
  const cleanPath: google.maps.LatLngLiteral[] = cleanLoop
    ? cleanLoop.coordinates.map(([lon, lat]) => ({ lat, lng: lon }))
    : [];

  const typicalPath: google.maps.LatLngLiteral[] = typicalLoop
    ? typicalLoop.coordinates.map(([lon, lat]) => ({ lat, lng: lon }))
    : [];

  const startPoint: google.maps.LatLngLiteral =
    cleanPath.length > 0 ? cleanPath[0] : { lat: center[0], lng: center[1] };

  if (!apiKey) {
    return (
      <div className="w-full h-[460px] rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-3">
          🗺️
        </div>
        <h4 className="font-bold text-slate-800 text-base mb-1">Google Maps API Key Required</h4>
        <p className="text-xs text-slate-600 max-w-md mb-4">
          To view routes on Google Maps with satellite imagery and live traffic, paste your Google Maps API key (or free Maps Demo Key).
        </p>
        <div className="text-xs text-slate-500">
          Switch to <strong className="text-emerald-700">OpenStreetMap</strong> anytime with zero key required.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[460px] rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={16}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          internalUsageAttributionIds={['gmp_git_agentskills_v1']}
          onClick={(e) => {
            if (e.detail.latLng) {
              if (clickAction === 'set-start' && onSetStartCoords) {
                onSetStartCoords(
                  Math.round(e.detail.latLng.lat * 10000) / 10000,
                  Math.round(e.detail.latLng.lng * 10000) / 10000
                );
              } else {
                onAddHotspot(e.detail.latLng.lat, e.detail.latLng.lng);
              }
            }
          }}
        >
          <MapBoundsController cleanPath={cleanPath} center={center} />

          {/* Baseline Loop (dashed grey) */}
          {typicalPath.length > 0 && (
            <GooglePolyline
              path={typicalPath}
              strokeColor="#64748b"
              strokeWeight={4}
              strokeOpacity={0.8}
              dashed={true}
            />
          )}

          {/* Cleanest Loop (emerald green) */}
          {cleanPath.length > 0 && (
            <GooglePolyline
              path={cleanPath}
              strokeColor="#15803d"
              strokeWeight={6}
              strokeOpacity={0.95}
            />
          )}

          {/* Start Point Marker */}
          <AdvancedMarker position={startPoint} title="Start / End Point">
            <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-md">
              S
            </div>
          </AdvancedMarker>

          {/* Hotspots */}
          {hotspots.map((spot, idx) => (
            <AdvancedMarker
              key={`g-hotspot-${idx}`}
              position={{ lat: spot.lat, lng: spot.lon }}
              title={spot.description || `Hotspot #${idx + 1}`}
            >
              <div className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-md">
                ⚠️
              </div>
            </AdvancedMarker>
          ))}
          {/* Community PokéStop Rest Milestones */}
          {communityStops && communityStops.map((stop) => {
            const emoji =
              stop.type === 'BENCH' ? '🪑' :
              stop.type === 'SHADE' ? '🌳' :
              stop.type === 'WATER' ? '🚰' :
              stop.type === 'GARDEN' ? '🌸' :
              stop.type === 'SANCTUARY' ? '🛡️' :
              stop.type === 'VIEWPOINT' ? '🌅' : '📍';

            return (
              <AdvancedMarker
                key={`g-stop-${stop.id}`}
                position={{ lat: stop.lat, lng: stop.lon }}
                title={`${stop.name} (${stop.type}): ${stop.description}`}
              >
                <div className="bg-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-md">
                  {emoji}
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200 text-xs z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-1.5 bg-emerald-700 rounded-full inline-block"></span>
          <span className="font-semibold text-slate-800">{cleanLoopLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 border-t-2 border-dashed border-slate-500 inline-block"></span>
          <span className="text-slate-600">{typicalLoopLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">S</span>
          <span className="text-slate-600">Start Point</span>
        </div>
        {communityStops && communityStops.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[13px]">🪑</span>
            <span className="text-emerald-800 font-semibold">PokéStop Rest ({communityStops.length})</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[12px]">⚠️</span>
          <span className="text-slate-600">Marked Hotspot</span>
        </div>
      </div>
    </div>
  );
};
