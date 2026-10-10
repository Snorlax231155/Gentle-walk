import React from 'react';
import { Sensitivity } from '../types';
import { Language } from '../i18n/translations';
import { Globe, AlertTriangle, Sparkles, MapPin } from 'lucide-react';

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
}

const PRESETS = [
  { name: 'Synthetic 14x14 Demo Area (Colony)', lat: 28.6139, lon: 77.2090, demo: true },
  { name: 'Lodhi Gardens, New Delhi', lat: 28.5933, lon: 77.2215, demo: false },
  { name: 'Cubbon Park, Bengaluru', lat: 12.9763, lon: 77.5929, demo: false },
  { name: 'Sanjay Van, South Delhi', lat: 28.5284, lon: 77.1741, demo: false },
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
}) => {
  return (
    <aside className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-5">
      {/* 1. Header with Language and Demo toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Globe className="w-4 h-4 text-slate-500" />
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2 py-1 rounded transition-colors ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            EN
          </button>
          <button
            onClick={() => onLanguageChange('hi')}
            className={`px-2 py-1 rounded transition-colors ${language === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            हिंदी
          </button>
        </div>

        {/* Demo Mode Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => onDemoChange(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <span className={demo ? 'text-amber-700 font-extrabold' : 'text-slate-600'}>
            Demo Mode
          </span>
        </label>
      </div>

      {/* 2. Preset Locations */}
      <div>
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
          {labels.presetLocations}
        </label>
        <select
          onChange={(e) => {
            const preset = PRESETS[Number(e.target.value)];
            if (preset) {
              onCoordsChange(preset.lat, preset.lon);
              onDemoChange(preset.demo);
            }
          }}
          className="w-full text-xs font-medium p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {PRESETS.map((p, idx) => (
            <option key={idx} value={idx}>
              {p.name} {p.demo ? '(Synthetic Demo)' : '(Live OSM)'}
            </option>
          ))}
        </select>
      </div>

      {/* Lat/Lon & Radius Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            <MapPin className="w-3 h-3 inline mr-1 text-slate-400" /> Lat
          </label>
          <input
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => onCoordsChange(parseFloat(e.target.value) || 0, lon)}
            className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono bg-slate-50"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Lon
          </label>
          <input
            type="number"
            step="0.0001"
            value={lon}
            onChange={(e) => onCoordsChange(lat, parseFloat(e.target.value) || 0)}
            className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono bg-slate-50"
          />
        </div>
        <div className="col-span-2 mt-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
            <span>Search Radius</span>
            <span className="font-mono">{radiusM}m</span>
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

      {/* 3. Walk Duration Slider */}
      <div>
        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
          <span>{labels.walkDuration}</span>
          <span className="text-emerald-700 font-extrabold text-sm">{minutes} {labels.minutes}</span>
        </div>
        <input
          type="range"
          min="10"
          max="40"
          step="5"
          value={minutes}
          onChange={(e) => onMinutesChange(Number(e.target.value))}
          className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>10 mins (~600m)</span>
          <span>25 mins</span>
          <span>40 mins (~2.4km)</span>
        </div>
      </div>

      {/* 4. Health Sensitivity Profile */}
      <div>
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
          {labels.sensitivity}
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { id: 'NORMAL', label: labels.normalSens, sub: 'Baseline 1.0x' },
            { id: 'SENSITIVE', label: labels.sensitiveSens, sub: 'Exposure factor 1.5x' },
            { id: 'VERY_SENSITIVE', label: labels.verySensitiveSens, sub: 'High risk factor 2.0x' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSensitivityChange(item.id as Sensitivity)}
              className={`p-2.5 rounded-lg text-left border transition-all text-xs ${
                sensitivity === item.id
                  ? 'border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
              }`}
            >
              <div>{item.label}</div>
              <div className="text-[10px] text-slate-600 font-normal">{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Avoid Steep Paths (Low Mobility) */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
          <input
            type="checkbox"
            checked={lowMobility}
            onChange={(e) => onLowMobilityChange(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <span>{labels.avoidSlopes}</span>
        </label>
        <p className="text-[11px] text-slate-600 mt-1 pl-6">
          Excludes paths with &gt;5% incline so seniors don't get strained.
        </p>
      </div>

      {/* 6. Planned Walk Hour */}
      <div>
        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
          <span>{labels.hourOfDay}</span>
          <span className="text-slate-900 font-mono text-sm">{hour.toString().padStart(2, '0')}:00</span>
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

      {/* 7. Hotspot Management */}
      {hotspotsCount > 0 && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {hotspotsCount} marked hotspot(s)
          </div>
          <button
            onClick={onClearHotspots}
            className="text-[11px] text-rose-700 underline font-bold hover:text-rose-900"
          >
            {labels.clearHotspots}
          </button>
        </div>
      )}

      {/* 8. Action Button */}
      <button
        onClick={onPlan}
        disabled={loading}
        className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {labels.calculating}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {labels.planWalkButton}
          </>
        )}
      </button>
    </aside>
  );
};
