import React, { useState } from 'react';
import { CreateCommunityRouteRequest, CommunityStop, CommunityRoute, LoopResult } from '../types';
import { submitCommunityRoute } from '../services/api';
import { X, Sparkles, MapPin, Check, Plus, Trash2 } from 'lucide-react';

interface SubmitRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLoop?: LoopResult;
  currentLat: number;
  currentLon: number;
  locationName: string;
  estimatedPm25?: number;
  onRouteSubmitted: (route: CommunityRoute) => void;
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
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '🌳 Shaded Canopy',
    '🪑 Plentiful Benches',
    '🦯 Step-Free Ramps',
  ]);
  const [customStops, setCustomStops] = useState<CommunityStop[]>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopType, setNewStopType] = useState('BENCH');
  const [newStopDesc, setNewStopDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    const newStop: CommunityStop = {
      id: `stop-${Date.now()}`,
      name: newStopName.trim(),
      type: newStopType,
      description: newStopDesc.trim() || 'Community approved rest point.',
      lat: currentLat,
      lon: currentLon,
    };
    setCustomStops((prev) => [...prev, newStop]);
    setNewStopName('');
    setNewStopDesc('');
  };

  const handleRemoveStop = (id: string) => {
    setCustomStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('Please provide both a Trail Title and your Name / Walk Club.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Fallback coordinates if no loop generated yet
    const coords: [number, number][] = currentLoop && currentLoop.coordinates.length > 0
      ? currentLoop.coordinates
      : [
          [currentLon, currentLat],
          [currentLon + 0.002, currentLat + 0.002],
          [currentLon + 0.003, currentLat + 0.001],
          [currentLon + 0.001, currentLat - 0.001],
          [currentLon, currentLat],
        ];

    const dist = currentLoop ? currentLoop.lengthMeters : 1200;
    const dur = currentLoop ? currentLoop.durationMinutes : 20;
    const benches = currentLoop ? currentLoop.benchCount : 6;

    const payload: CreateCommunityRouteRequest = {
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || `Elder-friendly trail around ${locationName} with clean air and rest benches.`,
      tags: selectedTags,
      startLat: currentLat,
      startLon: currentLon,
      lengthMeters: dist,
      durationMinutes: dur,
      benchCount: benches,
      estimatedPm25: estimatedPm25,
      trafficLight: estimatedPm25 < 30 ? 'GREEN' : 'YELLOW',
      coordinates: coords,
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl shadow-inner">
              ✨
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Submit Your Community Trail</h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Share your favorite quiet loop and rest spots with neighborhood elders.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Location & Route Info Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">{locationName}</span>
                <span className="text-slate-500 ml-1">({currentLat.toFixed(4)}, {currentLon.toFixed(4)})</span>
              </div>
            </div>
            {currentLoop && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                {(currentLoop.lengthMeters / 1000).toFixed(1)} km · ~{currentLoop.durationMinutes} min
              </span>
            )}
          </div>

          {/* Trail Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Trail Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Heritage Banyan Morning Loop, Rose Pavilion Quiet Path"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Your Name or Walk Group <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., Grandpa Ashok (Age 73), Lodhi Dawn Walkers Club"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Elder Tips & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the shade, flat surfaces, bench spacing, or scenery along this walk..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Elder Tags Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Elder Features & Badges
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PokéStop Rest Milestones */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-emerald-900">
                  PokéStop Rest Milestones (Optional)
                </h4>
                <p className="text-[11px] text-emerald-700">
                  Mark rest benches, water fountains, or shade gazebos along your trail.
                </p>
              </div>
            </div>

            {/* Existing custom stops */}
            {customStops.length > 0 && (
              <div className="space-y-2 mb-3">
                {customStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {stop.type === 'BENCH' ? '🪑' : stop.type === 'SHADE' ? '🌳' : stop.type === 'WATER' ? '🚰' : '🌸'}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900">{stop.name}</span>
                        <span className="text-slate-500 ml-1.5">· {stop.description}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new stop mini-row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Stop name (e.g. Neem Tree Bench)"
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <select
                value={newStopType}
                onChange={(e) => setNewStopType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="BENCH">🪑 Rest Bench</option>
                <option value="SHADE">🌳 Shaded Canopy</option>
                <option value="WATER">🚰 Water Dispenser</option>
                <option value="GARDEN">🌸 Flower Garden</option>
                <option value="SANCTUARY">🛡️ Peaceful Pavilion</option>
              </select>
              <button
                type="button"
                onClick={handleAddStop}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              * Note: If left empty, Gentle Walk will automatically place rest milestones along your walk!
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              {submitting ? (
                <span>Publishing to Community...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Publish Community Trail</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
