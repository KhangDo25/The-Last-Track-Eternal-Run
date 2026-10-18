import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Package, ArrowRight, ArrowLeft, X, ShieldAlert } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface StorageModalProps {
  engine: GameEngine;
  onClose: () => void;
  language: Language;
}

export const StorageModal: React.FC<StorageModalProps> = ({ engine, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const [, setRefresh] = useState(0);

  // Calculate player inventory weight
  const playerWeight = engine.inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0);
  const maxPlayerWeight = 60.0; // kg max carry

  // Section 28 Movement Penalty status
  let penaltyStatus = language === 'vi' ? 'Bình Thường (0% Phạt)' : 'Normal (0% Penalty)';
  let penaltyColor = 'text-emerald-400';
  if (playerWeight > 50) {
    penaltyStatus = language === 'vi' ? 'Quá Tải (-50% Tốc Độ)' : 'Overweight (-50% Speed)';
    penaltyColor = 'text-red-500';
  } else if (playerWeight > 40) {
    penaltyStatus = language === 'vi' ? 'Rất Nặng (-30% Tốc Độ)' : 'Very Heavy (-30% Speed)';
    penaltyColor = 'text-amber-500';
  } else if (playerWeight > 25) {
    penaltyStatus = language === 'vi' ? 'Nặng (-15% Tốc Độ)' : 'Heavy (-15% Speed)';
    penaltyColor = 'text-yellow-400';
  }

  // Train Cargo weight in tons
  const trainCargoWeightKg = engine.storage.reduce((sum, it) => sum + it.weight * it.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[580px] flex flex-col shadow-2xl font-mono text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider uppercase text-zinc-100">
                {t.storageTitle}
              </h2>
              <span className="text-xs text-zinc-500">{t.storageSubtitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-800 overflow-hidden">
          {/* Left Column: Player Backpack */}
          <div className="p-6 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-bold text-zinc-300 uppercase">{t.backpack}</span>
                <span className="text-xs text-zinc-400 tabular-nums">
                  {playerWeight.toFixed(1)} / {maxPlayerWeight} kg
                </span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mb-3 border border-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    playerWeight > 50 ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, (playerWeight / maxPlayerWeight) * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] mb-4">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500">{t.mobility}</span>
                <span className={`font-semibold ${penaltyColor}`}>{penaltyStatus}</span>
              </div>

              {/* Items List */}
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                {engine.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900/75 border border-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-200">{item.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        Qty: {item.quantity} · {(item.weight * item.quantity).toFixed(1)} kg total
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {['Food', 'Water', 'Material'].includes(item.type) && (
                        <button
                          onClick={() => {
                            engine.consumeItem(item.id);
                            setRefresh((r) => r + 1);
                          }}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 rounded-lg transition-colors"
                        >
                          {language === 'vi' ? 'Dùng' : 'Use'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          engine.transferToStorage(item.id, Math.min(item.quantity, 10));
                          setRefresh((r) => r + 1);
                        }}
                        className="p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg flex items-center transition-all shadow-sm"
                        title="Deposit to Train Storage"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Train Freight Car */}
          <div className="p-6 flex flex-col justify-between overflow-hidden bg-zinc-900/20">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-bold text-zinc-300 uppercase">{t.cargoBay}</span>
                <span className="text-xs text-cyan-400 tabular-nums">
                  {(trainCargoWeightKg / 1000).toFixed(2)} Metric Tons
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                {t.cargoImpactNotice}
              </p>

              {/* Stored items */}
              <div className="space-y-2 overflow-y-auto max-h-[320px] pr-2">
                {engine.storage.length === 0 ? (
                  <div className="text-zinc-600 text-xs italic text-center py-12">
                    {t.emptyStorage}
                  </div>
                ) : (
                  engine.storage.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900/75 border border-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs"
                    >
                      <button
                        onClick={() => {
                          engine.transferToInventory(item.id, Math.min(item.quantity, 10));
                          setRefresh((r) => r + 1);
                        }}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center transition-colors"
                        title="Withdraw to Inventory"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="text-right">
                        <div className="font-bold text-zinc-200">{item.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          Qty: {item.quantity} · {(item.weight * item.quantity).toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
          <span>{t.depositNotice}</span>
          <span>{t.trainTotalWeight} <strong className="text-zinc-200 tabular-nums">{engine.trainStats.totalWeight.toFixed(1)} tons</strong></span>
        </div>
      </div>
    </div>
  );
};
