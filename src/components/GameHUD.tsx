import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { InteractionTarget, WeatherType } from '../game/pixelScene';
import {
  Flame,
  Zap,
  Shield,
  Crosshair,
  AlertTriangle,
  Activity,
  CloudSnow,
  CloudRain,
  Sparkles,
  Radio,
  Eye,
  Box,
  Wrench,
  ChevronRight,
  Wind,
  Droplets,
  MapPin,
  AlertCircle,
  ShieldAlert,
  Construction,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

// Procedural Corner Frost Crystals for atmospheric Blizzard immersion
const FrostCorner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`w-64 h-64 pointer-events-none select-none text-cyan-200/50 drop-shadow-[0_0_12px_rgba(186,230,253,0.5)] ${className}`}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Primary ice dendritic spine */}
    <path
      d="M0 0 L105 105 M15 0 L115 95 M0 15 L95 115"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.85"
    />
    {/* Secondary frost needles */}
    <path
      d="M32 32 L60 20 M32 32 L20 60 M55 55 L85 40 M55 55 L40 85 M78 78 L115 58 M78 78 L58 115 M100 100 L145 74 M100 100 L74 145"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.75"
    />
    {/* Tertiary crystalline branches */}
    <path
      d="M16 6 L28 18 M6 16 L18 28 M44 14 L52 26 M14 44 L26 52 M68 28 L78 40 M28 68 L40 78 M90 44 L102 60 M44 90 L60 102"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.65"
    />
    {/* Fine micro-crystals */}
    <path
      d="M108 86 L126 78 M86 108 L78 126 M118 64 L134 54 M64 118 L54 134 M130 44 L144 34 M44 130 L34 144"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Hexagonal ice nuclei */}
    <polygon points="45,40 50,43 50,49 45,52 40,49 40,43" fill="currentColor" opacity="0.35" />
    <polygon points="78,72 85,76 85,84 78,88 71,84 71,76" fill="currentColor" opacity="0.4" />
    <polygon points="110,104 116,108 116,114 110,118 104,114 104,108" fill="currentColor" opacity="0.3" />
  </svg>
);

