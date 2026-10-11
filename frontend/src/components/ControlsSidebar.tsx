import React, { useState } from 'react';
import { Sensitivity } from '../types';
import { Language } from '../i18n/translations';
import { Globe, AlertTriangle, Sparkles, Crosshair, Key, ChevronDown, Clock } from 'lucide-react';

interface ControlsSidebarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  demo: boolean;
  onDemoChange: (demo: boolean) => void;
  lat: number;
  lon: number;
  onCoordsChange: (lat: number, lon: number) => void;
  radiusM: number;
  onRadiusChange: (r: number) => void;
  minutes: number;
  onMinutesChange: (m: number) => void;
  sensitivity: Sensitivity;
  onSensitivityChange: (s: Sensitivity) => void;
  lowMobility: boolean;
  onLowMobilityChange: (lm: boolean) => void;
  hour: number;
  onHourChange: (h: number) => void;
  hotspotsCount: number;
  onClearHotspots: () => void;
  onPlan: () => void;
  loading: boolean;
  labels: Record<string, string>;
  mapProvider: 'osm' | 'google';
  onMapProviderChange: (p: 'osm' | 'google') => void;
  googleApiKey: string;
  onGoogleApiKeyChange: (k: string) => void;
}

const PRESETS = [
  { name: '🌳 Lodhi Gardens, New Delhi', lat: 28.5933, lon: 77.2215, demo: false },
  { name: '🌳 Cubbon Park, Bengaluru', lat: 12.9763, lon: 77.5929, demo: false },
  { name: '🌲 Sanjay Van, South Delhi', lat: 28.5284, lon: 77.1741, demo: false },
  { name: '🏢 Synthetic Grid (Colony Demo)', lat: 28.6139, lon: 77.2090, demo: true },
];

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  language,
  onLanguageChange,
  demo,
  onDemoChange,
  lat,
  lon,
  onCoordsChange,
  radiusM,
  onRadiusChange,
  minutes,
  onMinutesChange,
  sensitivity,
  onSensitivityChange,
  lowMobility,
  onLowMobilityChange,
  hour,
  onHourChange,
  hotspotsCount,
  onClearHotspots,
  onPlan,
  loading,
  labels,
  mapProvider,
  onMapProviderChange,
  googleApiKey,
  onGoogleApiKeyChange,
}) => {
  const [locating, setLocating] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsChange(
          Math.round(pos.coords.latitude * 10000) / 10000,
          Math.round(pos.coords.longitude * 10000) / 10000
        );
        onDemoChange(false);
        setLocating(false);
      },
      (err) => {
        console.warn(err);
        alert('Could not retrieve GPS location. Please check browser permissions.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <aside className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-5">
      {/* 1. Header with Language and GPS Locate Me */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Globe className="w-4 h-4 text-slate-500" />
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              language === 'en' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('hi')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              language === 'hi' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            हिंदी
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
        >
          <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Locating...' : '📍 Locate Me'}
        </button>
      </div>

      {/* 2. Primary Location Selector (Park / Colony) */}
      <div>
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
          {labels.presetLocations}
        </label>
        <select
          value={
            PRESETS.findIndex((p) => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.001) !== -1
              ? PRESETS.findIndex((p) => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.001)
              : ''
          }
          onChange={(e) => {
            const idx = Number(e.target.value);
            const preset = PRESETS[idx];
            if (preset) {
              onCoordsChange(preset.lat, preset.lon);
              onDemoChange(preset.demo);
            }
          }}
          className="w-full text-sm font-semibold p-3 rounded-xl border-2 border-slate-300 bg-slate-50/80 text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 transition-all cursor-pointer"
        >
          {PRESETS.map((p, idx) => (
            <option key={idx} value={idx}>
              {p.name} {p.demo ? '(Demo Grid)' : '(Live Park)'}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Walk Duration: Quick 3-Button Selector (15m / 20m / 30m) */}
      <div>
        <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {labels.walkDuration}
          </span>
          <span className="text-emerald-700 font-black text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {minutes} {labels.minutes}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[15, 20, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMinutesChange(m)}
              className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border-2 ${
                minutes === m
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-[1.02]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {m} mins
            </button>
          ))}
        </div>
      </div>

      {/* 4. Elder Comfort: Avoid Steep Slopes */}
      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900 select-none">
          <input
            type="checkbox"
            checked={lowMobility}
            onChange={(e) => onLowMobilityChange(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <span>{labels.avoidSlopes}</span>
        </label>
        <p className="text-[11px] text-slate-600 mt-1 pl-6">
          {labels.gentleSlopeNotice || 'Excludes paths with >5% incline for elder comfort.'}
        </p>
      </div>

      {/* 5. Main Action Button */}
      <button
        onClick={onPlan}
        disabled={loading}
        className="w-full py-4 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{labels.calculating}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>{labels.planWalkButton}</span>
          </>
        )}
      </button>

      {/* 6. Collapsible Advanced Settings & Tuning Accordion */}
      <details className="group border border-slate-200 rounded-xl bg-slate-50/70 p-3 text-xs">
        <summary className="font-bold text-slate-700 cursor-pointer flex items-center justify-between select-none">
          <span className="flex items-center gap-1.5">
            <span>⚙️</span>
            <span>{labels.advancedSettings || 'Advanced Settings & Tuning'}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-4">
          {/* Custom Walk Time of Day */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>{labels.hourOfDay}</span>
              <span className="text-slate-900 font-mono font-bold">{hour.toString().padStart(2, '0')}:00</span>
            </div>
            <input
              type="range"
              min="5"
              max="21"
              step="1"
              value={hour}
              onChange={(e) => onHourChange(Number(e.target.value))}
              className="w-full accent-slate-800 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Health Sensitivity Multiplier */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              {labels.sensitivity}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'NORMAL', label: labels.normalSens },
                { id: 'SENSITIVE', label: labels.sensitiveSens.split(' ')[0] },
                { id: 'VERY_SENSITIVE', label: 'Elders' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSensitivityChange(item.id as Sensitivity)}
                  className={`p-2 rounded-lg text-center border text-[11px] font-bold transition-all cursor-pointer ${
                    sensitivity === item.id
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exact Coordinates & Search Radius */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">Coordinates & Radius</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-500 block mb-0.5">Lat</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => onCoordsChange(parseFloat(e.target.value) || 0, lon)}
                  className="w-full p-1.5 rounded border border-slate-300 font-mono bg-slate-50 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Lon</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => onCoordsChange(lat, parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 rounded border border-slate-300 font-mono bg-slate-50 text-xs"
                />
              </div>
              <div className="col-span-2 mt-1">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Radius:</span>
                  <span className="font-mono font-bold">{radiusM}m</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="1500"
                  step="100"
                  value={radiusM}
                  onChange={(e) => onRadiusChange(Number(e.target.value))}
                  className="w-full accent-slate-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Map Engine Selector */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Map Renderer</span>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => onMapProviderChange('osm')}
                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mapProvider === 'osm'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                OpenStreetMap / Satellite
              </button>
              <button
                type="button"
                onClick={() => onMapProviderChange('google')}
                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mapProvider === 'google'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Google Maps SDK
              </button>
            </div>

            {mapProvider === 'google' && (
              <div className="mt-2 text-[11px]">
                <label className="text-slate-600 block mb-1">
                  <Key className="w-3 h-3 inline mr-1 text-blue-500" /> Google Maps API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy... (optional for native SDK)"
                  value={googleApiKey}
                  onChange={(e) => onGoogleApiKeyChange(e.target.value)}
                  className="w-full p-1.5 text-xs rounded border border-slate-300 font-mono bg-slate-50"
                />
              </div>
            )}
          </div>

          {/* Hotspots Reporting Tool */}
          {hotspotsCount > 0 ? (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-rose-800 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {hotspotsCount} marked hotspot(s)
              </span>
              <button
                onClick={onClearHotspots}
                className="text-[11px] text-rose-700 underline font-bold hover:text-rose-900 cursor-pointer"
              >
                {labels.clearHotspots}
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 italic">
              Tip: Click anywhere on the map to mark and avoid local smoke sources.
            </div>
          )}

          {/* Demo Mode Toggle */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => onDemoChange(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className={demo ? 'text-amber-700 font-black' : 'text-slate-600'}>
                Synthetic Demo Mode (Offline Grid)
              </span>
            </label>
          </div>
        </div>
      </details>
    </aside>
  );
};
