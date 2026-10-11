import React, { useState, useEffect } from 'react';
import { CommunityRoute } from '../types';
import { fetchCommunityRoutes, cheerCommunityRoute, walkCommunityRoute } from '../services/api';
import { X, Heart, Wind, Clock, Users, Sparkles, Navigation, Plus, Award, ChevronRight } from 'lucide-react';

interface CommunityTrailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLat?: number;
  userLon?: number;
  onSelectRoute: (route: CommunityRoute) => void;
  onOpenSubmitModal: () => void;
}

export const CommunityTrailsModal: React.FC<CommunityTrailsModalProps> = ({
  isOpen,
  onClose,
  userLat,
  userLon,
  onSelectRoute,
  onOpenSubmitModal,
}) => {
  const [routes, setRoutes] = useState<CommunityRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'nearby' | 'popular' | 'all'>('nearby');
  const [cheeredMap, setCheeredMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchCommunityRoutes(userLat, userLon, 100)
      .then((data) => {
        if (isMounted) {
          setRoutes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load community routes');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userLat, userLon]);

  if (!isOpen) return null;

  const handleCheer = async (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation();
    if (cheeredMap[routeId]) return;

    // Optimistic UI update
    setCheeredMap((prev) => ({ ...prev, [routeId]: true }));
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, cheersCount: r.cheersCount + 1 } : r))
    );

    try {
      await cheerCommunityRoute(routeId);
    } catch (err) {
      console.error('Failed to cheer route:', err);
    }
  };

  const handleWalk = (route: CommunityRoute) => {
    // Record walk asynchronously
    walkCommunityRoute(route.id).catch(() => {});
    onSelectRoute(route);
    onClose();
  };

  const filteredRoutes = [...routes].sort((a, b) => {
    if (filter === 'popular') {
      return b.cheersCount + b.walkersCount - (a.cheersCount + a.walkersCount);
    }
    // 'nearby' or 'all' keeps server distance sorting
    return 0;
  });

  const getStopTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'BENCH':
        return '🪑';
      case 'SHADE':
        return '🌳';
      case 'WATER':
        return '🚰';
      case 'GARDEN':
        return '🌸';
      case 'SANCTUARY':
        return '🛡️';
      case 'VIEWPOINT':
        return '🌅';
      default:
        return '📍';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Pokémon GO style trail branding */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl shadow-inner">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Community Walking Trails</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-400/20 text-emerald-200 rounded-full border border-emerald-300/30">
                  PokéStop & Elder Network
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Curated by elders & neighborhood walking clubs. Verified rest stops, shade & clean air.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSubmitModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit A Trail</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar & Actions */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('nearby')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === 'nearby'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📍 Nearest Trails
            </button>
            <button
              onClick={() => setFilter('popular')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === 'popular'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🌟 Most Cheered & Loved
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📋 All Community Trails
            </button>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="sm:hidden flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Walk</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-16 text-center text-slate-500">
              <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Loading community elder trails & rest stops...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
              <p className="font-semibold">Unable to load community routes</p>
              <p className="text-xs mt-1 text-rose-600">{error}</p>
            </div>
          )}

          {!loading && !error && filteredRoutes.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              <p className="text-base font-semibold text-slate-700">No community trails found nearby.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Be the first elder walker in this area to chart a route with rest benches and clean air!
              </p>
              <button
                onClick={onOpenSubmitModal}
                className="mt-4 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-800 cursor-pointer"
              >
                Submit Your Favorite Trail
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filteredRoutes.map((route) => {
              const hasCheered = !!cheeredMap[route.id];
              return (
                <div
                  key={route.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 group"
                >
                  {/* Left / Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {route.title}
                      </h3>
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
                        {route.trafficLight === 'GREEN' ? '🟢 Pristine Air' : '🟡 Moderate Air'}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-emerald-800 flex items-center gap-1.5 mb-2">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>Curated by: <strong>{route.author}</strong></span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                      {route.description}
                    </p>

                    {/* Elder tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {route.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Rest Stops Preview (PokéStops along the trail) */}
                    {route.stops && route.stops.length > 0 && (
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 mb-3">
                        <div className="text-[11px] font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                          <span>📍 PokéStop Rest Milestones ({route.stops.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {route.stops.map((stop) => (
                            <div
                              key={stop.id}
                              className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-emerald-200 text-[11px] font-medium text-slate-700 shadow-2xs"
                              title={stop.description}
                            >
                              <span>{getStopTypeIcon(stop.type)}</span>
                              <span className="font-semibold text-slate-800">{stop.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick stats strip */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        {(route.lengthMeters / 1000).toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        ~{route.durationMinutes} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-amber-600">🪑</span>
                        {route.benchCount} Rest Benches
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-600" />
                        ~{route.estimatedPm25?.toFixed(0) || 16} µg/m³
                      </span>
                    </div>
                  </div>

                  {/* Right / Interaction buttons */}
                  <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {route.walkersCount} walkers
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        {route.cheersCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCheer(e, route.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          hasCheered
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                        }`}
                        title="Approve this route for elders"
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasCheered ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{hasCheered ? 'Cheered!' : 'Cheer'}</span>
                      </button>

                      <button
                        onClick={() => handleWalk(route)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer transform active:scale-95"
                      >
                        <span>Walk Trail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>All community trails are verified for elder step-free access and rest amenities.</span>
          </div>
          <span className="hidden sm:inline font-medium">Gentle Walk Community Network</span>
        </div>

      </div>
    </div>
  );
};
