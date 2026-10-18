import React, { useState } from 'react';
import { UNITY_CODEBASE, UnityScriptDoc } from '../data/unityCodebase';
import JSZip from 'jszip';
import { Download, Copy, Check, FileCode, FolderTree } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface UnityProjectViewerProps {
  language: Language;
}

export const UnityProjectViewer: React.FC<UnityProjectViewerProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [selectedScript, setSelectedScript] = useState<UnityScriptDoc>(UNITY_CODEBASE[0]);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = language === 'vi'
    ? ['Tất Cả', 'Đoàn Tàu', 'Chiến Đấu', 'Thực Thể', 'Trạm Dừng', 'Người Chơi']
    : ['All', 'Train', 'Combat', 'Enemies', 'Stations', 'Player'];

  const categoryMap: Record<string, string> = {
    'Tất Cả': 'All',
    'Đoàn Tàu': 'Train',
    'Chiến Đấu': 'Combat',
    'Thực Thể': 'Enemies',
    'Trạm Dừng': 'Stations',
    'Người Chơi': 'Player',
    'All': 'All',
    'Train': 'Train',
    'Combat': 'Combat',
    'Enemies': 'Enemies',
    'Stations': 'Stations',
    'Player': 'Player',
  };

  const englishCategory = categoryMap[activeCategory] || 'All';
  const filteredScripts =
    englishCategory === 'All'
      ? UNITY_CODEBASE
      : UNITY_CODEBASE.filter((s) => s.category === englishCategory);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      const zip = new JSZip();

      const readme = `# THE LAST TRACK: ETERNAL RUN
Unity 6 (URP) AI Architecture & Script Library

## Architecture Overview
- Modular, Data-Driven, Incremental design
- Engine: Unity 6 (URP)
- Systems:
  - Train Movement & Physics (TrainController, TrainMovement, TrainFuelSystem)
  - Train Power Grid (PowerGeneration, Consumption, Priority, CircuitBreaker)
  - Modular Carriages (Locomotive, Workshop, Defense, Storage)
  - Dual-mode Turret System (Autonomous Scan & Manual Player Control)
  - Enemy AI (Chaser attach & breach logic)
  - Station Countdown & Scheduled Departure (180s timer with 120s/30s horn alerts)
  - Survival Meters (Health, Stamina, Hunger, Thirst, Temp, Toxicity, Sanity)

## Installation in Unity 6
1. Extract the contents of this archive into your Unity project root folder.
2. The scripts will appear under 'Assets/Scripts/'.
3. Follow the inspector configurations detailed in each script file's documentation comments.
`;
      zip.file('README.md', readme);

      for (const script of UNITY_CODEBASE) {
        zip.file(script.filePath, script.code);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TheLastTrack_Unity6_Scripts.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate zip:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 font-mono text-zinc-100 overflow-hidden">
      {/* Top Banner */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-100 tracking-wider uppercase flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-amber-500" />
            {t.unityTitle}
          </h2>
          <span className="text-xs text-zinc-500">
            {t.unitySubtitle}
          </span>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Packaging Assets...' : t.downloadZip}
        </button>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Script Explorer */}
        <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/60">
          {/* Category Tabs */}
          <div className="p-3 border-b border-zinc-800 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Script List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filteredScripts.map((s) => {
              const active = selectedScript.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedScript(s)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                    active
                      ? 'bg-zinc-900 border-amber-500/80 text-amber-300 font-bold shadow-md'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${active ? 'text-amber-400' : 'text-zinc-600'}`} />
                  <div className="overflow-hidden">
                    <span className="block truncate font-semibold">{s.title}</span>
                    <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{s.filePath}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code & Section 62 Specification breakdown */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/10">
          {/* Script Header Bar */}
          <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <div>
              <span className="text-xs text-amber-400 font-bold block">{selectedScript.filePath}</span>
              <p className="text-xs text-zinc-400 mt-0.5">{selectedScript.goal}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t.copied : t.copyCode}
            </button>
          </div>

          {/* Code Viewer & Specs Grid */}
          <div className="flex-1 flex overflow-hidden">
            {/* C# Code box */}
            <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 font-mono text-[12px] leading-relaxed text-zinc-300 border-r border-zinc-800 selection:bg-amber-500/20">
              <pre>
                <code>{selectedScript.code}</code>
              </pre>
            </div>

            {/* Section 62 Inspector & Test Panel */}
            <div className="w-96 p-5 overflow-y-auto bg-zinc-950/80 space-y-5 text-xs">
              {/* Unity Setup */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  {t.hierarchyHeading}
                </span>
                <ul className="space-y-1.5 text-zinc-300">
                  {selectedScript.unitySetup.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">›</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Inspector Configuration */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  {t.inspectorHeading}
                </span>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  {Object.entries(selectedScript.inspectorConfig).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-400">{k}:</span>
                      <span className="font-bold text-amber-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Protocol */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  {t.testHeading}
                </span>
                <ul className="space-y-1.5 text-zinc-300">
                  {selectedScript.testSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">✓</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Acceptance Criteria */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  {t.acceptanceHeading}
                </span>
                <div className="space-y-1.5">
                  {selectedScript.acceptanceCriteria.map((crit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-emerald-400 font-bold">☑</span>
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
