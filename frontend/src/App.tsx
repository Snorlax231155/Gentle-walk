import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Default to Lodhi Gardens, New Delhi (Live OSM Park)
  const [demo, setDemo] = useState<boolean>(false);
  const [lat, setLat] = useState<number>(28.5933);
  const [lon, setLon] = useState<number>(77.2215);
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
  }, [windowData]);

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
        bg: 'bg-emerald-50 border-emerald-500 text-emerald-950',
        dot: 'bg-emerald-600',
        title: 'Safe to Walk Outside',
        sub: t.statusGreen,
      };
    }
    if (light === 'YELLOW') {
      return {
        bg: 'bg-amber-50 border-amber-400 text-amber-950',
        dot: 'bg-amber-500',
        title: 'Moderate Air — Keep Walk Short',
        sub: t.statusYellow,
      };
    }
    return {
      bg: 'bg-rose-50 border-rose-400 text-rose-950',
      dot: 'bg-rose-600',
      title: 'High Pollution — Walk Indoors',
      sub: t.statusRed,
    };
  };

  const statusBadge = getTrafficLightBadge(windowData?.window.trafficLight);

  // Generate Google Maps Turn-by-Turn Navigation URL with sequentially sampled park waypoints
  const googleMapsWalkUrl = useMemo(() => {
    if (!planData?.bestLoop?.coordinates || planData.bestLoop.coordinates.length < 2) return '';
    const coords = planData.bestLoop.coordinates; // [lon, lat]
    const origin = `${coords[0][1]},${coords[0][0]}`;
    const destination = `${coords[coords.length - 1][1]},${coords[coords.length - 1][0]}`;

    // Sample 5-6 evenly spaced intermediate waypoints around the loop
    const numWaypoints = Math.min(6, Math.max(2, Math.floor(coords.length / 5)));
    const step = Math.floor(coords.length / (numWaypoints + 1));
    const waypoints: string[] = [];
    for (let i = 1; i <= numWaypoints; i++) {
      const pt = coords[i * step];
      if (pt) {
        waypoints.push(`${pt[1]},${pt[0]}`);
      }
    }
    const waypointsParam = waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=walking`;
  }, [planData]);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 font-sans">
      {/* 1. Demo Mode Warning Banner */}
      {demo && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t.demoBadge}</span>
        </div>
      )}

      {/* 2. Senior-First App Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 md:px-6 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {t.appTitle}
                </h1>
                <span
                  className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    demo
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {demo ? 'DEMO GRID' : 'LIVE PARK'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <span>📍</span>
              <span className="hidden md:inline">Current Area:</span>
              <span className="text-emerald-800 font-black">
                {lat === 28.5933 && lon === 77.2215 ? 'Lodhi Gardens' : `${lat.toFixed(3)}, ${lon.toFixed(3)}`}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* 3. Main Layout Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Decluttered Controls (4 cols) */}
        <div className="lg:col-span-4">
          <ControlsSidebar
            language={language}
            onLanguageChange={setLanguage}
            demo={demo}
            onDemoChange={setDemo}
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
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-4 rounded-xl flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">{t.errorTitle}</h4>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Cleanest Window & Safety Hero Card */}
          {windowData && (
            <div className={`rounded-2xl p-5 border-2 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${statusBadge.bg}`}>
              <div className="flex items-start gap-3.5">
                <span className={`w-4 h-4 rounded-full ${statusBadge.dot} animate-pulse shrink-0 mt-1.5`}></span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {t.isItSafe}
                  </span>
                  <div className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">
                    {statusBadge.title}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {statusBadge.sub}
                  </div>
                </div>
              </div>

              {/* Cleanest Window Slot */}
              <div className="bg-white/90 backdrop-blur-xs px-4 py-3 rounded-xl border border-slate-200 shadow-2xs shrink-0 text-right md:text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  {t.cleanestWindow}
                </span>
                <div className="text-lg md:text-xl font-black text-slate-900 mt-0.5">
                  {windowData.window.startHour.toString().padStart(2, '0')}:00 – {windowData.window.endHour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-[11px] font-semibold text-emerald-800">
                  ~{windowData.window.meanPm25.toFixed(0)} µg/m³ PM2.5
                </div>
              </div>
            </div>
          )}

          {/* Three Key Elder Metrics Cards */}
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

          {/* Primary Map Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{t.cleanLoop}</span>
                  <span className="text-xs font-normal text-slate-500 hidden sm:inline">(vs typical street)</span>
                </h3>
              </div>

              {/* Start Walking in Google Maps Navigation Button */}
              {googleMapsWalkUrl && (
                <a
                  href={googleMapsWalkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs md:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Opens Google Maps Walking Directions with park waypoints"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.startWalkingGoogleMaps || 'Start Walking in Google Maps'}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
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

          {/* Indoor Fallback Alert Card (Prominent when status is RED or as comfortable indoor walk) */}
          {planData?.indoorFallbacks && planData.indoorFallbacks.length > 0 && (
            <IndoorFallbackCard
              venues={planData.indoorFallbacks}
              isRedStatus={windowData?.window.trafficLight === 'RED'}
              language={language}
            />
          )}

          {/* 24-Hour PM2.5 Forecast Card (Collapsible to prevent clutter) */}
          {windowData && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <details className="group">
                <summary className="font-bold text-slate-800 text-sm cursor-pointer flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>{t.pm25ChartTitle}</span>
                  </div>
                  <span className="text-xs text-slate-500 group-open:hidden">Tap to inspect 24h curve ▼</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <AirQualityChart
                    hourlyPm25={windowData.window.hourlyPm25}
                    selectedHour={hour}
                    bestStartHour={windowData.window.startHour}
                    onSelectHour={setHour}
                    title=""
                  />
                </div>
              </details>
            </div>
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
