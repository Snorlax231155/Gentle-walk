import React from 'react';
import { IndoorVenue } from '../types';
import { Building2, Wind, Armchair, Accessibility, ExternalLink, Navigation } from 'lucide-react';

interface IndoorFallbackCardProps {
  venues: IndoorVenue[];
  isRedStatus: boolean;
  language: 'en' | 'hi';
}

export const IndoorFallbackCard: React.FC<IndoorFallbackCardProps> = ({
  venues,
  isRedStatus,
  language,
}) => {
  if (!venues || venues.length === 0) return null;

  const isHindi = language === 'hi';

  return (
    <div className={`rounded-2xl p-5 border-2 shadow-sm transition-all ${
      isRedStatus
        ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-200'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-1 ${
            isRedStatus ? 'bg-rose-600 text-white' : 'bg-blue-100 text-blue-800'
          }`}>
            <Building2 className="w-3.5 h-3.5" />
            {isRedStatus
              ? (isHindi ? '🚨 प्रदूषण अलर्ट — इनडोर विकल्प' : '🚨 High Pollution Alert — Indoor Safe Walk')
              : (isHindi ? 'इनडोर स्वच्छ वायु विकल्प' : 'Indoor Climate-Controlled Walking')}
          </span>
          <h3 className="text-lg font-black text-slate-900">
            {isHindi ? 'वातानुकूलित इनडोर टहलने के सुरक्षित स्थल' : 'HEPA Filtered Indoor Walking Alternatives'}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {isRedStatus
              ? (isHindi ? 'बाहर की हवा हानिकारक है। बुजुर्गों को इनडोर मॉल या संग्रहालय में टहलने की सलाह दी जाती है।' : 'Outdoor air is currently unhealthy. Elders are strongly advised to walk in vetted indoor venues with air filtration.')
              : (isHindi ? 'मॉल, संग्रहालय व इनडोर परिसरों में स्वच्छ हवा में सैर करें।' : 'Walk comfortably in level, air-filtered indoor corridors with zero vehicle emissions.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {venues.map((venue, idx) => {
          const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lon}&travelmode=walking`;

          return (
            <div
              key={`venue-${idx}`}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {venue.name}
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                    {venue.distanceKm} km away
                  </span>
                </div>

                <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                  {venue.category} • ~{venue.estimatedLoopMeters.toFixed(0)}m indoor loop
                </div>

                {/* Filtration Status */}
                <div className="flex items-start gap-1.5 mt-2.5 text-xs text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                  <Wind className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium text-[11px] leading-tight">{venue.filtrationStatus}</span>
                </div>

                {/* Elder Features */}
                <div className="flex flex-wrap gap-2 mt-2.5 text-[11px] text-slate-600">
                  {venue.hasRestBenches && (
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Armchair className="w-3 h-3 text-slate-500" /> Benches available
                    </span>
                  )}
                  {venue.elevatorAccessible && (
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Accessibility className="w-3 h-3 text-slate-500" /> Step-free / Elevators
                    </span>
                  )}
                </div>

                {/* Senior tip */}
                <p className="text-[11px] text-slate-500 italic mt-2.5">
                  💡 "{venue.seniorTip}"
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{venue.openingHours}</span>
                <a
                  href={navUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {isHindi ? 'दिशा निर्देश' : 'Navigate'}
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
