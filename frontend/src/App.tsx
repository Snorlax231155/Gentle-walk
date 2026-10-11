import { useState, useEffect, useCallback } from 'react';
import { PlanResponse, WindowResponse, Hotspot, Sensitivity, TrafficLight } from './types';
import { translations, Language } from './i18n/translations';
import { fetchWindow, planWalk } from './services/api';
import { ControlsSidebar } from './components/ControlsSidebar';
import { AirQualityChart } from './components/AirQualityChart';
import { LoopMap } from './components/LoopMap';
import { GoogleRouteMap } from './components/GoogleRouteMap';
import { IndoorFallbackCard } from './components/IndoorFallbackCard';
import { MetricCards } from './components/MetricCards';
import { Shield, AlertCircle, Sparkles, Sun, Info, Navigation, ExternalLink } from 'lucide-react';

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  // Parameters
  const [demo, setDemo] = useState<boolean>(true);
  const [lat, setLat] = useState<number>(28.6139);
  const [lon, setLon] = useState<number>(77.2090);
  const [radiusM, setRadiusM] = useState<number>(800);
  const [minutes, setMinutes] = useState<number>(20);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('NORMAL');
  const [lowMobility, setLowMobility] = useState<boolean>(false);
  const [hour, setHour] = useState<number>(15);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Map Provider & Google Maps API key
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');

  // State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [windowData, setWindowData] = useState<WindowResponse | null>(null);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);

  // Load air quality window initially and when location/demo toggles
  const loadWindow = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchWindow(lat, lon, 1, demo);
      setWindowData(res);
      // Auto-set the planned hour to the cleanest hour if user hasn't set one yet
      setHour(res.window.startHour);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load air quality data');
    }
  }, [lat, lon, demo]);

  // Load walk plan
  const handlePlanWalk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await planWalk({
        lat,
        lon,
        radiusM,
        minutes,
        sensitivity,
        lowMobility,
        hour,
        hotspots,
        demo,
      });
      setPlanData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to calculate loop');
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusM, minutes, sensitivity, lowMobility, hour, hotspots, demo]);

  useEffect(() => {
    loadWindow();
  }, [loadWindow]);

  // Plan walk initially or when window updates
  useEffect(() => {
    if (windowData) {
      handlePlanWalk();
    }
  }, [windowData]); // Run when window is first loaded

  const handleAddHotspot = (hotspotLat: number, hotspotLon: number) => {
    const newSpot: Hotspot = {
      lat: hotspotLat,
      lon: hotspotLon,
      description: `Hotspot #${hotspots.length + 1}`,
    };
    setHotspots((prev) => [...prev, newSpot]);
  };

  const handleClearHotspots = () => {
    setHotspots([]);
  };

  // Helper for traffic light display
  const getTrafficLightBadge = (light?: TrafficLight) => {
    if (light === 'GREEN') {
      return {
        bg: 'bg-emerald-100 border-emerald-400 text-emerald-950',
        dot: 'bg-emerald-600',
        text: t.statusGreen,
      };
    }
    if (light === 'YELLOW') {
      return {
        bg: 'bg-amber-100 border-amber-400 text-amber-950',
        dot: 'bg-amber-600',
        text: t.statusYellow,
      };
    }
    return {
      bg: 'bg-rose-100 border-rose-400 text-rose-950',
      dot: 'bg-rose-600',
      text: t.statusRed,
    };
  };

  const statusBadge = getTrafficLightBadge(windowData?.window.trafficLight);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* 1. Demo Mode Warning Banner */}
      {demo && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-center text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{t.demoBadge}</span>
        </div>
      )}

      {/* 2. App Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                demo
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {demo ? 'DEMO MODE' : 'LIVE OSM'}
            </span>
          </div>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sidebar Controls (4 cols) */}
        <div className="lg:col-span-4">
          <ControlsSidebar
            language={language}
            onLanguageChange={setLanguage}
            demo={demo}
            onDemoChange={(d) => {
              setDemo(d);
            }}
            lat={lat}
            lon={lon}
            onCoordsChange={(newLat, newLon) => {
              setLat(newLat);
              setLon(newLon);
            }}
            radiusM={radiusM}
            onRadiusChange={setRadiusM}
            minutes={minutes}
            onMinutesChange={setMinutes}
            sensitivity={sensitivity}
            onSensitivityChange={setSensitivity}
            lowMobility={lowMobility}
            onLowMobilityChange={setLowMobility}
            hour={hour}
            onHourChange={setHour}
            hotspotsCount={hotspots.length}
            onClearHotspots={handleClearHotspots}
            onPlan={handlePlanWalk}
            loading={loading}
            labels={t as unknown as Record<string, string>}
            mapProvider={mapProvider}
            onMapProviderChange={setMapProvider}
            googleApiKey={googleApiKey}
            onGoogleApiKeyChange={setGoogleApiKey}
          />
        </div>

        {/* Right Column: Visualization & Recommendations (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">{t.errorTitle}</h4>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Cleanest Window & Safety Status Card */}
          {windowData && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  {t.cleanestWindow}
                </span>
                <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                  <span>
                    {windowData.window.startHour.toString().padStart(2, '0')}:00 – {windowData.window.endHour.toString().padStart(2, '0')}:00
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    (~{windowData.window.meanPm25.toFixed(0)} µg/m³)
                  </span>
                </div>
              </div>

              {/* Traffic Light Recommendation Badge */}
              <div className={`px-4 py-3 rounded-xl border-2 flex items-center gap-2.5 ${statusBadge.bg}`}>
                <span className={`w-3.5 h-3.5 rounded-full ${statusBadge.dot} animate-pulse shrink-0`}></span>
                <div>
                  <div className="text-xs font-bold tracking-tight">{t.isItSafe}</div>
                  <div className="text-sm font-extrabold">{statusBadge.text}</div>
                </div>
              </div>
            </div>
          )}

          {/* Indoor Fallback Alert Card (Shown when status is RED or as indoor alternative) */}
          {planData?.indoorFallbacks && planData.indoorFallbacks.length > 0 && (
            <IndoorFallbackCard
              venues={planData.indoorFallbacks}
              isRedStatus={windowData?.window.trafficLight === 'RED'}
              language={language}
            />
          )}

          {/* Three Key Elder Metrics */}
          {planData && (
            <MetricCards
              bestLoop={planData.bestLoop}
              reductionPct={planData.reductionPct}
              extraMinutes={planData.extraMinutes}
              labels={{
                exposureReduction: t.exposureReduction,
                distance: t.distance,
                benches: t.benches,
                extraTime: t.extraTime,
                minutes: t.minutes,
                meters: t.meters,
              }}
            />
          )}

          {/* Interactive Map */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {t.cleanLoop} vs {t.typicalLoop}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600">
                  {mapProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'}
                </span>
              </div>

              {/* Mobile Turn-by-Turn Walking Button */}
              {planData && planData.bestLoop && planData.bestLoop.coordinates.length > 1 && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${planData.bestLoop.coordinates[0][1]},${planData.bestLoop.coordinates[0][0]}&destination=${planData.bestLoop.coordinates[planData.bestLoop.coordinates.length - 1][1]},${planData.bestLoop.coordinates[planData.bestLoop.coordinates.length - 1][0]}&waypoints=${planData.bestLoop.coordinates[Math.floor(planData.bestLoop.coordinates.length / 2)][1]},${planData.bestLoop.coordinates[Math.floor(planData.bestLoop.coordinates.length / 2)][0]}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Walking in Google Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
            </div>

            {mapProvider === 'google' ? (
              <GoogleRouteMap
                apiKey={googleApiKey}
                center={[lat, lon]}
                cleanLoop={planData?.bestLoop}
                typicalLoop={planData?.baselineLoop}
                hotspots={hotspots}
                onAddHotspot={handleAddHotspot}
                cleanLoopLabel={t.cleanLoop}
                typicalLoopLabel={t.typicalLoop}
              />
            ) : (
              <LoopMap
                center={[lat, lon]}
                cleanLoop={planData?.bestLoop}
                typicalLoop={planData?.baselineLoop}
                hotspots={hotspots}
                onAddHotspot={handleAddHotspot}
                cleanLoopLabel={t.cleanLoop}
                typicalLoopLabel={t.typicalLoop}
              />
            )}
          </div>

          {/* 24-Hour PM2.5 Forecast Chart */}
          {windowData && (
            <AirQualityChart
              hourlyPm25={windowData.window.hourlyPm25}
              selectedHour={hour}
              bestStartHour={windowData.window.startHour}
              onSelectHour={setHour}
              title={t.pm25ChartTitle}
            />
          )}

          {/* Medical Disclaimer Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">{t.disclaimerTitle}: </strong>
              <span>{planData?.disclaimer || t.disclaimerText}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
