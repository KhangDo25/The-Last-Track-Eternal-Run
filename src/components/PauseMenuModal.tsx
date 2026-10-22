import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../audio/soundManager';
import {
  Play,
  Save,
  FolderOpen,
  Settings,
  LogOut,
  X,
  AlertTriangle,
  Flame,
  Shield,
  Compass,
  Train,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SaveManager } from '../game/saveManager';

interface PauseMenuModalProps {
  engine: GameEngine;
  onResume: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
  onReturnToMainMenu: (saveFirst: boolean) => void;
  language: Language;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  engine,
  onResume,
  onOpenSave,
  onOpenLoad,
  onOpenSettings,
  onReturnToMainMenu,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Active mission summary
  const getActiveMissionInfo = () => {
    if (engine.prologue.isActive) {
      return {
        title: language === 'vi' ? 'Chương Mở Đầu: Tẩu Thoát Kho Ga Phế Tích Sector 07' : 'Prologue: Escape Sector 07 Freight Depot',
        objective: language === 'vi'
          ? `Nhiên liệu: ${engine.prologue.fuelCollected}/${engine.prologue.fuelTarget} · Phế liệu: ${engine.prologue.scrapCollected}/${engine.prologue.scrapTarget}`
          : `Fuel: ${engine.prologue.fuelCollected}/${engine.prologue.fuelTarget} · Scrap: ${engine.prologue.scrapCollected}/${engine.prologue.scrapTarget}`,
      };
    }
    return {
      title: `${engine.currentChapter} · Hành trình sống còn`,
      objective: language === 'vi' ? 'Tiếp tục lăn bánh trên đường ray, duy trì lò hơi và tháp pháo' : 'Keep moving along the tracks, maintain steam boiler and defense turret',
    };
  };

  const activeMission = getActiveMissionInfo();

  // Train vitals summary
  const totalHp = engine.carriages.reduce((acc, c) => acc + c.currentHealth, 0);
  const maxHp = engine.carriages.reduce((acc, c) => acc + c.maxHealth, 0);
  const fuel = Math.round(engine.trainStats.currentFuel);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 font-mono text-zinc-100 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <h2 className="text-sm font-black tracking-widest uppercase text-zinc-100">
                {language === 'vi' ? 'HÀNH TRÌNH TẠM DỪNG' : 'EXPEDITION PAUSED'}
              </h2>
              <span className="text-[10px] text-zinc-400">
                {engine.currentChapter} · {SaveManager.formatPlaytime(engine.playtimeSeconds)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onResume();
            }}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
            title="Resume [ESC / P]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Mission & Train Overview Card */}
        <div className="p-3.5 bg-zinc-950/90 rounded-2xl border border-zinc-800/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-extrabold uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeMission.title}</span>
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
              {language === 'vi' ? 'Đã Dừng' : 'PAUSED'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">
              {language === 'vi' ? 'Mục tiêu hiện tại:' : 'Current Objective:'}
            </span>
            <span className="font-semibold text-zinc-200">{activeMission.objective}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
              <span className="block text-[9px] text-zinc-500 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                {language === 'vi' ? 'Thân Tàu' : 'Hull HP'}
              </span>
              <span className="font-bold text-emerald-300">
                {totalHp} / {maxHp}
              </span>
            </div>

            <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
              <span className="block text-[9px] text-zinc-500 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                {language === 'vi' ? 'Nhiên Liệu' : 'Fuel'}
              </span>
              <span className="font-bold text-amber-300">{fuel}L</span>
            </div>

            <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
              <span className="block text-[9px] text-zinc-500 flex items-center gap-1">
                <Train className="w-3 h-3 text-blue-400" />
                {language === 'vi' ? 'Toa Xe' : 'Carriages'}
              </span>
              <span className="font-bold text-zinc-200">{engine.carriages.length} Toa</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2">
          {/* 1. RESUME */}
          <button
            onClick={() => {
              soundManager.playClick();
              onResume();
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>{language === 'vi' ? 'TIẾP TỤC HÀNH TRÌNH' : 'RESUME EXPEDITION'} [ESC]</span>
          </button>

          {/* 2. SAVE GAME */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSave();
            }}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{language === 'vi' ? 'LƯU TIẾN TRÌNH' : 'SAVE CAMPAIGN'}</span>
          </button>

          {/* 3. LOAD GAME */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLoad();
            }}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>{language === 'vi' ? 'NẠP BẢN LƯU' : 'LOAD CAMPAIGN'}</span>
          </button>

          {/* 4. SETTINGS */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>{language === 'vi' ? 'CÀI ĐẶT HỆ THỐNG' : 'SYSTEM SETTINGS'}</span>
          </button>

          {/* 5. RETURN TO MAIN MENU */}
          <button
            onClick={() => {
              soundManager.playAlarm();
              setShowExitConfirm(true);
            }}
            className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/50 hover:border-red-700 text-red-300 font-bold text-xs uppercase tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>{language === 'vi' ? 'THOÁT VỀ MENU CHÍNH' : 'RETURN TO MAIN MENU'}</span>
          </button>
        </div>

        {/* Abandon Mission / Exit Confirmation Dialog */}
        {showExitConfirm && (
          <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-red-500 space-y-3 animate-in fade-in duration-150 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-xs font-black uppercase text-zinc-100">
                {language === 'vi' ? 'CẢNH BÁO: TỪ BỎ NHIỆM VỤ ĐANG CHẠY' : 'WARNING: ABANDON ACTIVE MISSION'}
              </h4>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {language === 'vi'
                ? `Bạn đang thực hiện nhiệm vụ: "${activeMission.title}". Nếu thoát mà không lưu, tiến trình nhiệm vụ và tài nguyên thu nhặt chưa lưu sẽ bị hủy bỏ hoàn toàn!`
                : `You are currently on mission: "${activeMission.title}". If you exit without saving, current mission progress and uncommitted supplies will be discarded!`}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  soundManager.playHorn();
                  onReturnToMainMenu(true);
                }}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-[11px] uppercase rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Lưu & Thoát' : 'Save & Exit'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onReturnToMainMenu(false);
                }}
                className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-[11px] uppercase rounded-xl transition-colors cursor-pointer"
              >
                {language === 'vi' ? 'Từ Bỏ & Thoát' : 'Abandon & Exit'}
              </button>
            </div>

            <button
              onClick={() => setShowExitConfirm(false)}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] rounded-lg transition-colors cursor-pointer font-bold"
            >
              {language === 'vi' ? 'Hủy Bỏ (Ở Lại Đoàn Tàu)' : 'Cancel & Stay on Train'}
            </button>
          </div>
        )}

        {/* Footer controls hint */}
        <div className="text-center text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2">
          <span>{language === 'vi' ? 'Nhấn [ESC] hoặc [P] để tiếp tục hành trình.' : 'Press [ESC] or [P] to resume run.'}</span>
        </div>
      </div>
    </div>
  );
};
