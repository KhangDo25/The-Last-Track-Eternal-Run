import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { DefeatReason } from '../types/game';
import { Language } from '../i18n/translations';
import {
  RotateCcw,
  FolderOpen,
  Home,
  RefreshCw,
  AlertTriangle,
  Skull,
  Flame,
  ShieldAlert,
  Clock,
  Compass,
  CheckCircle,
  X,
} from 'lucide-react';

interface GameOverModalProps {
  engine: GameEngine;
  language: Language;
  defeatReason?: DefeatReason | null;
  onRetryCheckpoint: () => void;
  onOpenLoadModal: () => void;
  onReturnToMainMenu: () => void;
  onRestartCampaign: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  engine,
  language,
  defeatReason = 'train_destroyed',
  onRetryCheckpoint,
  onOpenLoadModal,
  onReturnToMainMenu,
  onRestartCampaign,
}) => {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const isVi = language === 'vi';

  const reason = defeatReason || engine.defeatReason || 'train_destroyed';

  const getDefeatDetails = () => {
    switch (reason) {
      case 'player_killed':
        return {
          title: isVi ? 'TỬ NẠN TRONG BÃO TUYẾT' : 'SURVIVOR PERISHED',
          subtitle: isVi ? 'Hạ Thân Nhiệt Hoặc Kiệt Sức Chí Mạng' : 'Critical Hypothermia & Slain',
          desc: isVi
            ? 'Bão tuyết tàn khốc, đói khát hoặc vết thương từ bọn cướp đã khiến Elias Voss gục ngã trước khi đến được nơi an toàn.'
            : 'Fierce blizzard sub-zero temperatures, starvation, or wounds from raiders have caused Elias Voss to collapse in the snow.',
          icon: Skull,
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/60',
          bgGradient: 'from-cyan-950/60 via-zinc-950 to-zinc-950',
          shadowGlow: 'shadow-[0_0_40px_rgba(6,182,212,0.35)]',
        };
      case 'derailment':
        return {
          title: isVi ? 'TRẬT BÁNH ĐƯỜNG RAY' : 'CRITICAL RAIL DERAILMENT',
          subtitle: isVi ? 'Va Chạm Địa Hình Nguy Hiểm Quá Tốc Độ' : 'Hazard Collision Over Safe Speed',
          desc: isVi
            ? 'Đoàn tàu lao qua đoạn ray nứt gãy hoặc mảnh vỡ với tốc độ vượt ngưỡng an toàn, khiến các toa tàu lật nhào trong bão.'
            : 'The train traversed fractured rails or collapsed debris far exceeding safe speed limits, derailing into the frozen abyss.',
          icon: ShieldAlert,
          color: 'text-amber-400',
          borderColor: 'border-amber-500/60',
          bgGradient: 'from-amber-950/60 via-zinc-950 to-zinc-950',
          shadowGlow: 'shadow-[0_0_40px_rgba(245,158,11,0.35)]',
        };
      case 'stranded':
        return {
          title: isVi ? 'CẠN KIỆT NHIÊN LIỆU' : 'STRANDED IN WASTELAND',
          subtitle: isVi ? 'Nồi Hơi Tắt Lửa Giữa Vùng Đất Chết' : 'Boiler Extinguished in Wilderness',
          desc: isVi
            ? 'Đầu máy cạn kiệt toàn bộ nhiên liệu và năng lượng. Đoàn tàu bất động giữa vùng cực hàn không có cứu viện.'
            : 'The locomotive burned its final liter of fuel. With generators frozen and heating offline, the train stopped permanently.',
          icon: Flame,
          color: 'text-orange-400',
          borderColor: 'border-orange-500/60',
          bgGradient: 'from-orange-950/60 via-zinc-950 to-zinc-950',
          shadowGlow: 'shadow-[0_0_40px_rgba(249,115,22,0.35)]',
        };
      case 'train_destroyed':
      default:
        return {
          title: isVi ? 'THÂN TÀU BỊ PHÁ HỦY' : 'TRAIN OBLITERATED',
          subtitle: isVi ? 'Vỏ Giáp Toa Tàu Đã Bị Xé Toạc' : 'Hull Integrity Completely Breached',
          desc: isVi
            ? 'Hỏa lực và móng vuốt của quái vật phế tích đã xuyên thủng khoang động cơ. Đầu máy phát nổ giữa tuyết trắng.'
            : 'Hostile scavengers and wasteland beasts broke through the reinforced plating. The locomotive has been obliterated.',
          icon: AlertTriangle,
          color: 'text-red-500',
          borderColor: 'border-red-600/70',
          bgGradient: 'from-red-950/60 via-zinc-950 to-zinc-950',
          shadowGlow: 'shadow-[0_0_45px_rgba(239,68,68,0.4)]',
        };
    }
  };

  const details = getDefeatDetails();
  const IconComponent = details.icon;

  const formatPlaytime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const scrapCount =
    (engine.inventory.find((i) => i.id === 'scrap')?.quantity || 0) +
    (engine.storage.find((i) => i.id === 'scrap')?.quantity || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div
        className={`bg-gradient-to-b ${details.bgGradient} border-2 ${details.borderColor} rounded-2xl max-w-lg w-full p-6 sm:p-8 ${details.shadowGlow} text-zinc-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header with Defeat Reason */}
        <div className="text-center space-y-2">
          <div
            className={`w-16 h-16 rounded-2xl bg-zinc-900/90 border-2 ${details.borderColor} ${details.color} flex items-center justify-center mx-auto shadow-xl`}
          >
            <IconComponent className="w-8 h-8 animate-pulse" />
          </div>

          <div className="pt-2">
            <span className={`text-[10px] font-black tracking-widest uppercase block ${details.color}`}>
              {details.subtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase drop-shadow-md">
              {details.title}
            </h2>
          </div>

          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            {details.desc}
          </p>
        </div>

        {/* Expedition Statistics Summary */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              {isVi ? 'Thống Kê Chuyến Đi Vừa Thất Bại' : 'Failed Expedition Log'}
            </span>
            <span className="text-zinc-500 font-normal">
              {engine.currentChapter}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="space-y-0.5">
              <span className="text-zinc-500 block text-[9px] uppercase">
                {isVi ? 'Quãng Đường Đã Chạy' : 'Distance Traveled'}
              </span>
              <span className="text-amber-300 font-extrabold text-sm tabular-nums">
                {engine.trainStats.distanceTraveled.toFixed(1)} km
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-zinc-500 block text-[9px] uppercase flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {isVi ? 'Thời Gian Sống Sót' : 'Time Survived'}
              </span>
              <span className="text-zinc-200 font-extrabold text-sm tabular-nums">
                {formatPlaytime(engine.playtimeSeconds)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-zinc-500 block text-[9px] uppercase">
                {isVi ? 'Phế Liệu Sắt Thu Thập' : 'Scrap Metal'}
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {scrapCount} {isVi ? 'đơn vị' : 'units'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-zinc-500 block text-[9px] uppercase">
                {isVi ? 'Đạn Dự Trữ Tháp Pháo' : 'Turret Rounds Left'}
              </span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {engine.turret.currentAmmo} / {engine.turret.maxAmmo}
              </span>
            </div>
          </div>
        </div>

        {/* Save Safety Assurance Banner */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-3 py-2 text-[10px] text-emerald-300/90 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isVi
              ? 'Dữ liệu lưu chiến dịch của bạn được bảo toàn an toàn. Không có tệp lưu nào bị xóa hoặc mất sau thất bại.'
              : 'Your campaign saves are fully preserved. No saved slots were deleted or overwritten upon defeat.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* 1. Retry from Checkpoint */}
          <button
            onClick={onRetryCheckpoint}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {isVi ? 'Thử Lại Từ Điểm Lưu Tự Động (Checkpoint)' : 'Retry from Checkpoint (Auto-Save)'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 2. Load Game */}
            <button
              onClick={onOpenLoadModal}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-500/60 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>{isVi ? 'Nạp Bản Lưu' : 'Load Game'}</span>
            </button>

            {/* 3. Return to Main Menu */}
            <button
              onClick={onReturnToMainMenu}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4 text-zinc-400" />
              <span>{isVi ? 'Về Menu Chính' : 'Main Menu'}</span>
            </button>
          </div>

          {/* 4. Restart Campaign (with Confirmation) */}
          <button
            onClick={() => setShowRestartConfirm(true)}
            className="w-full py-2 px-3 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Bắt Đầu Lại Chiến Dịch Mới...' : 'Restart Fresh Campaign...'}</span>
          </button>
        </div>

        {/* Confirmation Modal for Restart Campaign */}
        {showRestartConfirm && (
          <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 z-20 animate-in fade-in duration-150">
            <div className="space-y-4 text-center max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/60 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
                  {isVi ? 'Xác Nhận Bắt Đầu Lại' : 'Confirm Campaign Restart'}
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {isVi
                    ? 'Bạn có chắc chắn muốn bỏ lại chuyến tàu hiện tại và bắt đầu lại từ đầu tại Kho Ga Sector 07? Tiến trình chưa lưu trong phiên này sẽ được đặt lại.'
                    : 'Are you sure you want to discard unsaved progress and restart from Sector 07? Your campaign slots remain untouched.'}
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowRestartConfirm(false)}
                  className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Hủy Bỏ' : 'Cancel'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowRestartConfirm(false);
                    onRestartCampaign();
                  }}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-colors shadow-lg shadow-red-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Xác Nhận' : 'Restart'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
