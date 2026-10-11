import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export interface PlaceResult {
  place_id: number;
  lat: string;
  lon: string;
  name: string;
  display_name: string;
  type: string;
}

interface PlaceSearchProps {
  onSelectPlace: (name: string, lat: number, lon: number) => void;
  label?: string;
  placeholder?: string;
  searchingLabel?: string;
  noPlacesLabel?: string;
}

export const PlaceSearch: React.FC<PlaceSearchProps> = ({
  onSelectPlace,
  label = 'Search Any Destination or Park',
  placeholder = 'Type park, colony, or city (e.g. Deer Park, Lalbagh)...',
  searchingLabel = 'Searching locations...',
  noPlacesLabel = 'No locations found. Try another keyword.',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setHasSearched(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&limit=5&addressdetails=1`;

      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GentleWalk/1.0 (hackathon-elder-planner)',
        },
      });

      if (!res.ok) throw new Error('Search failed');
      const data: PlaceResult[] = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Nominatim geocode error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 3) {
        searchPlaces(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (place: PlaceResult) => {
    const parsedLat = parseFloat(place.lat);
    const parsedLon = parseFloat(place.lon);
    const shortName = place.name || place.display_name.split(',')[0];
    onSelectPlace(shortName, parsedLat, parsedLon);
    setQuery(shortName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
        <span>{label}</span>
      </label>

      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchPlaces(query);
            }
          }}
          placeholder={placeholder}
          className="w-full text-xs font-medium pl-9 pr-8 py-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all text-slate-900"
        />

        {loading ? (
          <Loader2 className="w-4 h-4 text-emerald-600 absolute right-3 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="w-5 h-5 text-slate-400 hover:text-slate-600 absolute right-2.5 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>{searchingLabel}</span>
            </div>
          )}

          {!loading && results.length === 0 && hasSearched && (
            <div className="p-3 text-xs text-slate-500 italic text-center">
              {noPlacesLabel}
            </div>
          )}

          {!loading &&
            results.map((place) => {
              const displayNameParts = place.display_name.split(',');
              const mainName = place.name || displayNameParts[0];
              const subDetails = displayNameParts.slice(1, 4).join(',').trim();

              return (
                <button
                  key={place.place_id}
                  type="button"
                  onClick={() => handleSelect(place)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 border-b border-slate-100 last:border-b-0 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {mainName}
                    </div>
                    {subDetails && (
                      <div className="text-[11px] text-slate-500 truncate">
                        {subDetails}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
};
