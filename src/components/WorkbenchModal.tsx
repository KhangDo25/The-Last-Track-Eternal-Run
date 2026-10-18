import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Check, Hammer, X } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface WorkbenchModalProps {
  engine: GameEngine;
  onClose: () => void;
  language: Language;
}

export const WorkbenchModal: React.FC<WorkbenchModalProps> = ({ engine, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'Upgrades' | 'Crafting'>('Upgrades');
  const [selectedCarriageId, setSelectedCarriageId] = useState<string>('car_defense');
  const [, setRefresh] = useState(0);

  const selectedCar = engine.carriages.find((c) => c.id === selectedCarriageId) || engine.carriages[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[620px] flex flex-col shadow-2xl overflow-hidden font-mono text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider uppercase text-zinc-100">
                {t.wbTitle}
              </h2>
              <span className="text-xs text-zinc-500">{t.wbSubtitle}</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('Upgrades')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'Upgrades'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.tabUpgrades}
            </button>
            <button
              onClick={() => setActiveTab('Crafting')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'Crafting'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.tabCrafting}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'Upgrades' ? (
            /* SECTION 57 UPGRADE UI */
            <div className="flex-1 flex">
              {/* Left Column: Carriage Selector & Stats */}
              <div className="w-1/3 border-r border-zinc-800 p-6 flex flex-col justify-between bg-zinc-950">
                <div className="space-y-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    {t.selectCarriage}
                  </span>
                  <div className="space-y-2">
                    {engine.carriages.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCarriageId(c.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedCar.id === c.id
                            ? 'bg-zinc-900 border-amber-500/80 text-amber-300 font-bold shadow-md'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{c.name}</span>
                          <span className="text-[10px] text-zinc-500">{c.type}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Selected Carriage Diagnostics */}
                  <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">
                      {selectedCar.name.toUpperCase()}
                    </span>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t.hp}:</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {Math.round(selectedCar.currentHealth)} / {selectedCar.maxHealth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">ARMOR:</span>
                      <span className="font-bold text-zinc-200 tabular-nums">{selectedCar.armorRating}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t.trainWeight}:</span>
                      <span className="font-bold text-zinc-200 tabular-nums">{selectedCar.baseWeight.toFixed(1)} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t.powerGrid}:</span>
                      <span className="font-bold text-cyan-400 tabular-nums">
                        {selectedCar.powerProduction > 0
                          ? `+${selectedCar.powerProduction}W`
                          : `-${selectedCar.powerConsumption}W`}
                      </span>
                    </div>
                  </div>

                  {/* Installed Upgrades List */}
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1.5">
                      {t.installedModules}
                    </span>
                    {selectedCar.installedUpgrades.length === 0 ? (
                      <span className="text-zinc-600 text-xs italic">{t.noModifications}</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedCar.installedUpgrades.map((u, i) => (
                          <div key={i} className="text-xs text-amber-400 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{u}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Available Upgrades */}
              <div className="flex-1 p-6 overflow-y-auto bg-zinc-900/20 space-y-4">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                  {t.availableUpgrades}
                </span>

                <div className="space-y-3">
                  {engine.availableUpgrades.map((upg) => {
                    const isInstalled = selectedCar.installedUpgrades.includes(upg.name);
                    const canAfford = upg.cost.every((cost) => {
                      const has = engine.inventory.find((i) => i.id === cost.itemId);
                      return has && has.quantity >= cost.quantity;
                    });

                    return (
                      <div
                        key={upg.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-md"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100">{upg.name}</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">{upg.description}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold">
                            {upg.slotType}
                          </span>
                        </div>

                        {/* Trade-off summary */}
                        <div className="flex gap-4 text-[11px] text-zinc-400 py-1 border-y border-zinc-900">
                          <span>Weight: <strong className="text-zinc-200">+{upg.weightDelta}t</strong></span>
                          <span>Power: <strong className="text-cyan-400">{upg.powerDelta > 0 ? `+${upg.powerDelta}W` : `${upg.powerDelta}W`}</strong></span>
                          {upg.armorDelta && <span>Armor: <strong className="text-emerald-400">+{upg.armorDelta}%</strong></span>}
                          {upg.damageDelta && <span>Damage: <strong className="text-red-400">+{upg.damageDelta}</strong></span>}
                        </div>

                        {/* Cost & Action */}
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex gap-3 text-xs">
                            {upg.cost.map((c, i) => {
                              const has = engine.inventory.find((it) => it.id === c.itemId);
                              const currentQty = has ? has.quantity : 0;
                              const satisfied = currentQty >= c.quantity;
                              return (
                                <span
                                  key={i}
                                  className={satisfied ? 'text-zinc-300' : 'text-red-400 font-semibold'}
                                >
                                  {c.name}: {currentQty}/{c.quantity}
                                </span>
                              );
                            })}
                          </div>

                          <button
                            disabled={isInstalled || !canAfford}
                            onClick={() => {
                              engine.applyUpgrade(upg.id);
                              setRefresh((r) => r + 1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isInstalled
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : canAfford
                                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {isInstalled ? t.installed : canAfford ? t.installUpgrade : t.insufficientScrap}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* CRAFTING TAB */
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                {t.standardRecipes}
              </span>

              <div className="grid grid-cols-2 gap-4">
                {engine.availableRecipes.map((r) => {
                  const canAfford = r.inputs.every((inp) => {
                    const has = engine.inventory.find((i) => i.id === inp.itemId);
                    return has && has.quantity >= inp.quantity;
                  });

                  return (
                    <div
                      key={r.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-zinc-100">{r.name}</h4>
                          <span className="text-[10px] text-zinc-500 uppercase">{r.category}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{r.description}</p>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-1 py-2 border-t border-zinc-900 text-xs">
                        <span className="text-[10px] text-zinc-500 uppercase block">{t.requiredIngredients}</span>
                        {r.inputs.map((inp, idx) => {
                          const has = engine.inventory.find((it) => it.id === inp.itemId);
                          const qty = has ? has.quantity : 0;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span className="text-zinc-400">{inp.name}:</span>
                              <span className={qty >= inp.quantity ? 'text-zinc-200' : 'text-red-400'}>
                                {qty} / {inp.quantity}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          engine.craftRecipe(r.id);
                          setRefresh((prev) => prev + 1);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                          canAfford
                            ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? t.assembleBlueprint : t.missingComponents}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Material Quick Bar */}
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">{t.personalStock}</span>
            {engine.inventory
              .filter((i) => ['scrap', 'steel', 'chemical', 'electronics'].includes(i.id))
              .map((it) => (
                <span key={it.id} className="text-zinc-300">
                  {it.name}: <strong className="text-amber-400">{it.quantity}</strong>
                </span>
              ))}
          </div>
          <span>{t.workshopOnline}</span>
        </div>
      </div>
    </div>
  );
};
