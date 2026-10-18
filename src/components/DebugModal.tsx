import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { Bug, X, Shield, PlusCircle, Skull, Wrench, Fuel, MapPin, CloudSnow, CloudRain, Sun } from 'lucide-react';
import { Language } from '../i18n/translations';
import { WeatherType } from '../game/threeScene';

interface DebugModalProps {
  engine: GameEngine;
  playerPos: { x: number; y: number; z: number };
  onClose: () => void;
  onRefresh: () => void;
  language: Language;
  weather?: WeatherType;
  onToggleWeather?: () => void;
}

export const DebugModal: React.FC<DebugModalProps> = ({
  engine,
  playerPos,
  onClose,
  onRefresh,
  language,
  weather = 'blizzard',
  onToggleWeather,
}) => {
  const ts = engine.trainStats;
  const isVi = language === 'vi';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl font-mono text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider uppercase text-zinc-100">
                {isVi ? 'BẢNG ĐIỀU KHIỂN GỠ LỖI UNITY (MỤC 58 & 59)' : 'UNITY DEBUG CONSOLE (SECTIONS 58 & 59)'}
              </h2>
              <span className="text-xs text-zinc-500">
                {isVi ? 'Giám Sát Mô Phỏng Trực Tiếp & Lệnh Dev' : 'Live Simulation Inspector & Dev Commands'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 59 Telemetry Display */}
        <div className="my-5 grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Tốc Độ Tàu' : 'Train Speed'}
            </span>
            <span className="text-amber-400 font-extrabold text-sm tabular-nums">
              {Math.round(ts.currentSpeed)} km/h
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Tải Trọng' : 'Train Weight'}
            </span>
            <span className="text-cyan-400 font-extrabold text-sm tabular-nums">
              {ts.totalWeight.toFixed(1)} t
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Nhiên Liệu' : 'Fuel Tank'}
            </span>
            <span className="text-emerald-400 font-extrabold text-sm tabular-nums">
              {ts.currentFuel.toFixed(1)} / {ts.maxFuel} L
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Thời Tiết & Khí Quyển' : 'Weather State'}
            </span>
            <span className="text-cyan-300 font-extrabold text-xs uppercase flex items-center gap-1.5 mt-0.5">
              {weather === 'blizzard' ? (
                <>
                  <CloudSnow className="w-3.5 h-3.5 text-cyan-300" />
                  {isVi ? 'Bão Tuyết' : 'Blizzard'}
                </>
              ) : weather === 'rain' ? (
                <>
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  {isVi ? 'Mưa Lạnh' : 'Rain'}
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  {isVi ? 'Trời Quang' : 'Clear Sky'}
                </>
              )}
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Khu Vực Sinh Thái' : 'Current Biome'}
            </span>
            <span className="text-indigo-400 font-extrabold text-xs">
              {isVi ? 'Băng Cực Tuyệt Đối' : 'Absolute Zero'}
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Nhiệt Độ Môi Trường' : 'Temperature'}
            </span>
            <span className="text-blue-300 font-extrabold text-sm tabular-nums">
              {weather === 'blizzard' ? '-32°C' : weather === 'rain' ? '-5°C' : '-18°C'}
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Thực Thể Tấn Công' : 'Active Enemies'}
            </span>
            <span className="text-red-400 font-extrabold text-sm tabular-nums">
              {engine.enemies.length} Chasers
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Số Lượng Toa' : 'Carriages'}
            </span>
            <span className="text-zinc-300 font-extrabold text-sm tabular-nums">
              {engine.carriages.length} Cars
            </span>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
              {isVi ? 'Vị Trí Người Chơi' : 'Player Pos'}
            </span>
            <span className="text-zinc-300 font-extrabold text-xs tabular-nums">
              X:{playerPos.x.toFixed(1)} Z:{playerPos.z.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Section 58 Debug Commands (F1 - F9) */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            {isVi ? 'LỆNH CAN THIỆP HỆ THỐNG (PHÍM NÓNG F1-F9)' : 'COMMAND TRIGGERS (KEYBOARD F1-F9)'}
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => {
                engine.debugAddFuel();
                onRefresh();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-amber-400 mb-1">
                <Fuel className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F2]</span>
              </div>
              <span>{isVi ? 'Đầy Nhiên Liệu' : 'Refill Fuel'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugAddResources();
                onRefresh();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-emerald-400 mb-1">
                <PlusCircle className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F3]</span>
              </div>
              <span>{isVi ? '+50 Tài Nguyên' : '+50 Resources'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugSpawnEnemy();
                onRefresh();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-red-400 mb-1">
                <Skull className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F4]</span>
              </div>
              <span>{isVi ? 'Thả Chaser' : 'Spawn Chaser'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugDamageTrain();
                onRefresh();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-orange-400 mb-1">
                <Wrench className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F5]</span>
              </div>
              <span>{isVi ? 'Phá Hại Toa' : 'Damage Train'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugRepairTrain();
                onRefresh();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-emerald-400 mb-1">
                <Wrench className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F6]</span>
              </div>
              <span>{isVi ? 'Sửa Chữa Hết' : 'Repair All Cars'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugToggleGodMode();
                onRefresh();
              }}
              className={`p-3 border rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer ${
                engine.godMode
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F7]</span>
              </div>
              <span>God Mode: {engine.godMode ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              onClick={() => {
                engine.debugTriggerStation();
                onRefresh();
                onClose();
              }}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center text-cyan-400 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] text-zinc-500 font-mono">[F8]</span>
              </div>
              <span>{isVi ? 'Tới Trạm Ngay' : 'Force Station'}</span>
            </button>

            {/* Weather Toggle [F9] */}
            <button
              onClick={() => {
                if (onToggleWeather) onToggleWeather();
                onRefresh();
              }}
              className="p-3 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/60 text-cyan-200 rounded-xl text-xs font-bold text-left flex flex-col justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex justify-between items-center mb-1 text-cyan-300">
                {weather === 'blizzard' ? (
                  <CloudSnow className="w-4 h-4" />
                ) : weather === 'rain' ? (
                  <CloudRain className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="text-[10px] text-cyan-400 font-mono">[F9]</span>
              </div>
              <span className="truncate">
                {isVi ? 'Đổi Thời Tiết' : 'Cycle Weather'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
