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
import { PlaceSearch } from './components/PlaceSearch';
import {
  Shield,
  AlertCircle,
  Sparkles,
  Sun,
  Info,
  Navigation,
  ExternalLink,
  Crosshair,
  ArrowLeft,
  Wind,
  Armchair,
  MapPin,
  TrendingDown,
} from 'lucide-react';

const POPULAR_DESTINATIONS = [
  {
    name: 'Lodhi Gardens',
    city: 'New Delhi',
    tag: 'Tree-lined historic park with 12+ benches',
    emoji: '🌳',
    lat: 28.5933,
    lon: 77.2215,
    demo: false,
  },
  {
    name: 'Sanjay Van',
    city: 'South Delhi',
    tag: 'Dense bird sanctuary canopy & low PM2.5',
    emoji: '🌲',
    lat: 28.5284,
    lon: 77.1741,
    demo: false,
  },
  {
    name: 'Cubbon Park',
    city: 'Bengaluru',
    tag: 'Traffic-free morning bamboo groves',
    emoji: '🌿',
    lat: 12.9763,
    lon: 77.5929,
    demo: false,
  },
  {
    name: 'India Habitat Centre',
    city: 'New Delhi',
    tag: 'Sheltered shaded corridors & HEPA filtered air',
    emoji: '🏛️',
    lat: 28.5898,
    lon: 77.2250,
    demo: false,
  },
  {
    name: 'Synthetic Elder Colony',
    city: 'Demo Mode',
    tag: 'Simulated elder-friendly loop with rest stops',
    emoji: '🏢',
    lat: 28.6139,
    lon: 77.2090,
    demo: true,
  },
];

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  // View Mode: 'home' shows uncluttered welcoming landing; 'planner' shows map & route dashboard
  const [viewMode, setViewMode] = useState<'home' | 'planner'>('home');

  // Location State
  const [demo, setDemo] = useState<boolean>(false);
  const [lat, setLat] = useState<number>(28.5933);
  const [lon, setLon] = useState<number>(77.2215);
  const [locationName, setLocationName] = useState<string>('Lodhi Gardens, New Delhi');
  const [locating, setLocating] = useState<boolean>(false);

  // Planner Options
  const [mapClickMode, setMapClickMode] = useState<'set-start' | 'add-hotspot'>('set-start');
  const [radiusM, setRadiusM] = useState<number>(800);
  const [minutes, setMinutes] = useState<number>(20);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('NORMAL');
  const [lowMobility, setLowMobility] = useState<boolean>(false);
  const [hour, setHour] = useState<number>(15);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Map Provider & Google Maps API key
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');

  // API State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [windowData, setWindowData] = useState<WindowResponse | null>(null);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);

  // Load air quality window
  const loadWindow = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchWindow(lat, lon, 1, demo);
      setWindowData(res);
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

  // When in planner mode, refresh window and plan
  useEffect(() => {
    if (viewMode === 'planner') {
      loadWindow();
    }
  }, [viewMode, loadWindow]);

  useEffect(() => {
    if (viewMode === 'planner' && windowData) {
      handlePlanWalk();
    }
  }, [viewMode, windowData, handlePlanWalk]);

  const handleSelectPlaceAndGo = (name: string, placeLat: number, placeLon: number, isDemo = false) => {
    setLat(placeLat);
    setLon(placeLon);
    setLocationName(name);
    setDemo(isDemo);
    setViewMode('planner');
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = Math.round(pos.coords.latitude * 10000) / 10000;
        const uLon = Math.round(pos.coords.longitude * 10000) / 10000;
        setLat(uLat);
        setLon(uLon);
        setLocationName(`Current Location (${uLat.toFixed(3)}, ${uLon.toFixed(3)})`);
        setDemo(false);
        setViewMode('planner');
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

  // Google Maps walking directions URL
  const googleMapsWalkUrl = useMemo(() => {
    if (!planData?.bestLoop?.coordinates || planData.bestLoop.coordinates.length < 2) return '';
    const coords = planData.bestLoop.coordinates;
    const origin = `${coords[0][1]},${coords[0][0]}`;
    const destination = `${coords[coords.length - 1][1]},${coords[coords.length - 1][0]}`;

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

  const handleSetStartFromMap = (newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    setLocationName(`Map Pin (${newLat.toFixed(3)}, ${newLon.toFixed(3)})`);
    setDemo(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* =========================================================================
          VIEW 1: CLEAN, UNCLUTTERED HOME / LANDING PAGE
         ========================================================================= */}
      {viewMode === 'home' && (
        <div className="min-h-screen flex flex-col justify-between">
          {/* Header */}
          <header className="py-4 px-6 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-700 text-white rounded-2xl shadow-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {t.appTitle}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    {t.tagline}
                  </p>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    language === 'en' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    language === 'hi' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="max-w-5xl mx-auto px-6 py-10 md:py-16 flex-1 flex flex-col items-center justify-center text-center">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hyperlocal clean-air walking planner for elders</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight max-w-2xl leading-tight">
              {t.heroTitle || 'Breathe Easy. Walk Gently.'}
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-600 max-w-xl font-medium leading-relaxed">
              {t.heroSubtitle ||
                'Discover the cleanest, shaded, and bench-filled walking loops near you — avoiding pollution hotspots and steep slopes.'}
            </p>

            {/* Search Box & GPS Locate Bar */}
            <div className="w-full max-w-2xl mt-8 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <PlaceSearch
                  isHero={true}
                  onSelectPlace={(name, pLat, pLon) => handleSelectPlaceAndGo(name, pLat, pLon, false)}
                  placeholder={t.searchPlaceholder || 'Type park, colony, or city (e.g. Lodhi Gardens, Delhi)...'}
                  searchingLabel={t.searching}
                  noPlacesLabel={t.noPlacesFound}
                />
              </div>

              {/* Big Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="w-full sm:w-auto px-5 py-3.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? t.locating || 'Locating...' : t.useMyLocation || 'Use My Location'}</span>
              </button>
            </div>

            {/* Popular Curated Parks Grid */}
            <div className="w-full max-w-4xl mt-12 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.popularDestinations || 'Popular Clean-Air Walking Parks'}</span>
                </h3>
                <span className="text-xs text-slate-400">Click to explore instant route</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {POPULAR_DESTINATIONS.map((dest, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPlaceAndGo(dest.name, dest.lat, dest.lon, dest.demo)}
                    className="p-4 bg-white hover:bg-emerald-50/70 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{dest.emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-900 transition-colors">
                          {dest.city}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-950 transition-colors">
                        {dest.name}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {dest.tag}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span>View Clean Loop</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Elder Protection Pillars */}
            <div className="w-full max-w-4xl mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left border-t border-slate-200/80 pt-8">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t.feature1Title || 'Minimal Inhaled Particulates'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t.feature1Desc ||
                      'Calculates route exposure vs. typical vehicular roads (saves 20-40% inhaled PM2.5).'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl shrink-0">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t.feature2Title || 'Frequent Rest Benches'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t.feature2Desc ||
                      'Prioritizes footpaths with documented park benches for comfortable elder rest intervals.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-900 rounded-xl shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    {t.feature3Title || 'Gentle Slope Avoidance'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t.feature3Desc ||
                      'Excludes steep paths with >5% incline for joint and cardiovascular safety.'}
                  </p>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
            <div className="max-w-5xl mx-auto px-6">
              <span>{t.disclaimerText}</span>
            </div>
          </footer>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: MAP & ROUTE DASHBOARD (APPEARS WHEN SEARCHED OR LOCATED)
         ========================================================================= */}
      {viewMode === 'planner' && (
        <div className="pb-16">
          {/* Demo Mode Notice */}
          {demo && (
            <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t.demoBadge}</span>
            </div>
          )}

          {/* Planner Sticky Header */}
          <header className="bg-white border-b border-slate-200 py-3.5 px-4 md:px-6 shadow-xs sticky top-0 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Back to Home Button */}
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Change destination or return to landing screen"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.backToHome || 'Change Destination'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-700 text-white rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h1 className="text-lg md:text-xl font-black text-slate-900 hidden sm:block">
                    {t.appTitle}
                  </h1>
                </div>
              </div>

              {/* Current Destination Display */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 max-w-[260px] md:max-w-[340px]">
                  <span className="text-emerald-700 shrink-0">📍</span>
                  <span className="text-emerald-950 font-black truncate">
                    {locationName}
                  </span>
                </span>

                {/* Language Switch */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-0.5 rounded ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('hi')}
                    className={`px-2 py-0.5 rounded ${language === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Layout Container */}
          <main className="max-w-7xl mx-auto px-4 md:px-6 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Sidebar Controls (4 cols) */}
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
                placeName={locationName}
                onSelectPlaceName={setLocationName}
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

            {/* Right Column: Maps, Metrics & Safety (8 cols) */}
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
                <div
                  className={`rounded-2xl p-5 border-2 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${statusBadge.bg}`}
                >
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
                      {windowData.window.startHour.toString().padStart(2, '0')}:00 –{' '}
                      {windowData.window.endHour.toString().padStart(2, '0')}:00
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
                    onSetStartCoords={handleSetStartFromMap}
                    clickAction={mapClickMode}
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
                    onSetStartCoords={handleSetStartFromMap}
                    clickAction={mapClickMode}
                    onClickActionChange={setMapClickMode}
                    cleanLoopLabel={t.cleanLoop}
                    typicalLoopLabel={t.typicalLoop}
                    labels={{
                      setStartPoint: t.setStartPoint,
                      markHotspot: t.markHotspot,
                    }}
                  />
                )}
              </div>

              {/* Indoor Fallback Alert Card */}
              {planData?.indoorFallbacks && planData.indoorFallbacks.length > 0 && (
                <IndoorFallbackCard
                  venues={planData.indoorFallbacks}
                  isRedStatus={windowData?.window.trafficLight === 'RED'}
                  language={language}
                />
              )}

              {/* 24-Hour PM2.5 Forecast Card (Collapsible) */}
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
      )}
    </div>
  );
}

export default App;
