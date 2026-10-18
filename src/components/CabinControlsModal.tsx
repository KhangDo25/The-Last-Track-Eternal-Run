import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { ThrottleLevel } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { Gauge, AlertOctagon, Volume2, X } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface CabinControlsModalProps {
  engine: GameEngine;
  onClose: () => void;
  language: Language;
}

export const CabinControlsModal: React.FC<CabinControlsModalProps> = ({ engine, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const ts = engine.trainStats;
  const throttles: { label: string; value: ThrottleLevel }[] = [
    { label: t.idle, value: 0 },
    { label: t.slow, value: 25 },
    { label: t.cruise, value: 50 },
    { label: t.flank, value: 75 },
    { label: t.maximum, value: 100 },
    { label: t.overdrive, value: 120 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider uppercase text-zinc-100">
                {t.cabTitle}
              </h2>
              <span className="text-xs text-zinc-500">{t.cabSubtitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gauges & Telemetry */}
        <div className="grid grid-cols-3 gap-3 my-6 text-center">
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">{t.currentSpeed}</span>
            <span className="text-2xl font-extrabold text-amber-400 tabular-nums">
              {Math.round(ts.currentSpeed)}
            </span>
            <span className="text-[10px] text-zinc-500 block">/ {ts.maxSpeed} km/h max</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">{t.fuelLevel}</span>
            <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
              {Math.round((ts.currentFuel / ts.maxFuel) * 100)}%
            </span>
            <span className="text-[10px] text-zinc-500 block">{ts.currentFuel.toFixed(1)} / {ts.maxFuel} L</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">{t.trainMass}</span>
            <span className="text-2xl font-extrabold text-cyan-400 tabular-nums">
              {ts.totalWeight.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-500 block">Metric Tons</span>
          </div>
        </div>

        {/* Throttle Controls (Section 8.1) */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            {t.regulatorPosition}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {throttles.map((thr) => {
              const active = ts.throttle === thr.value;
              return (
                <button
                  key={thr.value}
                  onClick={() => engine.setThrottle(thr.value)}
                  className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                  }`}
                >
                  {thr.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => {
              engine.triggerEmergencyBrake();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-950/85 border border-red-600/80 text-red-200 hover:bg-red-900 font-extrabold text-xs transition-colors shadow-lg"
          >
            <AlertOctagon className="w-4 h-4 text-red-500" />
            {t.emergencyBrakeBtn}
          </button>

          <button
            onClick={() => {
              soundManager.playHorn();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 font-bold text-xs transition-colors shadow-sm"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            {t.blowHornBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
