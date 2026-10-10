import React from 'react';
import { LoopResult } from '../types';
import { ShieldCheck, Footprints, Armchair } from 'lucide-react';

interface MetricCardsProps {
  bestLoop?: LoopResult;
  reductionPct: number;
  extraMinutes: number;
  labels: {
    exposureReduction: string;
    distance: string;
    benches: string;
    extraTime: string;
    minutes: string;
    meters: string;
  };
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  bestLoop,
  reductionPct,
  extraMinutes,
  labels,
}) => {
  if (!bestLoop) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* 1. Pollution Reduction Metric */}
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 shadow-sm flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-600 text-white rounded-lg mt-0.5">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            {labels.exposureReduction}
          </div>
          <div className="text-3xl font-black text-emerald-900 mt-1">
            {reductionPct > 0 ? `-${reductionPct.toFixed(1)}%` : 'Cleanest'}
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">
            {extraMinutes > 0 ? `+${extraMinutes.toFixed(1)} ${labels.minutes} ${labels.extraTime}` : 'Zero extra walk'}
          </div>
        </div>
      </div>

      {/* 2. Walk Distance & Duration */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3.5">
        <div className="p-2.5 bg-slate-700 text-white rounded-lg mt-0.5">
          <Footprints className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {labels.distance}
          </div>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {bestLoop.lengthMeters.toFixed(0)} <span className="text-lg font-bold text-slate-600">{labels.meters}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium">
            ~{bestLoop.durationMinutes.toFixed(0)} {labels.minutes} gentle pace
          </div>
        </div>
      </div>

      {/* 3. Rest Benches for Elders */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3.5">
        <div className="p-2.5 bg-amber-600 text-white rounded-lg mt-0.5">
          <Armchair className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {labels.benches}
          </div>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {bestLoop.benchCount}
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium">
            Rest stops along path
          </div>
        </div>
      </div>
    </div>
  );
};
