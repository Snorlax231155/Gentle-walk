import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, Sparkles } from 'lucide-react';
import { searchPlacesApi } from '../services/api';
import { PlaceSearchResult } from '../types';

interface PlaceSearchProps {
  onSelectPlace: (name: string, lat: number, lon: number) => void;
  label?: string;
  placeholder?: string;
  searchingLabel?: string;
  noPlacesLabel?: string;
  isHero?: boolean;
}

export const PlaceSearch: React.FC<PlaceSearchProps> = ({
  onSelectPlace,
  label = 'Search Any Destination or Park',
  placeholder = 'Type park, colony, or city (e.g. Lodhi Gardens, Delhi)...',
  searchingLabel = 'Searching locations...',
  noPlacesLabel = 'No locations found. Try another keyword.',
  isHero = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const data = await searchPlacesApi(trimmed);
      setResults(data);
      setIsOpen(true);
    } catch (err: any) {
      console.error('Place search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchPlaces(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (place: PlaceSearchResult) => {
    onSelectPlace(place.name, place.lat, place.lon);
    setQuery(place.name);
    setIsOpen(false);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[0]);
      } else if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const data = await searchPlacesApi(query.trim());
          if (data && data.length > 0) {
            handleSelect(data[0]);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && !isHero && (
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}

      <div className="relative flex items-center">
        <Search
          className={`${
            isHero ? 'w-5 h-5 text-emerald-600 left-4' : 'w-4 h-4 text-slate-400 left-3'
          } absolute pointer-events-none`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full font-medium transition-all text-slate-900 ${
            isHero
              ? 'text-base pl-12 pr-10 py-3.5 rounded-2xl border-2 border-emerald-400 bg-white shadow-lg focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400'
              : 'text-xs pl-9 pr-8 py-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
          }`}
        />

        {loading ? (
          <Loader2
            className={`${
              isHero ? 'w-5 h-5 right-4 text-emerald-600' : 'w-4 h-4 right-3 text-emerald-600'
            } absolute animate-spin`}
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className={`${
              isHero ? 'w-7 h-7 right-3' : 'w-5 h-5 right-2.5'
            } text-slate-400 hover:text-slate-600 absolute flex items-center justify-center cursor-pointer`}
          >
            <X className={isHero ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="p-3.5 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{searchingLabel}</span>
            </div>
          )}

          {!loading && results.length === 0 && hasSearched && (
            <div className="p-4 text-xs text-slate-500 italic text-center">
              {noPlacesLabel}
            </div>
          )}

          {results.map((place, idx) => {
            const displayNameParts = place.displayName.split(',');
            const subDetails = displayNameParts.slice(1, 4).join(',').trim();

            return (
              <button
                key={`${place.name}-${idx}`}
                type="button"
                onClick={() => handleSelect(place)}
                className="w-full text-left px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 border-b border-slate-100 last:border-b-0 flex items-start gap-3 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {place.name}
                    </span>
                    {place.isCurated && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                        <Sparkles className="w-2.5 h-2.5" />
                        Curated
                      </span>
                    )}
                  </div>
                  {subDetails && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
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
