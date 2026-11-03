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
  Box,
  Wrench,
  Wind,
  Droplets,
  MapPin,
  Menu,
  Volume2,
  VolumeX,
  Languages,
  BookOpen,
  HelpCircle,
  Gauge,
  BatteryCharging,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

// Procedural Corner Frost Crystals for atmospheric Blizzard immersion
const FrostCorner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`w-48 h-48 pointer-events-none select-none text-cyan-200/40 drop-shadow-[0_0_10px_rgba(186,230,253,0.4)] ${className}`}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 0 L105 105 M15 0 L115 95 M0 15 L95 115"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.8"
    />
    <path
      d="M32 32 L60 20 M32 32 L20 60 M55 55 L85 40 M55 55 L40 85 M78 78 L115 58 M78 78 L58 115"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.7"
    />
  </svg>
);

export interface GameHUDProps {
  engine: GameEngine;
  interactTarget: InteractionTarget | null;
  isMounted: boolean;
  onDismount: () => void;
  language: Language;
  currentWeather?: WeatherType;
  onOpenPause?: () => void;
  onOpenSave?: () => void;
  onOpenSettings?: () => void;
  onOpenStoryLog?: () => void;
  onToggleHelp?: () => void;
  isAudioMuted?: boolean;
  onToggleMute?: () => void;
  onToggleLanguage?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  interactTarget,
  isMounted,
  onDismount,
  language,
  currentWeather = 'blizzard',
  onOpenPause,
  onOpenStoryLog,
  onToggleHelp,
  isAudioMuted = false,
  onToggleMute,
  onToggleLanguage,
}) => {
  const isVi = language === 'vi';
  const t = TRANSLATIONS[language];
  const p = engine.playerStats;
  const ts = engine.trainStats;
  const turret = engine.turret;
  const station = engine.currentStation;

  // Single authoritative fuel calculations
  const fuelLevel = engine.trainStats.fuel !== undefined ? engine.trainStats.fuel : engine.trainStats.currentFuel;
  const maxFuel = engine.trainStats.maxFuel || 100;
  const fuelPercent = Math.min(100, Math.max(0, (fuelLevel / maxFuel) * 100));
  const isLowFuel = fuelPercent < 20;

  // Single authoritative train hull calculation
  const totalTrainHp = engine.carriages.reduce((acc, c) => acc + c.currentHealth, 0);
  const totalTrainMaxHp = engine.carriages.reduce((acc, c) => acc + c.maxHealth, 0);
  const trainHpPercent = Math.min(100, Math.max(0, (totalTrainHp / Math.max(1, totalTrainMaxHp)) * 100));

  // Single authoritative scrap count
  const scrapCount =
    (engine.inventory.find((i) => i.id === 'scrap')?.quantity || 0) +
    (engine.storage.find((i) => i.id === 'scrap')?.quantity || 0);

  // Oxygen relevance: show only if < 95% or power fault
  const showOxygen = (p.oxygen ?? 100) < 95 || ts.powerGeneration < ts.powerConsumption;

  // Real-time tick for radar sweep & notification fading
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Radar geometry (compact 120px scope)
  const radarRadius = 52;
  const radarCenter = 60;
  const maxRadarRangeMeters = 80;
  const trainCenterZ = -10;

  const enemies = engine.enemies || [];
  const radarEnemyBlips = enemies.map((enemy) => {
    const dx = enemy.x;
    const dz = enemy.z - trainCenterZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const clampedDist = Math.min(dist, maxRadarRangeMeters);
    const scale = (clampedDist / maxRadarRangeMeters) * radarRadius;
    const angle = Math.atan2(dz, dx) - Math.PI / 2;
    return {
      id: enemy.id,
      x: radarCenter + Math.cos(angle) * scale,
      y: radarCenter + Math.sin(angle) * scale,
      dist,
      type: enemy.type,
    };
  });

  const closestThreatDist =
    radarEnemyBlips.length > 0 ? Math.min(...radarEnemyBlips.map((b) => b.dist)) : Infinity;

  // Station blip on radar
  let upcomingStationMarker = null;
  if (station) {
    upcomingStationMarker = {
      x: radarCenter + 32,
      y: radarCenter - 14,
      name: station.name,
      distLabel: isVi ? 'Tại Ga' : 'Docked',
    };
  } else if (ts.nextStationDistance <= 1.5) {
    const kmFrac = Math.min(1, ts.nextStationDistance / 1.5);
    upcomingStationMarker = {
      x: radarCenter,
      y: radarCenter - (18 + kmFrac * (radarRadius - 20)),
      name: isVi ? 'Ga Kế Tiếp' : 'Next Station',
      distLabel: `${ts.nextStationDistance.toFixed(1)}km`,
    };
  }

  // Active Objective text calculation
  const getObjectiveInfo = () => {
    if (engine.prologue.isActive) {
      switch (engine.prologue.step) {
        case 'intro_cutscene':
          return {
            stepNum: '1/5',
            title: isVi ? 'Quan sát kho ga phế tích' : 'Inspect Ruined Depot #07',
            detail: isVi ? 'Đọc ghi chú để định hướng sống còn.' : 'Review survivor note.',
          };
        case 'radio_message':
          return {
            stepNum: '1/5',
            title: isVi ? 'Bật máy thu radio khẩn cấp [E]' : 'Tune Emergency Radio [E]',
            detail: isVi ? 'Dò tần số sóng ngắn trên sân ga để nghe tín hiệu Terminal Zero.' : 'Listen for emergency transmission on depot platform.',
          };
        case 'scavenge_resources':
          return {
            stepNum: '2/5',
            title: isVi ? 'Thu gom nhiên liệu và phế liệu' : 'Scavenge Depot Caches',
            detail: isVi
              ? `Nhiên liệu: ${engine.prologue.fuelCollected}/1 · Phế liệu: ${engine.prologue.scrapCollected}/15`
              : `Fuel: ${engine.prologue.fuelCollected}/1 · Scrap: ${engine.prologue.scrapCollected}/15`,
          };
        case 'repair_engine':
          return {
            stepNum: '3/5',
            title: isVi ? 'Hàn kín ống hơi đầu máy [E]' : 'Weld Boiler Steam Pipe [E]',
            detail: isVi ? 'Đến cạnh nồi hơi đầu máy xe lửa nhấn [E] phục hồi áp suất.' : 'Approach locomotive boiler to restore steam pressure.',
          };
        case 'raider_ambush':
          return {
            stepNum: '4/5',
            title: isVi ? 'Phòng thủ bọn cướp phục kích' : 'Defend Against Raiders',
            detail: isVi
              ? `Đã hạ: ${engine.prologue.raidersDefeated} / ${engine.prologue.raidersTarget} tên cướp`
              : `Downed: ${engine.prologue.raidersDefeated} / ${engine.prologue.raidersTarget} raiders`,
          };
        case 'depart_to_settlement':
          return {
            stepNum: '5/5',
            title: isVi ? 'Lái tàu hướng về Haven' : 'Throttle Up to Haven',
            detail: isVi
              ? `Khoảng cách còn lại: ${engine.prologue.settlementDistanceKm.toFixed(1)} km`
              : `Remaining distance: ${engine.prologue.settlementDistanceKm.toFixed(1)} km`,
          };
        default:
          return {
            stepNum: '★',
            title: isVi ? 'Hoàn thành Khởi Đầu' : 'Prologue Complete',
            detail: isVi ? 'Tiếp tục hành trình.' : 'Proceed along the rails.',
          };
      }
    } else if (engine.chapter1?.isActive) {
      if (!engine.chapter1.log1Discovered) {
        return {
          stepNum: 'Ch.I',
          title: isVi ? 'Dò tìm bản ghi âm TS. Voss' : 'Find Dr. Voss Audio Log',
          detail: isVi ? 'Vượt vùng tro tàn · Km 3.6' : 'Ash Outskirts · Km 3.6',
        };
      }
      if (!engine.chapter1.maraDistressHeard) {
        return {
          stepNum: 'Ch.I',
          title: isVi ? 'Bắt tín hiệu Mara Cole' : 'Intercept Mara Cole Signal',
          detail: isVi ? 'Tín hiệu SOS sóng ngắn · Km 4.6' : 'SOS Shortwave · Km 4.6',
        };
      }
      if (!engine.chapter1.roadblockDefeated) {
        return {
          stepNum: 'Ch.I',
          title: isVi ? 'Tiêu diệt Xe Tải Chặn Ray' : 'Destroy Raider Roadblock',
          detail: isVi ? 'Bắn hạ chướng ngại vật bọc thép!' : 'Destroy heavy roadblock truck!',
        };
      }
      if (!engine.chapter1.maraRecruited) {
        return {
          stepNum: 'Ch.I',
          title: isVi ? 'Giải cứu Mara Cole [E]' : 'Rescue Mara Cole [E]',
          detail: isVi ? 'Tại tháp bẻ ghi đường sắt.' : 'At railway switch tower.',
        };
      }
      return {
        stepNum: 'Ch.I',
        title: isVi ? 'Cập bến Tiền Đồn 42' : 'Dock at Outpost 42',
        detail: isVi ? `Còn ${ts.nextStationDistance.toFixed(1)} km` : `${ts.nextStationDistance.toFixed(1)} km left`,
      };
    } else if (station) {
      return {
        stepNum: 'Ga',
        title: `${station.name}`,
        detail: isVi ? 'Thu gom đồ tiếp tế trước khi rời đi.' : 'Scavenge supplies before departure.',
      };
    } else {
      return {
        stepNum: 'Km',
        title: isVi ? 'Duy trì hành trình' : 'Maintain Expedition',
        detail: isVi ? `Ga kế tiếp: ${ts.nextStationDistance.toFixed(1)} km` : `Next depot: ${ts.nextStationDistance.toFixed(1)} km`,
      };
    }
  };

  const objInfo = getObjectiveInfo();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Blizzard corner frost overlay */}
      {currentWeather === 'blizzard' && (
        <>
          <FrostCorner className="absolute top-12 left-0" />
          <FrostCorner className="absolute top-12 right-0 -scale-x-100" />
        </>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3.A: AUTHORITATIVE SINGLE-ROW TOP BAR                             */}
      {/* ========================================================================= */}
      <header className="relative z-40 w-full h-12 bg-zinc-950/92 backdrop-blur-md border-b border-zinc-800/90 px-4 flex items-center justify-between pointer-events-auto shrink-0">
        {/* Left Side: Player Survival Indicators */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* App Title Wordmark */}
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-xs font-black tracking-wider text-zinc-100 uppercase hidden sm:inline">
              THE LAST TRACK
            </span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-1.5" title={`${t.hp}: ${Math.round(p.health)}%`}>
            <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="w-16 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, p.health))}%` }}
              />
            </div>
            <span className="font-bold text-zinc-200 tabular-nums text-[11px]">{Math.round(p.health)}</span>
          </div>

          {/* Stamina */}
          <div className="flex items-center gap-1.5" title={`${t.stamina}: ${Math.round(p.stamina)}%`}>
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="w-14 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, p.stamina))}%` }}
              />
            </div>
            <span className="font-bold text-zinc-300 tabular-nums text-[11px]">{Math.round(p.stamina)}</span>
          </div>

          {/* Hunger */}
          <div className="flex items-center gap-1.5" title={`${t.hunger}: ${Math.round(p.hunger)}%`}>
            <span className="text-[11px] font-bold text-amber-400 shrink-0">HUN</span>
            <div className="w-14 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden lg:block">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  p.hunger < 25 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, p.hunger))}%` }}
              />
            </div>
            <span className="font-bold text-zinc-300 tabular-nums text-[11px]">{Math.round(p.hunger)}</span>
          </div>

          {/* Thirst */}
          <div className="flex items-center gap-1.5" title={`${t.thirst}: ${Math.round(p.thirst)}%`}>
            <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div className="w-14 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden lg:block">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  p.thirst < 25 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, p.thirst))}%` }}
              />
            </div>
            <span className="font-bold text-zinc-300 tabular-nums text-[11px]">{Math.round(p.thirst)}</span>
          </div>

          {/* Oxygen (Only displayed when relevant) */}
          {showOxygen && (
            <div
              className="flex items-center gap-1.5 animate-pulse"
              title={`${t.oxygen}: ${Math.round(p.oxygen ?? 100)}%`}
            >
              <Wind className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div className="w-14 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (p.oxygen ?? 100) < 30 ? 'bg-red-500' : 'bg-teal-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, p.oxygen ?? 100))}%` }}
                />
              </div>
              <span className="font-bold text-teal-300 tabular-nums text-[11px]">
                {Math.round(p.oxygen ?? 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Authoritative Train Resources & Global Controls */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Hull / Train Durability */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800"
            title={`${isVi ? 'Độ bền đoàn tàu' : 'Train Hull'}: ${Math.round(totalTrainHp)}/${totalTrainMaxHp}`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 hidden sm:inline">{isVi ? 'GIÁP' : 'HULL'}</span>
            <div className="w-12 h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  trainHpPercent < 25 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                }`}
                style={{ width: `${trainHpPercent}%` }}
              />
            </div>
            <span className="font-bold text-zinc-200 tabular-nums text-[11px]">{Math.round(trainHpPercent)}%</span>
          </div>

          {/* Fuel: Sole persistent authoritative display */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              isLowFuel
                ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse'
                : 'bg-zinc-900/80 border-zinc-800 text-blue-300'
            }`}
            title={`${isVi ? 'Nhiên liệu' : 'Fuel'}: ${Math.round(fuelLevel)}L / ${maxFuel}L`}
          >
            <Flame className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 hidden sm:inline">{isVi ? 'DẦU' : 'FUEL'}</span>
            <div className="w-12 h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLowFuel ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${fuelPercent}%` }}
              />
            </div>
            <span className="font-bold text-zinc-100 tabular-nums text-[11px]">
              {Math.round(fuelLevel)}L
            </span>
          </div>

          {/* Scrap Metal: Sole persistent authoritative display */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800 text-amber-300"
            title={`${isVi ? 'Phế liệu kim loại' : 'Scrap Metal'}: ${scrapCount}`}
          >
            <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 hidden sm:inline">{isVi ? 'PHẾ LIỆU' : 'SCRAP'}</span>
            <span className="font-bold text-amber-300 tabular-nums text-[11px]">{scrapCount}</span>
          </div>

          {/* Story Dossier Button */}
          {onOpenStoryLog && (
            <button
              onClick={onOpenStoryLog}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isVi ? 'Sổ Tay Nhật Ký Chiến Dịch' : 'Campaign Dossier & Story Log'}
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}

          {/* Help Button [H] */}
          {onToggleHelp && (
            <button
              onClick={onToggleHelp}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={isVi ? 'Hướng Dẫn & Phím Tắt [H]' : 'Help & Controls [H]'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold hidden sm:inline">[H]</span>
            </button>
          )}

          {/* Language Toggle */}
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Chuyển ngôn ngữ / Switch Language"
            >
              <Languages className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          )}

          {/* Mute Toggle */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isAudioMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              )}
            </button>
          )}

          {/* Authoritative Single Menu Button */}
          {onOpenPause && (
            <button
              onClick={onOpenPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-sm ml-1"
              title={isVi ? 'Menu Tạm Dừng [ESC]' : 'Pause Menu [ESC]'}
            >
              <Menu className="w-3.5 h-3.5" />
              <span>{isVi ? 'Menu' : 'Menu'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SECTION 3.B: CENTER SCREEN PROTECTED - EDGES ONLY                         */}
      {/* ========================================================================= */}
      <div className="relative flex-1 flex justify-between items-start p-4 pointer-events-none">
        {/* TOP-LEFT EDGE: Compact Mission Objective Badge */}
        <div className="pointer-events-auto max-w-sm rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800 p-2.5 shadow-xl text-xs space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isVi ? 'Mục Tiêu' : 'Objective'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-extrabold border border-amber-500/30">
              {objInfo.stepNum}
            </span>
          </div>
          <div>
            <div className="font-bold text-zinc-100 text-xs leading-snug">{objInfo.title}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{objInfo.detail}</div>
          </div>
        </div>

        {/* TOP-RIGHT EDGE: Compact Environmental Weather Badge (No Manual Switch) */}
        <div className="pointer-events-auto rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800 px-3 py-2 shadow-xl text-xs flex items-center gap-2.5 font-mono select-none">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
            {currentWeather === 'blizzard' && <CloudSnow className="w-4 h-4 text-cyan-400 animate-pulse" />}
            {currentWeather === 'rain' && <CloudRain className="w-4 h-4 text-blue-400" />}
            {currentWeather === 'clear' && <Sparkles className="w-4 h-4 text-amber-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-200 text-xs">
                {currentWeather === 'blizzard'
                  ? t.weatherBlizzard
                  : currentWeather === 'rain'
                  ? t.weatherRain
                  : t.weatherClear}
              </span>
              <span className="text-[10px] font-bold text-cyan-300 tabular-nums">
                {p.bodyTemperature.toFixed(0)}°C
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 tabular-nums">
              {isVi ? 'Đổi sau' : 'Cycle'}: {formatTime(engine.weatherTimeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER INTERACTION RETICLE / TURRET CONTROLS                              */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isMounted ? (
          /* Turret Crosshair & Overheat Status */
          <div className="flex flex-col items-center">
            <div className="relative">
              <Crosshair className="w-10 h-10 text-red-500/80 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              </div>
            </div>

            <div className="mt-4 bg-zinc-950/90 backdrop-blur-md border border-red-500/50 p-2.5 rounded-xl shadow-2xl w-48 text-center pointer-events-auto font-mono">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">{t.barrelHeat}</span>
                <span className="font-bold text-red-400 tabular-nums">{Math.round(turret.heat)}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    turret.isOverheated ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                  }`}
                  style={{ width: `${turret.heat}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-zinc-800 mt-1">
                <span className="text-zinc-400">{t.ammo}</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {turret.currentAmmo} / {turret.maxAmmo}
                </span>
              </div>
              <button
                onClick={onDismount}
                className="w-full mt-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg cursor-pointer"
              >
                {isVi ? 'Rời tháp súng [ESC]' : 'Dismount Turret [ESC]'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3.B: DOCKED BOTTOM INTERACTION PROMPT (NON-OBTRUSIVE)            */}
      {/* ========================================================================= */}
      {!isMounted && interactTarget && (() => {
        const cleanName = interactTarget.name
          .replace(/\s*\[[A-Za-z0-9/]+\]\s*$/i, '')
          .replace(/\s*\(W\/S\)\s*/i, ' ')
          .trim();
        const isThrottle = interactTarget.type === 'Throttle';

        return (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-amber-500/80 shadow-[0_4px_24px_rgba(245,158,11,0.25)] font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-1.5">
              <span className="bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded text-[11px] shadow-sm">
                [E]
              </span>
              <span className="font-bold text-amber-200">{cleanName}</span>
            </div>
            {isThrottle && (
              <>
                <div className="h-3.5 w-px bg-zinc-700/80" />
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <span className="bg-zinc-800 text-zinc-200 font-bold px-1.5 py-0.5 rounded border border-zinc-700 text-[10px]">
                    [W / S]
                  </span>
                  <span className="text-zinc-400">{isVi ? 'Tăng / Giảm Cần Ga' : 'Throttle Shift'}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SECTION 3.C & 3.D: BOTTOM LAYER (RADAR + TRAIN STATUS + NOTIFICATIONS)    */}
      {/* ========================================================================= */}
      <div className="relative z-30 p-4 flex justify-between items-end pointer-events-none shrink-0">
        {/* BOTTOM-LEFT: Compact Notification Log & Keybind Hint */}
        <div className="space-y-2 pointer-events-auto max-w-sm">
          {/* Notifications stack */}
          <div className="space-y-1.5">
            {engine.notifications &&
              engine.notifications.map((notif) => {
                const ageSeconds = (now - notif.timestamp) / 1000;
                const opacity = ageSeconds > 3.5 ? Math.max(0, 1 - (ageSeconds - 3.5) / 1.5) : 1;
                return (
                  <div
                    key={notif.id}
                    style={{ opacity }}
                    className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 px-3 py-1.5 rounded-xl shadow-lg text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-bold text-zinc-200 truncate">{notif.title}</span>
                    {notif.details && (
                      <span className="text-[11px] text-zinc-400 truncate">— {notif.details}</span>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Quick controls pill */}
          <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 px-3 py-1.5 rounded-xl text-[10px] text-zinc-400 flex items-center gap-2.5 font-mono shadow-md select-none">
            <span>
              <kbd className="text-zinc-200 font-bold">[WASD / ↑←↓→]</kbd> {isVi ? 'Di Chuyển' : 'Move'}
            </span>
            <span>
              <kbd className="text-zinc-200 font-bold">[Shift]</kbd> {isVi ? 'Chạy' : 'Sprint'}
            </span>
            <span>
              <kbd className="text-zinc-200 font-bold">[E]</kbd> {isVi ? 'Tương Tác' : 'Interact'}
            </span>
            <span>
              <kbd className="text-amber-300 font-bold">[H]</kbd> {isVi ? 'Hướng Dẫn' : 'Help'}
            </span>
          </div>
        </div>

        {/* BOTTOM-RIGHT: Compact Radar & Train Status (No Duplicate Buttons!) */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Compact 120px Circular Radar Scope */}
          <div className="relative w-32 h-32 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800 shadow-2xl p-1.5 flex flex-col items-center justify-center font-mono">
            <div className="relative w-28 h-28 rounded-full bg-emerald-950/20 border border-emerald-500/40 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Radar green sweep */}
              <div className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite] origin-center bg-[conic-gradient(from_0deg,transparent_0deg,transparent_310deg,rgba(16,185,129,0.35)_360deg)] pointer-events-none" />

              {/* Range rings */}
              <div className="absolute w-12 h-12 rounded-full border border-emerald-500/20 pointer-events-none" />
              <div className="absolute w-20 h-20 rounded-full border border-emerald-500/20 pointer-events-none" />

              {/* Crosshair grid */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-emerald-500/20" />
                <div className="h-full w-px bg-emerald-500/20 absolute" />
              </div>

              {/* Train marker at center */}
              <div className="absolute w-2 h-3 bg-emerald-400 rounded-xs shadow-[0_0_6px_rgba(16,185,129,0.9)] z-20 pointer-events-none" />

              {/* Station marker */}
              {upcomingStationMarker && (
                <div
                  className="absolute w-2.5 h-2.5 rotate-45 bg-amber-400 border border-amber-200 shadow-[0_0_8px_rgba(245,158,11,1)] z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${upcomingStationMarker.x}px`, top: `${upcomingStationMarker.y}px` }}
                  title={upcomingStationMarker.name}
                />
              )}

              {/* Enemy crimson blips */}
              {radarEnemyBlips.map((blip) => (
                <div
                  key={blip.id}
                  className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,1)] z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
                  style={{ left: `${blip.x}px`, top: `${blip.y}px` }}
                  title={`${blip.type}: ${Math.round(blip.dist)}m`}
                />
              ))}
            </div>

            {/* Radar threat indicator label */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-center tracking-wider whitespace-nowrap">
              {enemies.length > 0 ? (
                <span className="text-red-400 font-extrabold animate-pulse">
                  {enemies.length} {isVi ? 'KẺ ĐỊCH' : 'HOSTILE'} ({Math.round(closestThreatDist)}m)
                </span>
              ) : (
                <span className="text-emerald-500 font-bold">RADAR CLEAR</span>
              )}
            </div>
          </div>

          {/* Train Status Panel: Speed, Power & Cargo Directly Below Radar */}
          <div className="w-48 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl p-2.5 shadow-xl text-xs space-y-1.5 font-mono">
            {/* Speed & Throttle */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                {isVi ? 'Tốc độ' : 'Speed'}
              </span>
              <span className="font-extrabold text-zinc-100 tabular-nums">
                {Math.round(ts.currentSpeed)} <span className="text-[10px] text-zinc-400 font-normal">km/h</span>
              </span>
            </div>

            {/* Power Status */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                {isVi ? 'Điện năng' : 'Power'}
              </span>
              <span
                className={`font-bold tabular-nums text-[11px] ${
                  ts.powerGeneration >= ts.powerConsumption ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {ts.powerGeneration - ts.powerConsumption >= 0 ? '+' : ''}
                {ts.powerGeneration - ts.powerConsumption}W
              </span>
            </div>

            {/* Cargo load */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px]">
              <span className="text-zinc-400">{isVi ? 'Sức chứa kho' : 'Cargo'}</span>
              <span className="font-bold text-zinc-300 tabular-nums">
                {scrapCount} / {engine.carriages.length * 40} kg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
