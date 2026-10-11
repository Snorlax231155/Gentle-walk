import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LoopResult, Hotspot, CommunityStop, StopType } from '../types';
import { Undo2, RefreshCw, Trash2, Share2 } from 'lucide-react';

// Custom icons using Leaflet DivIcon
const startIcon = L.divIcon({
  html: `<div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S</div>`,
  className: 'custom-start-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const hotspotIcon = L.divIcon({
  html: `<div style="background-color: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚠️</div>`,
  className: 'custom-hotspot-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createStopIcon = (type: string) => {
  const emoji =
    type === 'BENCH' ? '🪑' :
    type === 'SHADE' ? '🌳' :
    type === 'WATER' ? '🚰' :
    type === 'GARDEN' ? '🌸' :
    type === 'SANCTUARY' ? '🛡️' :
    type === 'VIEWPOINT' ? '🌅' : '📍';

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #059669, #047857); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); transform: translateY(-2px);">${emoji}</div>`,
    className: 'custom-pokestop-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createDrawnWaypointIcon = (index: number) => {
  return L.divIcon({
    html: `<div style="background-color: #0284c7; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
    className: 'custom-waypoint-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export type MapLayer = 'osm' | 'google-street' | 'google-satellite';
export type MapClickAction = 'set-start' | 'add-hotspot' | 'draw-route' | 'place-stop';

interface LoopMapProps {
  center: [number, number];
  cleanLoop?: LoopResult;
  typicalLoop?: LoopResult;
  hotspots: Hotspot[];
  onAddHotspot: (lat: number, lon: number) => void;
  onSetStartCoords?: (lat: number, lon: number) => void;
  cleanLoopLabel: string;
  typicalLoopLabel: string;
  layer?: MapLayer;
  onLayerChange?: (l: MapLayer) => void;
  clickAction?: MapClickAction;
  onClickActionChange?: (action: MapClickAction) => void;
  labels?: {
    setStartPoint?: string;
    markHotspot?: string;
  };
  communityStops?: CommunityStop[];
  drawnCoordinates?: [number, number][];
  onAddDrawnPoint?: (lon: number, lat: number) => void;
  customPlacedStops?: CommunityStop[];
  onAddCustomPlacedStop?: (lat: number, lon: number, type: StopType) => void;
  selectedStopType?: StopType;
  onSelectedStopTypeChange?: (type: StopType) => void;
  onUndoDrawnPoint?: () => void;
  onCloseDrawnLoop?: () => void;
  onClearDrawnRoute?: () => void;
  onOpenSubmitDrawnRoute?: () => void;
}

function MapViewController({ center, cleanCoords }: { center: [number, number]; cleanCoords?: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (cleanCoords && cleanCoords.length > 1) {
      const bounds = L.latLngBounds(cleanCoords.map(([lat, lon]) => [lat, lon]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else {
      map.setView(center, 16);
    }
  }, [center, cleanCoords, map]);

  return null;
}

function MapClickHandler({
  clickAction,
  onAddHotspot,
  onSetStartCoords,
  onAddDrawnPoint,
  onAddCustomPlacedStop,
  selectedStopType = 'BENCH',
}: {
  clickAction: MapClickAction;
  onAddHotspot: (lat: number, lon: number) => void;
  onSetStartCoords?: (lat: number, lon: number) => void;
  onAddDrawnPoint?: (lon: number, lat: number) => void;
  onAddCustomPlacedStop?: (lat: number, lon: number, type: StopType) => void;
  selectedStopType?: StopType;
}) {
  useMapEvents({
    click(e) {
      const lat = Math.round(e.latlng.lat * 100000) / 100000;
      const lon = Math.round(e.latlng.lng * 100000) / 100000;

      if (clickAction === 'draw-route' && onAddDrawnPoint) {
        onAddDrawnPoint(lon, lat);
      } else if (clickAction === 'place-stop' && onAddCustomPlacedStop) {
        onAddCustomPlacedStop(lat, lon, selectedStopType);
      } else if (clickAction === 'set-start' && onSetStartCoords) {
        onSetStartCoords(lat, lon);
      } else {
        onAddHotspot(lat, lon);
      }
    },
  });
  return null;
}

export const LoopMap: React.FC<LoopMapProps> = ({
  center,
  cleanLoop,
  typicalLoop,
  hotspots,
  onAddHotspot,
  onSetStartCoords,
  cleanLoopLabel,
  typicalLoopLabel,
  layer = 'google-satellite',
  onLayerChange,
  clickAction = 'set-start',
  onClickActionChange,
  labels,
  communityStops,
  drawnCoordinates = [],
  onAddDrawnPoint,
  customPlacedStops = [],
  onAddCustomPlacedStop,
  selectedStopType = 'BENCH',
  onSelectedStopTypeChange,
  onUndoDrawnPoint,
  onCloseDrawnLoop,
  onClearDrawnRoute,
  onOpenSubmitDrawnRoute,
}) => {
  const [internalLayer, setInternalLayer] = React.useState<MapLayer>(layer);
  const activeLayer = layer !== undefined && onLayerChange ? layer : internalLayer;

  const handleSelectLayer = (newLayer: MapLayer) => {
    setInternalLayer(newLayer);
    if (onLayerChange) onLayerChange(newLayer);
  };

  const [internalClickAction, setInternalClickAction] = React.useState<MapClickAction>(clickAction);
  const activeClickAction = clickAction !== undefined && onClickActionChange ? clickAction : internalClickAction;

  const handleSelectClickAction = (action: MapClickAction) => {
    setInternalClickAction(action);
    if (onClickActionChange) onClickActionChange(action);
  };

  // Convert GeoJSON [lon, lat] pairs to Leaflet [lat, lon] pairs
  const cleanLatLngs: [number, number][] = cleanLoop
    ? cleanLoop.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const typicalLatLngs: [number, number][] = typicalLoop
    ? typicalLoop.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const drawnLatLngs: [number, number][] = drawnCoordinates.map(([lon, lat]) => [lat, lon]);

  const startPoint: [number, number] = cleanLatLngs.length > 0 ? cleanLatLngs[0] : center;

  // Combined stops list: pre-loaded community stops + user manually placed stops
  const allStops = [...(communityStops || []), ...customPlacedStops];

  // Tile layer URL based on selected layer
  const getTileUrl = () => {
    switch (activeLayer) {
      case 'google-satellite':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'google-street':
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      case 'osm':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getAttribution = () => {
    if (activeLayer === 'osm') {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
    return '&copy; Google Maps';
  };

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {/* Map Layer Switcher Pills */}
      <div className="absolute top-3 left-14 z-[1000] flex bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => handleSelectLayer('google-satellite')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeLayer === 'google-satellite'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          🛰️ Satellite
        </button>
        <button
          type="button"
          onClick={() => handleSelectLayer('google-street')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeLayer === 'google-street'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          🗺️ Street
        </button>
        <button
          type="button"
          onClick={() => handleSelectLayer('osm')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeLayer === 'osm'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          🌍 OSM
        </button>
      </div>

      {/* Map Action Mode Pills (Move Start Pin vs Mark Hotspot vs Draw Route vs Drop Stop) */}
      <div className="absolute top-12 left-14 z-[1000] flex flex-wrap bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => handleSelectClickAction('set-start')}
          className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            activeClickAction === 'set-start'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Clicking on map moves your walk start position"
        >
          <span>📍</span>
          <span>{labels?.setStartPoint || 'Move Start'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectClickAction('draw-route')}
          className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            activeClickAction === 'draw-route'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Click map to draw your own custom walking route"
        >
          <span>✏️</span>
          <span>Draw Route</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectClickAction('place-stop')}
          className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            activeClickAction === 'place-stop'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Click map to place seating, shade & water stops"
        >
          <span>🪑</span>
          <span>Place Stop</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectClickAction('add-hotspot')}
          className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            activeClickAction === 'add-hotspot'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Clicking on map marks a smoke/traffic pollution spot"
        >
          <span>⚠️</span>
          <span>Hotspot</span>
        </button>
      </div>

      {/* Secondary Toolbar for Active Tool */}
      {activeClickAction === 'draw-route' && (
        <div className="absolute top-22 left-14 z-[1000] flex items-center bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-emerald-300 text-xs font-bold gap-1 animate-in fade-in">
          <span className="text-[11px] text-emerald-800 px-1.5">
            ✏️ Click to add points ({drawnCoordinates.length}):
          </span>

          {onUndoDrawnPoint && (
            <button
              type="button"
              onClick={onUndoDrawnPoint}
              disabled={drawnCoordinates.length === 0}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-md flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}

          {onCloseDrawnLoop && (
            <button
              type="button"
              onClick={onCloseDrawnLoop}
              disabled={drawnCoordinates.length < 3}
              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-800 rounded-md flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Close Loop</span>
            </button>
          )}

          {onClearDrawnRoute && (
            <button
              type="button"
              onClick={onClearDrawnRoute}
              disabled={drawnCoordinates.length === 0}
              className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 rounded-md flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {onOpenSubmitDrawnRoute && drawnCoordinates.length >= 2 && (
            <button
              type="button"
              onClick={onOpenSubmitDrawnRoute}
              className="px-2.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md flex items-center gap-1 cursor-pointer ml-1 shadow-2xs"
            >
              <Share2 className="w-3 h-3" />
              <span>Share Trail</span>
            </button>
          )}
        </div>
      )}

      {activeClickAction === 'place-stop' && onSelectedStopTypeChange && (
        <div className="absolute top-22 left-14 z-[1000] flex items-center bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-amber-300 text-xs font-bold gap-1 animate-in fade-in">
          <span className="text-[11px] text-amber-900 px-1.5">
            Select type then click map:
          </span>

          <button
            type="button"
            onClick={() => onSelectedStopTypeChange('BENCH')}
            className={`px-2 py-0.5 rounded-md cursor-pointer ${selectedStopType === 'BENCH' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            🪑 Bench
          </button>
          <button
            type="button"
            onClick={() => onSelectedStopTypeChange('SHADE')}
            className={`px-2 py-0.5 rounded-md cursor-pointer ${selectedStopType === 'SHADE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            🌳 Shade
          </button>
          <button
            type="button"
            onClick={() => onSelectedStopTypeChange('WATER')}
            className={`px-2 py-0.5 rounded-md cursor-pointer ${selectedStopType === 'WATER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            🚰 Water
          </button>
          <button
            type="button"
            onClick={() => onSelectedStopTypeChange('GARDEN')}
            className={`px-2 py-0.5 rounded-md cursor-pointer ${selectedStopType === 'GARDEN' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            🌸 Garden
          </button>
          <button
            type="button"
            onClick={() => onSelectedStopTypeChange('SANCTUARY')}
            className={`px-2 py-0.5 rounded-md cursor-pointer ${selectedStopType === 'SANCTUARY' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            🛡️ Sanctuary
          </button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={16}
        style={{
          width: '100%',
          height: '100%',
          cursor: activeClickAction === 'draw-route' ? 'crosshair' : activeClickAction === 'place-stop' ? 'cell' : 'default',
        }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={activeLayer}
          attribution={getAttribution()}
          url={getTileUrl()}
        />

        <MapViewController center={center} cleanCoords={cleanLatLngs.length > 0 ? cleanLatLngs : drawnLatLngs} />
        <MapClickHandler
          clickAction={activeClickAction}
          onAddHotspot={onAddHotspot}
          onSetStartCoords={onSetStartCoords}
          onAddDrawnPoint={onAddDrawnPoint}
          onAddCustomPlacedStop={onAddCustomPlacedStop}
          selectedStopType={selectedStopType}
        />

        {/* Typical street baseline loop (grey dashed) */}
        {typicalLatLngs.length > 0 && (
          <Polyline
            positions={typicalLatLngs}
            pathOptions={{
              color: '#94a3b8',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          >
            <Popup>{typicalLoopLabel}</Popup>
          </Polyline>
        )}

        {/* Cleanest elder loop (green thick solid) */}
        {cleanLatLngs.length > 0 && (
          <Polyline
            positions={cleanLatLngs}
            pathOptions={{
              color: '#16a34a',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Popup>{cleanLoopLabel}</Popup>
          </Polyline>
        )}

        {/* User Drawn Custom Route (Sky-Blue thick polyline) */}
        {drawnLatLngs.length > 0 && (
          <Polyline
            positions={drawnLatLngs}
            pathOptions={{
              color: '#0284c7',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Popup>
              <div className="text-xs font-bold text-sky-900">Your Custom Drawn Trail</div>
            </Popup>
          </Polyline>
        )}

        {/* Waypoint markers for user drawn route */}
        {drawnCoordinates.map(([lon, lat], idx) => (
          <Marker
            key={`drawn-pt-${idx}-${lon}-${lat}`}
            position={[lat, lon]}
            icon={createDrawnWaypointIcon(idx)}
          />
        ))}

        {/* Start Point Marker */}
        <Marker position={startPoint} icon={startIcon}>
          <Popup>
            <div className="text-xs font-semibold">Start / End Point</div>
          </Popup>
        </Marker>

        {/* User-Reported Hotspots */}
        {hotspots.map((spot, idx) => (
          <Marker key={`hotspot-${idx}`} position={[spot.lat, spot.lon]} icon={hotspotIcon}>
            <Popup>
              <div className="text-xs">
                <strong>Pollution Hotspot #{idx + 1}</strong>
                <p>{spot.description || 'User marked source (generator/idling traffic)'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* PokéStop Rest Milestones */}
        {allStops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={createStopIcon(stop.type)}>
            <Popup>
              <div className="text-xs p-1 max-w-[210px]">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <span>
                    {stop.type === 'BENCH' ? '🪑' :
                     stop.type === 'SHADE' ? '🌳' :
                     stop.type === 'WATER' ? '🚰' :
                     stop.type === 'GARDEN' ? '🌸' :
                     stop.type === 'SANCTUARY' ? '🛡️' :
                     stop.type === 'VIEWPOINT' ? '🌅' : '📍'}
                  </span>
                  <span>{stop.name}</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                  Elder Rest Milestone
                </div>
                <p className="text-slate-600 text-[11px] mt-1 leading-snug">{stop.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200 text-xs z-[1000] flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-1.5 bg-emerald-700 rounded-full inline-block"></span>
          <span className="font-semibold text-slate-800">{cleanLoopLabel}</span>
        </div>
        {drawnCoordinates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-5 h-1.5 bg-sky-600 rounded-full inline-block"></span>
            <span className="font-semibold text-sky-800">Drawn Route ({drawnCoordinates.length} pts)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 border-t-2 border-dashed border-slate-500 inline-block"></span>
          <span className="text-slate-600">{typicalLoopLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">S</span>
          <span className="text-slate-600">Start Point</span>
        </div>
        {allStops.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[13px]">🪑</span>
            <span className="text-emerald-800 font-semibold">PokéStop Rest ({allStops.length})</span>
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