interface GameHUDProps {
  engine: GameEngine;
  interactTarget: InteractionTarget | null;
  isMounted: boolean;
  onDismount: () => void;
  language: Language;
  currentWeather?: WeatherType;
  onToggleWeather?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  interactTarget,
  isMounted,
  onDismount,
  language,
  currentWeather = 'blizzard',
  onToggleWeather,
}) => {
  const t = TRANSLATIONS[language];
  const p = engine.playerStats;
  const ts = engine.trainStats;
  const turret = engine.turret;
  const station = engine.currentStation;

  // Fuel level linked directly to engine.trainStats.fuel
  const fuelLevel = engine.trainStats.fuel !== undefined ? engine.trainStats.fuel : engine.trainStats.currentFuel;
  const maxFuel = engine.trainStats.maxFuel || 100;
  const fuelPercent = Math.min(100, Math.max(0, (fuelLevel / maxFuel) * 100));
  const isLowFuel = fuelPercent < 20;

  // Real-time tick for smooth radar sweep and notification fades
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  // Format countdowns (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // Tactical Circular Radar Calculations
  // ==========================================
  const radarRadius = 66; // pixels in 144x144 scope
  const radarCenter = 72; // cx, cy
  const maxRadarRangeMeters = 80;
  const trainCenterZ = -10; // Midpoint between locomotive (+7) and storage (-24.5)

  let closestThreatDist = Infinity;
  const enemies = engine.enemies || [];

  const radarEnemyBlips = enemies.map((enemy) => {
    const dx = enemy.x; // lateral displacement
    const dz = enemy.z - trainCenterZ; // longitudinal (positive = forward)
    const dist = Math.hypot(dx, dz);
    if (dist < closestThreatDist) {
      closestThreatDist = dist;
    }

    // Azimuth: 0 = Ahead (North), PI/2 = Right (East), PI = Rear (South), -PI/2 = Left (West)
    // Lateral offset is multiplied by 2.2 to give visual separation on 144px circular scope
    const angle = Math.atan2(dx * 2.2, dz);
    const normalizedRange = Math.min(1.0, dist / maxRadarRangeMeters);
    const blipDist = normalizedRange * (radarRadius - 10);
    const px = radarCenter + Math.sin(angle) * blipDist;
    const py = radarCenter - Math.cos(angle) * blipDist;

    return {
      id: enemy.id,
      x: px,
      y: py,
      dist,
      type: enemy.type,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
    };
  });

  // Upcoming Station marker on radar minimap
  let upcomingStationMarker: { x: number; y: number; distLabel: string; name: string } | null = null;
  if (station) {
    const sDx = 4.5 * 2.2;
    const sDz = 0 - trainCenterZ;
    const sAngle = Math.atan2(sDx, sDz);
    const sRange = Math.min(1.0, Math.hypot(4.5, sDz) / maxRadarRangeMeters);
    upcomingStationMarker = {
      x: radarCenter + Math.sin(sAngle) * (sRange * (radarRadius - 12)),
      y: radarCenter - Math.cos(sAngle) * (sRange * (radarRadius - 12)),
      distLabel: 'Docked',
      name: station.name,
    };
  } else {
    // Upcoming station along the track corridor
    const kmDist = ts.nextStationDistance;
    const normDist = Math.max(0.18, Math.min(0.92, kmDist / 2.5));
    upcomingStationMarker = {
      x: radarCenter,
      y: radarCenter - normDist * (radarRadius - 12),
      distLabel: `${kmDist.toFixed(1)}km`,
      name: t.nextStation,
    };
  }

  // ==========================================
  // Track Condition & Hazardous Terrain System
  // ==========================================
  const trackHazard = engine.currentTrackHazard;
  const isExcessHazardSpeed = trackHazard ? ts.currentSpeed > trackHazard.maxSafeSpeed : false;

  let trackHazardBlip: { x: number; y: number; dist: number } | null = null;
  if (trackHazard && trackHazard.distanceMeters <= maxRadarRangeMeters * 3.5) {
    const normDist = Math.min(1.0, Math.max(0.12, trackHazard.distanceMeters / (maxRadarRangeMeters * 3.0)));
    trackHazardBlip = {
      x: radarCenter,
      y: radarCenter - normDist * (radarRadius - 10),
      dist: trackHazard.distanceMeters,
    };
  }

  // ==========================================
  // Visual Effect System: Player Status Conditions
  // ==========================================
  const isFreezing = p.bodyTemperature < 35.5;
  const isLowOxygen = (p.oxygen !== undefined && p.oxygen < 35) || p.toxicity > 45;
  const isTurretOverheated = turret.isOverheated || turret.heat >= 85;
  const isCriticalHp = p.health < 25;
  const isStarving = p.hunger < 25;
  const isDehydrated = p.thirst < 25;

  // ==========================================
  // Weather Cycle & Timeline Setup
  // ==========================================
  const activeTimeline = engine.weatherTimeline || [
    { weather: currentWeather, startsInSeconds: 0, durationSeconds: 75 },
    { weather: 'rain', startsInSeconds: 75, durationSeconds: 60 },
    { weather: 'clear', startsInSeconds: 135, durationSeconds: 85 },
    { weather: 'blizzard', startsInSeconds: 220, durationSeconds: 90 },
  ];

  const currentDuration = activeTimeline[0]?.durationSeconds || 75;
  const timeRemaining = Math.max(0, engine.weatherTimeRemaining);
  const cycleProgress = Math.min(100, Math.max(0, (1 - timeRemaining / Math.max(1, currentDuration)) * 100));

  const getWeatherIcon = (w: WeatherType, sizeClass = 'w-3.5 h-3.5') => {
    switch (w) {
      case 'blizzard':
        return <CloudSnow className={`${sizeClass} text-cyan-300 animate-pulse`} />;
      case 'rain':
        return <CloudRain className={`${sizeClass} text-blue-300`} />;
      case 'clear':
        return <Sparkles className={`${sizeClass} text-amber-300`} />;
    }
  };

  const getWeatherName = (w: WeatherType) => {
    switch (w) {
      case 'blizzard':
        return t.weatherBlizzard;
      case 'rain':
        return t.weatherRain;
      case 'clear':
        return t.weatherClear;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 select-none font-mono">
      {/* Atmospheric Weather-Specific Full-Screen Overlays (Frost Crystals in Blizzard, Rain Streaks in Rain) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* BLIZZARD: Corner Frost Crystals, Icy Edge Vignette & Breathing Frost Effect */}
        {currentWeather === 'blizzard' && (
          <div className="absolute inset-0 transition-opacity duration-1000 animate-frost-breath">
            {/* 4 Corner Procedural Dendritic Frost Crystals */}
            <div className="absolute top-0 left-0">
              <FrostCorner />
            </div>
            <div className="absolute top-0 right-0 rotate-90 origin-top-right">
              <FrostCorner />
            </div>
            <div className="absolute bottom-0 right-0 rotate-180 origin-bottom-right">
              <FrostCorner />
            </div>
            <div className="absolute bottom-0 left-0 -rotate-90 origin-bottom-left">
              <FrostCorner />
            </div>

            {/* Cold Glacial Rim Vignette with icy glow */}
            <div className="absolute inset-0 shadow-[inset_0_0_130px_rgba(186,230,253,0.3)] ring-1 ring-cyan-300/35" />

            {/* Subtle permafrost gradient haze top & bottom */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-100/15 via-cyan-300/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cyan-100/15 via-cyan-300/5 to-transparent" />
          </div>
        )}

        {/* RAIN: Animated Rain Streaks, Condensation Droplets & Wet Shimmer */}
        {currentWeather === 'rain' && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            {/* Wet Dark Blue Ambient Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_110px_rgba(30,58,138,0.32)] ring-1 ring-blue-400/25" />

            {/* Fast Falling Diagonal Rain Streaks across screen */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-[7%] -top-16 w-[1.5px] h-28 bg-gradient-to-b from-transparent via-cyan-200/60 to-transparent animate-rain-streak-1" />
              <div className="absolute left-[19%] -top-20 w-[1.5px] h-36 bg-gradient-to-b from-transparent via-blue-200/55 to-transparent animate-rain-streak-2" />
              <div className="absolute left-[31%] -top-12 w-[1.5px] h-24 bg-gradient-to-b from-transparent via-cyan-200/65 to-transparent animate-rain-streak-3" />
              <div className="absolute left-[44%] -top-18 w-[1.5px] h-32 bg-gradient-to-b from-transparent via-blue-200/50 to-transparent animate-rain-streak-4" />
              <div className="absolute left-[58%] -top-14 w-[1.5px] h-30 bg-gradient-to-b from-transparent via-cyan-200/60 to-transparent animate-rain-streak-1" />
              <div className="absolute left-[71%] -top-20 w-[1.5px] h-36 bg-gradient-to-b from-transparent via-blue-200/55 to-transparent animate-rain-streak-2" />
              <div className="absolute left-[83%] -top-16 w-[1.5px] h-28 bg-gradient-to-b from-transparent via-cyan-200/65 to-transparent animate-rain-streak-3" />
              <div className="absolute left-[94%] -top-12 w-[1.5px] h-32 bg-gradient-to-b from-transparent via-blue-200/50 to-transparent animate-rain-streak-4" />
            </div>

            {/* Condensation Droplets Dripping Down Glass */}
            <div className="absolute left-[13%] top-20 w-1 h-3 rounded-full bg-cyan-200/40 shadow-[0_0_4px_rgba(186,230,253,0.5)] animate-water-drip-1" />
            <div className="absolute left-[38%] top-28 w-1.5 h-3.5 rounded-full bg-blue-200/40 shadow-[0_0_4px_rgba(191,219,254,0.5)] animate-water-drip-2" />
            <div className="absolute left-[64%] top-16 w-1 h-2.5 rounded-full bg-cyan-200/40 shadow-[0_0_4px_rgba(186,230,253,0.5)] animate-water-drip-3" />
            <div className="absolute left-[85%] top-24 w-1.5 h-4 rounded-full bg-blue-200/45 shadow-[0_0_4px_rgba(191,219,254,0.5)] animate-water-drip-1" />

            {/* Wet rain mist at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-900/15 via-blue-950/5 to-transparent" />
          </div>
        )}

        {/* CLEAR: Crisp Aurora Sky Shimmer & High Contrast Vignette */}
        {currentWeather === 'clear' && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <div className="absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.38)]" />
            {/* Serene Polar Aurora Shimmer at screen top */}
            <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent opacity-60" />
          </div>
        )}

        {/* Visual Effect System: Full-screen Status Immersion Overlays */}
        {isFreezing && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(56,189,248,0.45)] ring-2 ring-cyan-400/50 animate-pulse z-0" />
        )}
        {isLowOxygen && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_130px_rgba(13,148,136,0.45)] ring-2 ring-teal-500/40 animate-pulse z-0" />
        )}
        {isTurretOverheated && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(239,68,68,0.35)] ring-1 ring-orange-500/40 animate-pulse z-0" />
        )}
        {isCriticalHp && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_160px_rgba(220,38,38,0.55)] animate-pulse z-0" />
        )}
      </div>

      {/* TOP LAYER */}
      <div className="relative z-10 flex justify-between items-start gap-4">
        {/* Left Column: Survival Diagnostics (Section 56 layout) */}
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/90 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 w-72 shrink-0">
          <div className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              {t.survivalDiagnostics}
            </span>
            {engine.godMode && (
              <span className="text-amber-400 font-bold tracking-widest text-[9px] animate-pulse">
                {t.godModeActive}
              </span>
            )}
          </div>

          {/* HP */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 w-16 text-[11px] font-semibold">{t.hp}</span>
            <div className="flex-1 mx-2 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${p.health}%` }}
              />
            </div>
            <span className="text-zinc-200 w-8 text-right font-bold tabular-nums">{Math.round(p.health)}</span>
          </div>

          {/* Stamina */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 w-16 text-[11px] font-semibold">{t.stamina}</span>
            <div className="flex-1 mx-2 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                style={{ width: `${p.stamina}%` }}
              />
            </div>
            <span className="text-zinc-200 w-8 text-right tabular-nums">{Math.round(p.stamina)}</span>
          </div>

          {/* Hunger */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 w-16 text-[11px] font-semibold">{t.hunger}</span>
            <div className="flex-1 mx-2 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  p.hunger < 25 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'
                }`}
                style={{ width: `${p.hunger}%` }}
              />
            </div>
            <span className="text-zinc-200 w-8 text-right tabular-nums">{Math.round(p.hunger)}</span>
          </div>

          {/* Thirst */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 w-16 text-[11px] font-semibold">{t.thirst}</span>
            <div className="flex-1 mx-2 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  p.thirst < 25 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500'
                }`}
                style={{ width: `${p.thirst}%` }}
              />
            </div>
            <span className="text-zinc-200 w-8 text-right tabular-nums">{Math.round(p.thirst)}</span>
          </div>

          {/* Oxygen */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 w-16 text-[11px] font-semibold">{t.oxygen}</span>
            <div className="flex-1 mx-2 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (p.oxygen ?? 100) < 30
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
                    : 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]'
                }`}
                style={{ width: `${p.oxygen ?? 100}%` }}
              />
            </div>
            <span className="text-zinc-200 w-8 text-right tabular-nums">{Math.round(p.oxygen ?? 100)}%</span>
          </div>

          {/* Temp, Toxicity, Sanity */}
          <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-[11px] text-zinc-300 text-center">
            <div>
              <span className="block text-[9px] text-zinc-500">{t.temp}</span>
              <span
                className={`font-bold tabular-nums ${
                  p.bodyTemperature < 35.0 ? 'text-cyan-400 animate-pulse' : 'text-amber-300'
                }`}
              >
                {p.bodyTemperature.toFixed(1)}°C
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-zinc-500">{t.toxic}</span>
              <span className="font-bold text-emerald-400 tabular-nums">{Math.round(p.toxicity)}%</span>
            </div>
            <div>
              <span className="block text-[9px] text-zinc-500">{t.sanity}</span>
              <span className="font-bold text-purple-400 tabular-nums">{Math.round(p.sanity)}%</span>
            </div>
          </div>
        </div>

        {/* Center: Weather Cycle Visual Timeline & Active Environmental Debuffs */}
        <div className="flex flex-col items-center gap-2 max-w-xl flex-1">
          {/* Station Departure Countdown Banner if at Outpost Depot */}
          {station && (
            <div className="bg-red-950/90 backdrop-blur-md border-2 border-red-600/90 px-8 py-2 rounded-2xl shadow-[0_0_35px_rgba(239,68,68,0.5)] text-center animate-pulse w-full">
              <div className="text-[10px] tracking-widest text-red-300 font-extrabold uppercase">
                {t.stationCountdown}
              </div>
              <div className="text-3xl font-extrabold text-red-100 tracking-wider tabular-nums">
                {formatTime(station.remainingTime)}
              </div>
              <div className="text-[10px] text-red-200 mt-0.5">
                {t.stationWarning}
              </div>
            </div>
          )}

          {/* Dynamic Weather Timeline Widget */}
          <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 p-3 rounded-2xl shadow-2xl w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  {t.weatherTimeline}
                </span>
                <span className="text-[9px] text-zinc-400 font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {t.nextShiftIn}: <span className="text-zinc-200 font-bold tabular-nums">{formatTime(timeRemaining)}</span>
                </span>
              </div>

              <button
                onClick={onToggleWeather}
                className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/70 rounded text-[9px] transition-colors cursor-pointer"
                title={t.weatherToggleHint}
              >
                <span>[T]</span>
                <span className="font-semibold">{t.weather}</span>
              </button>
            </div>

            {/* Visual Sequence of Upcoming Weather Cycles */}
            <div className="grid grid-cols-4 gap-2 items-center">
              {activeTimeline.slice(0, 4).map((seg, idx) => {
                const isCurrent = idx === 0;
                return (
                  <div
                    key={idx}
                    className={`relative p-2 rounded-xl border transition-all ${
                      isCurrent
                        ? seg.weather === 'blizzard'
                          ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : seg.weather === 'rain'
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                          : 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-900/60 border-zinc-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getWeatherIcon(seg.weather, 'w-3 h-3')}
                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-zinc-100' : 'text-zinc-400'}`}>
                          {getWeatherName(seg.weather)}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>

                    <div className="text-[9px] text-zinc-400 mt-1 flex justify-between tabular-nums">
                      <span>{isCurrent ? `${Math.round(timeRemaining)}s` : `+${Math.round(seg.startsInSeconds)}s`}</span>
                      <span className="text-zinc-500">{Math.round(seg.durationSeconds)}s</span>
                    </div>

                    {/* Progress bar inside active node */}
                    {isCurrent && (
                      <div className="w-full bg-zinc-900 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            seg.weather === 'blizzard'
                              ? 'bg-cyan-400'
                              : seg.weather === 'rain'
                              ? 'bg-blue-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${cycleProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Gameplay Environmental Modifiers & Debuffs Bar */}
            <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1.5 items-center">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mr-1">
                {t.activeDebuffs}:
              </span>

              {currentWeather === 'blizzard' && (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/80 text-red-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Flame className="w-2.5 h-2.5 text-amber-400" />
                    {t.fuelDebuffBlizzard}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <CloudSnow className="w-2.5 h-2.5 text-cyan-400" />
                    {t.tractionDebuffBlizzard}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/80 text-purple-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Eye className="w-2.5 h-2.5 text-purple-400" />
                    {t.hypothermiaDebuffBlizzard}
                  </span>
                </>
              )}

              {currentWeather === 'rain' && (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Flame className="w-2.5 h-2.5 text-amber-400" />
                    {t.fuelDebuffRain}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-700/80 text-blue-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Droplets className="w-2.5 h-2.5 text-blue-400" />
                    {t.brakeDebuffRain}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-700/80 text-sky-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Droplets className="w-2.5 h-2.5 text-sky-400" />
                    {t.thirstDebuffRain}
                  </span>
                </>
              )}

              {currentWeather === 'clear' && (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    {t.optimalBuffClear}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                    <Activity className="w-2.5 h-2.5 text-emerald-400" />
                    {t.tempRecoveryBuffClear}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Visual Effect System: Active Player Status Badges (Freezing, Low Oxygen, Turret Overheated, etc.) */}
          {(isFreezing || isLowOxygen || isTurretOverheated || isCriticalHp || isStarving || isDehydrated) && (
            <div className="flex flex-wrap items-center justify-center gap-2 w-full mt-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Freezing Status Badge */}
              {isFreezing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/95 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] text-cyan-200 text-xs font-bold animate-pulse backdrop-blur-md">
                  <div className="p-1 rounded-lg bg-cyan-500/25 text-cyan-300">
                    <CloudSnow className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block font-black text-cyan-300">
                      {t.statusFreezing}
                    </span>
                    <span className="text-[9px] text-cyan-100 tabular-nums">
                      {p.bodyTemperature.toFixed(1)}°C · Hypothermia Danger
                    </span>
                  </div>
                </div>
              )}

              {/* Low Oxygen Status Badge */}
              {isLowOxygen && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-950/95 border-2 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.6)] text-teal-200 text-xs font-bold animate-pulse backdrop-blur-md">
                  <div className="p-1 rounded-lg bg-teal-500/25 text-teal-300">
                    <Wind className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block font-black text-teal-300">
                      {t.statusLowOxygen}
                    </span>
                    <span className="text-[9px] text-teal-100 tabular-nums">
                      {Math.round(p.oxygen ?? 100)}% O₂ · Asphyxiation Alert
                    </span>
                  </div>
                </div>
              )}

              {/* Turret Overheated Status Badge */}
              {isTurretOverheated && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/95 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)] text-red-200 text-xs font-bold animate-pulse backdrop-blur-md">
                  <div className="p-1 rounded-lg bg-red-500/30 text-amber-300">
                    <Flame className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block font-black text-red-300">
                      {t.statusTurretOverheated}
                    </span>
                    <span className="text-[9px] text-red-100 tabular-nums">
                      {Math.round(turret.heat)}% Heat · Autocannon Jammed
                    </span>
                  </div>
                </div>
              )}

              {/* Critical HP Status Badge */}
              {isCriticalHp && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/95 border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] text-rose-200 text-xs font-bold animate-pulse backdrop-blur-md">
                  <div className="p-1 rounded-lg bg-rose-500/25 text-rose-400">
                    <Activity className="w-4 h-4 animate-ping" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block font-black text-rose-300">
                      {t.statusCriticalHp}
                    </span>
                    <span className="text-[9px] text-rose-100 tabular-nums">
                      {Math.round(p.health)} / {p.maxHealth} HP
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Tactical Radar, Track Condition Warning System & Train Metrics */}
        <div className="flex flex-col gap-3 shrink-0 items-end">
          {/* Tactical Radar & Track Condition Warning Container */}
          <div className="flex items-start gap-2.5">
            {/* Track Condition Warning Card / Icon System */}
            {trackHazard ? (
              <div
                className={`p-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 w-56 pointer-events-auto ${
                  isExcessHazardSpeed
                    ? 'bg-red-950/90 border-red-500 shadow-[0_0_28px_rgba(239,68,68,0.7)] ring-2 ring-red-500/80 animate-pulse'
                    : 'bg-amber-950/85 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                }`}
              >
                {/* Header with Warning Icon */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isExcessHazardSpeed
                        ? 'bg-red-500 text-zinc-950 animate-bounce'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black tracking-wider text-red-400 uppercase block truncate">
                      {t.trackHazardWarning}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-100 block truncate">
                      {trackHazard.name}
                    </span>
                  </div>
                </div>

                {/* Distance to hazard bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-300">
                    <span className="text-zinc-400">{language === 'vi' ? 'Khoảng Cách:' : 'Distance:'}</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">
                      {Math.max(0, Math.round(trackHazard.distanceMeters))}m
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        isExcessHazardSpeed ? 'bg-red-500' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (1 - trackHazard.distanceMeters / trackHazard.totalDistanceMeters) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Speed Adjustment Requirement */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-zinc-400">{t.reduceSpeedPrompt}</span>
                    <span className="font-black text-amber-400 tabular-nums">
                      {trackHazard.maxSafeSpeed} km/h
                    </span>
                  </div>

                  {isExcessHazardSpeed ? (
                    <div className="p-1.5 rounded bg-red-900/60 border border-red-500/80 text-[9px] font-extrabold text-red-200 flex items-center gap-1.5 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{t.excessSpeedWarning}</span>
                    </div>
                  ) : (
                    <div className="p-1.5 rounded bg-emerald-950/70 border border-emerald-500/60 text-[9px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{t.safeSpeedAchieved}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Nominal Track Condition Status Badge beside Radar */
              <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-[9px] text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold">{t.trackNominal}</span>
              </div>
            )}

            {/* Radar-Style Minimap with Colored Markers for Train, Enemies, and Stations */}
            <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 p-3 rounded-2xl shadow-2xl w-80 flex flex-col items-center">
              {/* Header with Title and Hazard Alert */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-wider text-zinc-300 font-extrabold uppercase flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  {t.minimapTitle}
                </span>

                {trackHazard ? (
                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isExcessHazardSpeed
                        ? 'bg-red-950 border border-red-500 text-red-300 animate-bounce'
                        : 'bg-amber-950 border border-amber-500 text-amber-300 animate-pulse'
                    }`}
                    title={trackHazard.name}
                  >
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>&lt;{trackHazard.maxSafeSpeed} km/h</span>
                  </span>
                ) : (
                  <span className="text-[9px] text-zinc-400 font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    {t.radarRange}
                  </span>
                )}
              </div>

              {/* Radar Scope Display */}
              <div className="relative w-40 h-40 rounded-full border-2 border-emerald-500/40 bg-zinc-950/95 overflow-hidden shadow-[inset_0_0_24px_rgba(16,185,129,0.22)]">
                {/* Sweeping Radar Scanner Line */}
                <div className="absolute inset-0 rounded-full pointer-events-none animate-[spin_3.5s_linear_infinite] origin-center bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(16,185,129,0.38)_360deg)]" />

                {/* Longitudinal Railway Tracks Corridor on Minimap */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 pointer-events-none flex flex-col justify-between items-center opacity-35">
                  <div className="absolute top-0 bottom-0 left-0 w-px bg-emerald-400" />
                  <div className="absolute top-0 bottom-0 right-0 w-px bg-emerald-400" />
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="w-full h-px bg-emerald-600/70 my-auto" />
                  ))}
                </div>

                {/* Concentric Range Rings (20m, 40m, 60m) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-emerald-500/25 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-emerald-500/25 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-30 h-30 rounded-full border border-emerald-500/25 pointer-events-none" />

                {/* Crosshair Grid Lines */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-emerald-500/25 pointer-events-none" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-emerald-500/25 pointer-events-none" />

                {/* Cardinal Indicators */}
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-400 pointer-events-none">
                  ▲ N
                </span>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-600 pointer-events-none">
                  ▼ S
                </span>
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-emerald-600 pointer-events-none">
                  W
                </span>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-emerald-600 pointer-events-none">
                  E
                </span>

                {/* Center Train Marker - Emerald Colored Marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20">
                  {/* Locomotive Headlight Light Beam Cone */}
                  <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-emerald-300/35 -mb-1 filter blur-[0.5px]" />
                  {/* Locomotive Cab */}
                  <div className="w-2.5 h-3 bg-emerald-400 rounded-t-sm shadow-[0_0_8px_rgba(16,185,129,1)] border border-emerald-200" />
                  <div className="w-0.5 h-0.5 bg-emerald-600" />
                  {/* Workshop Car */}
                  <div className="w-2 h-2.5 bg-emerald-500 rounded-xs shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                  <div className="w-0.5 h-0.5 bg-emerald-600" />
                  {/* Defense Car */}
                  <div className="w-2 h-2.5 bg-emerald-600 rounded-xs" />
                  <div className="w-0.5 h-0.5 bg-emerald-700" />
                  {/* Storage Car */}
                  <div className="w-2 h-2.5 bg-emerald-700 rounded-b-xs" />
                </div>

                {/* Upcoming Station Marker - Gold/Amber Colored Marker */}
                {upcomingStationMarker && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                    style={{ left: `${upcomingStationMarker.x}px`, top: `${upcomingStationMarker.y}px` }}
                    title={`${upcomingStationMarker.name} (${upcomingStationMarker.distLabel})`}
                  >
                    <div className="absolute -inset-1 rounded-sm rotate-45 border border-amber-400/80 animate-ping" />
                    <div className="w-3.5 h-3.5 bg-amber-400 rotate-45 shadow-[0_0_12px_rgba(251,191,36,1)] border border-amber-200 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-amber-300 bg-amber-950/90 border border-amber-600/80 px-1 rounded shadow-md whitespace-nowrap">
                      {upcomingStationMarker.distLabel}
                    </span>
                  </div>
                )}

                {/* Track Hazard Blip Ahead on Radar if in range */}
                {trackHazardBlip && (
                  <div
                    className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 z-25"
                    style={{ left: `${trackHazardBlip.x}px`, top: `${trackHazardBlip.y}px` }}
                    title={trackHazard?.name}
                  >
                    <div className="absolute inset-0 rounded-sm rotate-45 border border-amber-400 animate-ping" />
                    <div className="w-2.5 h-2.5 mx-auto my-0.5 bg-amber-400 rotate-45 shadow-[0_0_8px_rgba(245,158,11,1)]" />
                  </div>
                )}

                {/* Incoming Hostile Entity Blips - Crimson Red Colored Markers */}
                {radarEnemyBlips.map((blip) => (
                  <div
                    key={blip.id}
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 z-25 group"
                    style={{ left: `${blip.x}px`, top: `${blip.y}px` }}
                    title={`${blip.type}: ${Math.round(blip.dist)}m`}
                  >
                    <div className="absolute inset-0 rounded-full border border-red-500/80 animate-ping" />
                    <div className="w-2.5 h-2.5 mx-auto my-0.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] border border-red-300" />
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[7px] text-red-300 font-black tabular-nums bg-zinc-950/80 px-0.5 rounded border border-red-900/60 whitespace-nowrap">
                      {Math.round(blip.dist)}m
                    </span>
                  </div>
                ))}
              </div>

              {/* Radar Minimap Colored Markers Legend */}
              <div className="grid grid-cols-3 gap-1.5 w-full text-[9px] pt-2 mt-2 border-t border-zinc-800 text-center font-bold">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 bg-emerald-950/50 py-1 px-1.5 rounded-lg border border-emerald-800/60 shadow-sm">
                  <span className="w-2 h-2 rounded-sm bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                  <span className="truncate">{t.markerTrain}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-red-400 bg-red-950/50 py-1 px-1.5 rounded-lg border border-red-800/60 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse" />
                  <span className="truncate">{t.markerEnemies} ({enemies.length})</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-amber-300 bg-amber-950/50 py-1 px-1.5 rounded-lg border border-amber-800/60 shadow-sm">
                  <span className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
                  <span className="truncate">{station ? 'Docked' : `${ts.nextStationDistance.toFixed(1)}km`}</span>
                </div>
              </div>

              {/* Radar Threat Status Banner */}
              <div className="w-full mt-2 pt-1.5 border-t border-zinc-800 text-center">
                {enemies.length > 0 ? (
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-extrabold text-red-400 tracking-wider animate-pulse flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span>
                        {t.hostilesDetected}: {enemies.length}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-400">
                      {t.closestThreat}: <span className="text-red-300 font-bold tabular-nums">{Math.round(closestThreatDist)}m</span>
                    </div>
                    {closestThreatDist < 16 && (
                      <div className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-bounce">
                        {t.proximityWarning}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold text-emerald-400 tracking-wide">
                    {t.noHostiles}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Train Metrics HUD with Dedicated Vertical Fuel Bar Indicator */}
          <div className="flex gap-2 items-stretch w-80">
            {/* Dedicated Vertical Bar Indicator for Current Fuel Levels (linked directly to engine.trainStats.fuel) */}
            <div
              className={`relative p-2 rounded-xl border flex flex-col items-center justify-between transition-all duration-500 w-16 shrink-0 select-none ${
                isLowFuel
                  ? 'bg-red-950/90 border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.85)] ring-2 ring-red-500/80 animate-pulse'
                  : 'bg-zinc-950/85 border-zinc-800/90 shadow-2xl'
              }`}
            >
              {/* Indicator Header */}
              <div className="flex flex-col items-center">
                <Flame
                  className={`w-3.5 h-3.5 transition-colors ${
                    isLowFuel ? 'text-red-400 animate-bounce' : 'text-amber-400'
                  }`}
                />
                <span className="text-[8px] font-extrabold tracking-wider text-zinc-300 uppercase mt-0.5">
                  {t.fuel}
                </span>
              </div>

              {/* Vertical Glass Tube Container with Calibration Marks */}
              <div className="relative flex items-center justify-center my-1 flex-1 w-full">
                {/* Left Scale Percentage Ticks */}
                <div className="absolute left-0.5 top-0 bottom-0 flex flex-col justify-between text-[7px] font-bold text-zinc-500 pointer-events-none select-none">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span className="text-red-400 font-black">20</span>
                  <span>0</span>
                </div>

                {/* Central Glass Bar Column */}
                <div
                  className={`relative w-3.5 h-28 rounded-full overflow-hidden flex flex-col justify-end transition-all duration-300 border ${
                    isLowFuel
                      ? 'bg-red-950/60 border-red-500 shadow-[inset_0_0_8px_rgba(239,68,68,0.6)]'
                      : 'bg-zinc-900 border-zinc-700/80 shadow-inner'
                  }`}
                >
                  {/* 20% Critical Warning Threshold Marker */}
                  <div className="absolute bottom-[20%] left-0 right-0 h-0.5 bg-red-400/90 z-20 pointer-events-none shadow-[0_0_4px_rgba(239,68,68,0.9)]" />

                  {/* Liquid Fuel Fill inside the vertical bar */}
                  <div
                    className={`w-full transition-all duration-300 rounded-b-full ${
                      isLowFuel
                        ? 'bg-gradient-to-t from-red-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse'
                        : fuelPercent < 45
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                        : 'bg-gradient-to-t from-emerald-500 via-amber-500 to-amber-300 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    }`}
                    style={{ height: `${fuelPercent}%` }}
                  >
                    {/* Glowing surface meniscus */}
                    <div
                      className={`w-full h-1 rounded-full ${
                        isLowFuel ? 'bg-red-100 shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'bg-white/80'
                      }`}
                    />
                  </div>
                </div>

                {/* Right Scale Notch Indicators */}
                <div className="absolute right-0.5 top-0 bottom-0 flex flex-col justify-between text-[7px] text-zinc-600 pointer-events-none">
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span className="text-red-500 font-bold">-</span>
                  <span>-</span>
                </div>
              </div>

              {/* Numeric Percentage & Warning Badge */}
              <div className="text-center w-full">
                <span
                  className={`text-[11px] font-black tabular-nums block ${
                    isLowFuel ? 'text-red-400 animate-pulse' : 'text-zinc-100'
                  }`}
                >
                  {Math.round(fuelPercent)}%
                </span>
                <span className="text-[8px] text-zinc-400 tabular-nums block">
                  {Math.round(fuelLevel)}L
                </span>
                {isLowFuel && (
                  <span className="text-[7px] font-black text-red-400 uppercase tracking-tighter block mt-0.5 animate-bounce">
                    {language === 'vi' ? 'SẮP HẾT' : 'LOW'}
                  </span>
                )}
              </div>
            </div>

            {/* Train Metrics HUD Card */}
            <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/90 p-3 rounded-xl shadow-2xl text-xs space-y-2 flex-1">
              <div className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase mb-1 flex items-center justify-between">
                <span className="text-zinc-300">{t.locomotiveStatus}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    ts.state === 'Moving'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {ts.state}
                </span>
              </div>

              {/* Speed */}
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-400 text-[11px]">{t.speed}:</span>
                <span className="text-lg font-extrabold text-amber-400 tracking-tight tabular-nums">
                  {Math.round(ts.currentSpeed)} <span className="text-[10px] text-zinc-500 font-normal">km/h</span>
                </span>
              </div>

              {/* Horizontal Fuel bar with warning badge if < 20% */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Flame className={`w-3 h-3 ${isLowFuel ? 'text-red-500 animate-bounce' : 'text-amber-500'}`} />
                    {t.fuel}:
                  </span>
                  <span className={`font-bold tabular-nums ${isLowFuel ? 'text-red-400 animate-pulse' : 'text-zinc-200'}`}>
                    {Math.round(fuelLevel)} / {Math.round(maxFuel)} L
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isLowFuel ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-amber-500'
                    }`}
                    style={{ width: `${fuelPercent}%` }}
                  />
                </div>
                {isLowFuel && (
                  <span className="text-[9px] text-red-400 block mt-1 font-bold animate-pulse text-center">
                    {t.lowFuelWarning}
                  </span>
                )}
              </div>

              {/* Power Grid */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> {t.powerGrid}:
                  </span>
                  <span className="font-bold text-cyan-300 tabular-nums">
                    {ts.powerConsumption} / {ts.powerGeneration} W
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      ts.circuitBreakerTripped ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (ts.powerConsumption / Math.max(1, ts.powerGeneration)) * 100
                      )}%`,
                    }}
                  />
                </div>
                {ts.circuitBreakerTripped && (
                  <span className="text-[10px] text-red-400 block mt-1 font-bold animate-pulse">
                    {t.circuitBreaker}
                  </span>
                )}
              </div>

              <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 flex justify-between">
                <span>{t.trainWeight}:</span>
                <span className="font-bold text-zinc-300 tabular-nums">{ts.totalWeight.toFixed(1)} t</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER RETICLE / INTERACTION PROMPT */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {isMounted ? (
          /* Turret Crosshair & Overheat HUD */
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-amber-400/80 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <div className="absolute top-0 w-0.5 h-3.5 bg-amber-400" />
              <div className="absolute bottom-0 w-0.5 h-3.5 bg-amber-400" />
              <div className="absolute left-0 w-3.5 h-0.5 bg-amber-400" />
              <div className="absolute right-0 w-3.5 h-0.5 bg-amber-400" />
            </div>

            {/* Overheat Bar & Ammo */}
            <div className="bg-zinc-950/90 border border-zinc-700/80 px-6 py-3.5 rounded-xl text-center space-y-2.5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between text-xs gap-4">
                <span className="text-zinc-400">{t.barrelHeat}</span>
                <span className={`font-bold ${turret.isOverheated ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                  {Math.round(turret.heat)}% {turret.isOverheated && `(${t.overheated})`}
                </span>
              </div>
              <div className="w-52 bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    turret.isOverheated ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'bg-amber-500'
                  }`}
                  style={{ width: `${turret.heat}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800">
                <span className="text-zinc-400">{t.ammo}</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {turret.currentAmmo} / {turret.maxAmmo}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 pt-0.5">{t.fireHint}</div>
            </div>
          </div>
        ) : (
          /* Normal First Person Crosshair */
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)]" />

            {interactTarget && (
              <div className="mt-6 bg-zinc-950/95 backdrop-blur-md border border-amber-500/80 text-amber-300 px-4 py-2 rounded-xl text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                <span className="bg-amber-500 text-zinc-950 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                  [E]
                </span>
                <span className="font-semibold">{interactTarget.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REAL-TIME NOTIFICATION FEED (Loot from stations, actions, weather shifts) */}
      <div className="absolute left-6 bottom-24 z-30 w-84 space-y-2 pointer-events-none">
        {engine.notifications &&
          engine.notifications.map((notif) => {
            const ageSeconds = (now - notif.timestamp) / 1000;
            const opacity = ageSeconds > 4.0 ? Math.max(0, 1 - (ageSeconds - 4.0) / 1.5) : 1;

            const getTypeStyle = () => {
              switch (notif.type) {
                case 'loot':
                  return {
                    border: 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
                    iconBg: 'bg-emerald-500/20 text-emerald-300',
                    badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
                    Icon: Box,
                  };
                case 'station':
                  return {
                    border: 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
                    iconBg: 'bg-amber-500/20 text-amber-300',
                    badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-800',
                    Icon: MapPin,
                  };
                case 'weather':
                  return {
                    border: 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
                    iconBg: 'bg-cyan-500/20 text-cyan-300',
                    badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-800',
                    Icon: Wind,
                  };
                case 'craft':
                  return {
                    border: 'border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
                    iconBg: 'bg-blue-500/20 text-blue-300',
                    badgeBg: 'bg-blue-950/90 text-blue-300 border-blue-800',
                    Icon: Wrench,
                  };
                default:
                  return {
                    border: 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
                    iconBg: 'bg-red-500/20 text-red-300',
                    badgeBg: 'bg-red-950/90 text-red-300 border-red-800',
                    Icon: AlertTriangle,
                  };
              }
            };

            const style = getTypeStyle();
            const Icon = style.Icon;

            return (
              <div
                key={notif.id}
                style={{ opacity }}
                className={`bg-zinc-950/95 backdrop-blur-md border ${style.border} p-3 rounded-xl shadow-2xl transition-all duration-300 flex items-start gap-2.5 animate-in slide-in-from-left duration-200`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${style.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-100 truncate">{notif.title}</span>
                    <span className="text-[9px] text-zinc-400 font-semibold tabular-nums">
                      {Math.max(1, Math.round(5.5 - ageSeconds))}s
                    </span>
                  </div>
                  {notif.details && (
                    <p className="text-[10px] text-zinc-300 mt-0.5 leading-snug break-words">
                      {notif.details}
                    </p>
                  )}
                  {notif.items && notif.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {notif.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/80 text-[9px] font-semibold text-amber-300 rounded"
                        >
                          +{it.quantity} {it.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* BOTTOM BAR: Keybinds hint and Carriage integrity */}
      <div className="flex justify-between items-end">
        {/* Carriages Health overview */}
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/90 p-3 rounded-xl text-xs space-y-1.5 shadow-xl">
          <div className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase mb-1">
            {t.structuralIntegrity}
          </div>
          <div className="flex gap-2">
            {engine.carriages.map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800/80 p-2 rounded-lg w-28 text-center">
                <span className="block text-[10px] text-zinc-400 truncate font-semibold">
                  {c.name.split(' ')[0]}
                </span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {Math.round(c.currentHealth)} / {c.maxHealth}
                </span>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(c.currentHealth / c.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick controls help */}
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 px-4 py-2.5 rounded-xl text-[11px] text-zinc-400 flex items-center gap-4 shadow-xl">
          <span><kbd className="text-zinc-200 font-bold">[WASD]</kbd> {t.walkHint}</span>
          <span><kbd className="text-zinc-200 font-bold">[Shift]</kbd> {t.sprintHint}</span>
          <span><kbd className="text-zinc-200 font-bold">[E]</kbd> {t.interactHint}</span>
          <span><kbd className="text-zinc-200 font-bold">[T]</kbd> {t.weather}</span>
          <span><kbd className="text-zinc-200 font-bold">[F1]</kbd> {t.debugHint}</span>
        </div>
      </div>
    </div>
  );
};
