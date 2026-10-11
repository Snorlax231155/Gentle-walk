import React, { useState, useEffect } from 'react';
import { CreateCommunityRouteRequest, CommunityStop, CommunityRoute, LoopResult, StopType } from '../types';
import { submitCommunityRoute } from '../services/api';
import { TrailStudioMap, StudioTool } from './TrailStudioMap';
import { calculatePathDistanceMeters, estimateElderMinutes } from '../utils/geo';
import { X, Sparkles, MapPin, Check, Plus, Trash2, Edit3, Compass } from 'lucide-react';

interface SubmitRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLoop?: LoopResult;
  currentLat: number;
  currentLon: number;
  locationName: string;
  estimatedPm25?: number;
  onRouteSubmitted: (route: CommunityRoute) => void;
  initialDrawnCoordinates?: [number, number][];
  initialCustomStops?: CommunityStop[];
}

const AVAILABLE_TAGS = [
  '🌳 Shaded Canopy',
  '🪑 Plentiful Benches',
  '🚰 Filtered Water',
  '🦯 Step-Free Ramps',
  '🌸 Fragrant Gardens',
  '🔇 Quiet & Vehicle-Free',
  '🛡️ Safe & Guarded',
  '🟢 Lowest PM2.5',
];

export const SubmitRouteModal: React.FC<SubmitRouteModalProps> = ({
  isOpen,
  onClose,
  currentLoop,
  currentLat,
  currentLon,
  locationName,
  estimatedPm25 = 18,
  onRouteSubmitted,
  initialDrawnCoordinates,
  initialCustomStops,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '🌳 Shaded Canopy',
    '🪑 Plentiful Benches',
    '🦯 Step-Free Ramps',
  ]);

  // Route drawing & manual stops state
  const [drawnCoordinates, setDrawnCoordinates] = useState<[number, number][]>([]);
  const [customStops, setCustomStops] = useState<CommunityStop[]>([]);
  const [activeTool, setActiveTool] = useState<StudioTool>('draw');
  const [selectedStopType, setSelectedStopType] = useState<StopType>('BENCH');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset coordinates and stops when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDrawnCoordinates && initialDrawnCoordinates.length > 0) {
        setDrawnCoordinates(initialDrawnCoordinates);
      } else if (currentLoop && currentLoop.coordinates.length > 0) {
        setDrawnCoordinates(currentLoop.coordinates);
      } else {
        // Fallback gentle diamond loop around current center
        setDrawnCoordinates([
          [currentLon, currentLat],
          [currentLon + 0.0018, currentLat + 0.0012],
          [currentLon + 0.0025, currentLat - 0.0008],
          [currentLon + 0.0008, currentLat - 0.0015],
          [currentLon, currentLat],
        ]);
      }

      if (initialCustomStops && initialCustomStops.length > 0) {
        setCustomStops(initialCustomStops);
      } else {
        setCustomStops([]);
      }

      setTitle('');
      setAuthor('');
      setDescription('');
      setError(null);
    }
  }, [isOpen, currentLoop, currentLat, currentLon, initialDrawnCoordinates, initialCustomStops]);

  // Auto-sync tags when user places specific PokéStop types
  useEffect(() => {
    const newTags = new Set(selectedTags);
    if (customStops.some((s) => s.type === 'BENCH')) newTags.add('🪑 Plentiful Benches');
    if (customStops.some((s) => s.type === 'SHADE')) newTags.add('🌳 Shaded Canopy');
    if (customStops.some((s) => s.type === 'WATER')) newTags.add('🚰 Filtered Water');
    if (customStops.some((s) => s.type === 'GARDEN')) newTags.add('🌸 Fragrant Gardens');
    if (customStops.some((s) => s.type === 'SANCTUARY')) newTags.add('🛡️ Safe & Guarded');
    setSelectedTags(Array.from(newTags));
  }, [customStops]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleUpdateStopName = (id: string, name: string) => {
    setCustomStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const handleUpdateStopDesc = (id: string, desc: string) => {
    setCustomStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, description: desc } : s))
    );
  };

  const handleRemoveStop = (id: string) => {
    setCustomStops((prev) => prev.filter((s) => s.id !== id));
  };

  const totalDistance = calculatePathDistanceMeters(drawnCoordinates);
  const estimatedMins = estimateElderMinutes(totalDistance);
  const benchCount = customStops.filter((s) => s.type === 'BENCH').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('Please provide both a Trail Title and your Name / Walk Club.');
      return;
    }

    if (drawnCoordinates.length < 2) {
      setError('Please draw at least 2 points on the map for the walking trail.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const startPt = drawnCoordinates[0];
    const payload: CreateCommunityRouteRequest = {
      title: title.trim(),
      author: author.trim(),
      description:
        description.trim() ||
        `Community elder loop near ${locationName} with ${benchCount} placed benches and clean air.`,
      tags: selectedTags,
      startLat: startPt[1],
      startLon: startPt[0],
      lengthMeters: totalDistance > 0 ? totalDistance : 950,
      durationMinutes: estimatedMins > 0 ? estimatedMins : 15,
      benchCount: benchCount,
      estimatedPm25: estimatedPm25,
      trafficLight: estimatedPm25 < 30 ? 'GREEN' : 'YELLOW',
      coordinates: drawnCoordinates,
      stops: customStops,
    };

    try {
      const savedRoute = await submitCommunityRoute(payload);
      onRouteSubmitted(savedRoute);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit community route');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-6 py-4 sm:py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl shadow-inner">
              ✨
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Trail Studio: Draw & Share Community Route
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Click map to draw your route and drop seating, shade & water PokéStops.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[82vh]">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Interactive Map Section */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Step 1: Draw Route & Place Rest Stops Directly on Map</span>
              </label>
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                {activeTool === 'draw'
                  ? '✏️ Click on map to add waypoints'
                  : `📍 Click on map to drop ${selectedStopType.toLowerCase()} stop`}
              </div>
            </div>

            {/* Embedded TrailStudioMap */}
            <TrailStudioMap
              center={[currentLat, currentLon]}
              drawnCoordinates={drawnCoordinates}
              onCoordinatesChange={setDrawnCoordinates}
              customStops={customStops}
              onStopsChange={setCustomStops}
              currentLoop={currentLoop}
              selectedStopType={selectedStopType}
              onSelectedStopTypeChange={setSelectedStopType}
              activeTool={activeTool}
              onActiveToolChange={setActiveTool}
            />
          </div>

          {/* Placed PokéStops List (Manually Placed by User) */}
          {customStops.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>📍 Placed PokéStop Milestones ({customStops.length})</span>
                </h4>
                <span className="text-[11px] text-emerald-700">
                  {benchCount} Benches · {customStops.length - benchCount} Amenities
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {customStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="bg-white p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-lg shrink-0 mt-0.5">
                        {stop.type === 'BENCH' ? '🪑' :
                         stop.type === 'SHADE' ? '🌳' :
                         stop.type === 'WATER' ? '🚰' :
                         stop.type === 'GARDEN' ? '🌸' : '🛡️'}
                      </span>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={stop.name}
                          onChange={(e) => handleUpdateStopName(stop.id, e.target.value)}
                          placeholder="Stop name"
                          className="w-full font-bold text-slate-900 border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-hidden text-xs py-0.5"
                        />
                        <input
                          type="text"
                          value={stop.description}
                          onChange={(e) => handleUpdateStopDesc(stop.id, e.target.value)}
                          placeholder="Notes / Tips"
                          className="w-full text-slate-500 text-[11px] focus:outline-hidden py-0.5"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Remove stop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Trail Metadata Form */}
          <div className="pt-2 border-t border-slate-200 space-y-3.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Add Trail Info & Community Endorsement</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Trail Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Trail Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Banyan Promenade & Lotus Pond Walk"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Author / Walk Club */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Your Name or Senior Walk Club <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Captain Rao (Age 74), Lodhi Morning Walkers"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Elder Tips & Walk Recommendations
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share advice on flat pavement, morning shade, seating spacing, or clean oxygen..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Elder Tags Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Elder Features & Badges
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-700">{totalDistance} meters</span> ·{' '}
              <span>~{estimatedMins} min</span> ·{' '}
              <span>{customStops.length} stops</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
              >
                {submitting ? (
                  <span>Publishing Trail...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Publish Community Trail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
