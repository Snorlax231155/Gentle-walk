import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LoopResult, Hotspot } from '../types';

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

export type MapLayer = 'osm' | 'google-street' | 'google-satellite';

interface LoopMapProps {
  center: [number, number];
  cleanLoop?: LoopResult;
  typicalLoop?: LoopResult;
  hotspots: Hotspot[];
  onAddHotspot: (lat: number, lon: number) => void;
  cleanLoopLabel: string;
  typicalLoopLabel: string;
  layer?: MapLayer;
  onLayerChange?: (l: MapLayer) => void;
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

function MapClickHandler({ onAddHotspot }: { onAddHotspot: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onAddHotspot(e.latlng.lat, e.latlng.lng);
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
  cleanLoopLabel,
  typicalLoopLabel,
  layer = 'google-satellite',
  onLayerChange,
}) => {
  const [internalLayer, setInternalLayer] = React.useState<MapLayer>(layer);
  const activeLayer = layer !== undefined && onLayerChange ? layer : internalLayer;

  const handleSelectLayer = (newLayer: MapLayer) => {
    setInternalLayer(newLayer);
    if (onLayerChange) onLayerChange(newLayer);
  };

  // Convert GeoJSON [lon, lat] pairs to Leaflet [lat, lon] pairs
  const cleanLatLngs: [number, number][] = cleanLoop
    ? cleanLoop.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const typicalLatLngs: [number, number][] = typicalLoop
    ? typicalLoop.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const startPoint: [number, number] = cleanLatLngs.length > 0 ? cleanLatLngs[0] : center;

  // Tile layer URL based on selected layer
  const getTileUrl = () => {
    switch (activeLayer) {
      case 'google-satellite':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Google Hybrid (Satellite + Road labels)
      case 'google-street':
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Maps Streets
      case 'osm':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // OpenStreetMap
    }
  };

  const getAttribution = () => {
    if (activeLayer === 'osm') {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
    return '&copy; Google Maps';
  };

  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden shadow-sm border border-slate-200">
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
      <MapContainer
        center={center}
        zoom={16}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={activeLayer}
          attribution={getAttribution()}
          url={getTileUrl()}
        />

        <MapViewController center={center} cleanCoords={cleanLatLngs} />
        <MapClickHandler onAddHotspot={onAddHotspot} />

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
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200 text-xs z-[1000] flex flex-col gap-2">
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
        <div className="flex items-center gap-2">
          <span className="text-[12px]">⚠️</span>
          <span className="text-slate-600">Marked Hotspot</span>
        </div>
      </div>
    </div>
  );
};
