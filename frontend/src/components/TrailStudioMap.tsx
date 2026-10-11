import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CommunityStop, StopType, LoopResult } from '../types';
import { calculatePathDistanceMeters, estimateElderMinutes } from '../utils/geo';
import { Undo2, RefreshCw, Trash2, Wand2, Plus, Info } from 'lucide-react';

// Custom Map Markers
const createWaypointIcon = (index: number, isStart: boolean, isEnd: boolean) => {
  const bg = isStart ? '#2563eb' : isEnd ? '#059669' : '#0284c7';
  const label = isStart ? 'S' : `${index + 1}`;
  return L.divIcon({
    html: `<div style="background-color: ${bg}; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${label}</div>`,
    className: 'waypoint-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const createStopMarkerIcon = (type: string) => {
  const emoji =
    type === 'BENCH' ? '🪑' :
    type === 'SHADE' ? '🌳' :
    type === 'WATER' ? '🚰' :
    type === 'GARDEN' ? '🌸' :
    type === 'SANCTUARY' ? '🛡️' : '📍';

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #059669, #047857); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35); transform: translateY(-2px);">${emoji}</div>`,
    className: 'stop-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export type StudioTool = 'draw' | 'place-stop';

interface TrailStudioMapProps {
  center: [number, number];
  drawnCoordinates: [number, number][]; // [lon, lat]
  onCoordinatesChange: (coords: [number, number][]) => void;
  customStops: CommunityStop[];
  onStopsChange: (stops: CommunityStop[]) => void;
  currentLoop?: LoopResult;
  selectedStopType: StopType;
  onSelectedStopTypeChange: (type: StopType) => void;
  activeTool: StudioTool;
  onActiveToolChange: (tool: StudioTool) => void;
}

// Controller to pan map when center changes
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

// Map Click Listener for Drawing Waypoints & Placing Stops
function StudioClickHandler({
  activeTool,
  selectedStopType,
  onAddPoint,
  onAddStop,
}: {
  activeTool: StudioTool;
  selectedStopType: StopType;
  onAddPoint: (lon: number, lat: number) => void;
  onAddStop: (lat: number, lon: number, type: StopType) => void;
}) {
  useMapEvents({
    click(e) {
      const lat = Math.round(e.latlng.lat * 100000) / 100000;
      const lon = Math.round(e.latlng.lng * 100000) / 100000;

      if (activeTool === 'draw') {
        onAddPoint(lon, lat);
      } else if (activeTool === 'place-stop') {
        onAddStop(lat, lon, selectedStopType);
      }
    },
  });
  return null;
}

export const TrailStudioMap: React.FC<TrailStudioMapProps> = ({
  center,
  drawnCoordinates,
  onCoordinatesChange,
  customStops,
  onStopsChange,
  currentLoop,
  selectedStopType,
  onSelectedStopTypeChange,
  activeTool,
  onActiveToolChange,
}) => {
  const [mapLayer, setMapLayer] = useState<'google-satellite' | 'google-street' | 'osm'>('google-satellite');

  // Convert GeoJSON [lon, lat] pairs to Leaflet [lat, lon] pairs
  const polylineLatLngs: [number, number][] = drawnCoordinates.map(([lon, lat]) => [lat, lon]);

  const totalDistance = calculatePathDistanceMeters(drawnCoordinates);
  const estimatedMins = estimateElderMinutes(totalDistance);

  const handleAddPoint = (lon: number, lat: number) => {
    onCoordinatesChange([...drawnCoordinates, [lon, lat]]);
  };

  const handleAddStop = (lat: number, lon: number, type: StopType) => {
    const defaultName =
      type === 'BENCH' ? `Rest Bench #${customStops.filter((s) => s.type === 'BENCH').length + 1}` :
      type === 'SHADE' ? 'Shaded Canopy Rest' :
      type === 'WATER' ? 'Clean Water Dispenser' :
      type === 'GARDEN' ? 'Fragrant Flower Garden' : 'Peaceful Air Pavilion';

    const defaultDesc =
      type === 'BENCH' ? 'Comfortable seating for rest intervals.' :
      type === 'SHADE' ? 'Tree canopy shelter from midday sun.' :
      type === 'WATER' ? 'Filtered drinking water fountain.' :
      type === 'GARDEN' ? 'Sensory floral trail section.' : 'Safe, low-dust quiet rest zone.';

    const newStop: CommunityStop = {
      id: `stop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: defaultName,
      type: type,
      description: defaultDesc,
      lat,
      lon,
    };

    onStopsChange([...customStops, newStop]);
  };

  const handleUndoPoint = () => {
    if (drawnCoordinates.length > 0) {
      onCoordinatesChange(drawnCoordinates.slice(0, -1));
    }
  };

  const handleCloseLoop = () => {
    if (drawnCoordinates.length >= 3) {
      const first = drawnCoordinates[0];
      const last = drawnCoordinates[drawnCoordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        onCoordinatesChange([...drawnCoordinates, first]);
      }
    }
  };

  const handleClearPath = () => {
    onCoordinatesChange([]);
  };

  const handleImportAutoLoop = () => {
    if (currentLoop && currentLoop.coordinates.length > 0) {
      onCoordinatesChange(currentLoop.coordinates);
    }
  };

  const handleRemoveStop = (id: string) => {
    onStopsChange(customStops.filter((s) => s.id !== id));
  };

  const getTileUrl = () => {
    if (mapLayer === 'google-satellite') {
      return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    }
    if (mapLayer === 'google-street') {
      return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden border border-slate-300 shadow-inner flex flex-col">
      {/* Top Studio Action Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        
        {/* Tool Mode Selectors */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 pointer-events-auto">
          <button
            type="button"
            onClick={() => onActiveToolChange('draw')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTool === 'draw'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>✏️</span>
            <span>Draw Route</span>
          </button>

          <button
            type="button"
            onClick={() => onActiveToolChange('place-stop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTool === 'place-stop'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>📍</span>
            <span>Place Rest Stop</span>
          </button>
        </div>

        {/* Live Route Distance Stats Pill */}
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-xl shadow-md border border-slate-700 text-[11px] font-bold flex items-center gap-2 pointer-events-auto">
          <span>📏 {totalDistance}m (~{estimatedMins} min)</span>
          <span>·</span>
          <span>🪑 {customStops.length} PokéStops</span>
        </div>

        {/* Map Layer Switcher */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-0.5 rounded-xl shadow-md border border-slate-200 text-[11px] font-bold pointer-events-auto">
          <button
            type="button"
            onClick={() => setMapLayer('google-satellite')}
            className={`px-2 py-0.5 rounded-lg ${mapLayer === 'google-satellite' ? 'bg-emerald-700 text-white' : 'text-slate-700'}`}
          >
            🛰️ Sat
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('google-street')}
            className={`px-2 py-0.5 rounded-lg ${mapLayer === 'google-street' ? 'bg-emerald-700 text-white' : 'text-slate-700'}`}
          >
            🗺️ Street
          </button>
        </div>
      </div>

      {/* Sub-bar based on active tool */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {activeTool === 'draw' && (
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 pointer-events-auto text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-1.5 hidden sm:inline">
              Click map to add walking points:
            </span>

            <button
              type="button"
              onClick={handleUndoPoint}
              disabled={drawnCoordinates.length === 0}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Remove last placed point"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleCloseLoop}
              disabled={drawnCoordinates.length < 3}
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-800 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Connect last point back to start point"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Close Loop</span>
            </button>

            {currentLoop && currentLoop.coordinates.length > 0 && (
              <button
                type="button"
                onClick={handleImportAutoLoop}
                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1 cursor-pointer"
                title="Trace calculated clean loop as your route"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Import Auto-Loop</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearPath}
              disabled={drawnCoordinates.length === 0}
              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Clear all points"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {activeTool === 'place-stop' && (
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex flex-wrap items-center gap-1 pointer-events-auto text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-1.5 hidden sm:inline">
              Select type then click map:
            </span>

            <button
              type="button"
              onClick={() => onSelectedStopTypeChange('BENCH')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedStopType === 'BENCH' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>🪑</span>
              <span>Bench</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectedStopTypeChange('SHADE')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedStopType === 'SHADE' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>🌳</span>
              <span>Shade Tree</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectedStopTypeChange('WATER')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedStopType === 'WATER' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>🚰</span>
              <span>Water</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectedStopTypeChange('GARDEN')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedStopType === 'GARDEN' ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>🌸</span>
              <span>Garden</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectedStopTypeChange('SANCTUARY')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedStopType === 'SANCTUARY' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>🛡️</span>
              <span>Sanctuary</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Map Container */}
      <MapContainer
        center={center}
        zoom={16}
        style={{ width: '100%', height: '100%', cursor: activeTool === 'draw' ? 'crosshair' : 'pointer' }}
        scrollWheelZoom={true}
      >
        <TileLayer url={getTileUrl()} />
        <MapCenterController center={center} />
        <StudioClickHandler
          activeTool={activeTool}
          selectedStopType={selectedStopType}
          onAddPoint={handleAddPoint}
          onAddStop={handleAddStop}
        />

        {/* Drawn Polyline Path */}
        {polylineLatLngs.length > 0 && (
          <Polyline
            positions={polylineLatLngs}
            pathOptions={{
              color: '#059669',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Drawn Waypoint Markers */}
        {drawnCoordinates.map(([lon, lat], index) => {
          const isStart = index === 0;
          const isEnd = index === drawnCoordinates.length - 1 && drawnCoordinates.length > 1;
          return (
            <Marker
              key={`waypoint-${index}-${lon}-${lat}`}
              position={[lat, lon]}
              icon={createWaypointIcon(index, isStart, isEnd)}
            />
          );
        })}

        {/* Custom Placed PokéStop Markers */}
        {customStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={createStopMarkerIcon(stop.type)}
          >
            <Popup>
              <div className="text-xs p-1 max-w-[200px]">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <span>
                    {stop.type === 'BENCH' ? '🪑' :
                     stop.type === 'SHADE' ? '🌳' :
                     stop.type === 'WATER' ? '🚰' :
                     stop.type === 'GARDEN' ? '🌸' : '🛡️'}
                  </span>
                  <span>{stop.name}</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1">{stop.description}</p>
                <button
                  type="button"
                  onClick={() => handleRemoveStop(stop.id)}
                  className="mt-2 text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Stop</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
