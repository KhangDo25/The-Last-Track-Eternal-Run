import React from 'react';
import {
  X,
  Compass,
  Zap,
  Flame,
  Shield,
  Activity,
  Box,
  Wrench,
  Radio,
  Crosshair,
  Volume2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { GameEngine } from '../game/gameEngine';
import { Language } from '../i18n/translations';

interface HelpControlsModalProps {
  engine: GameEngine;
  language: Language;
  onClose: () => void;
}

export const HelpControlsModal: React.FC<HelpControlsModalProps> = ({
  engine,
  language,
  onClose,
}) => {
  const isVi = language === 'vi';
  const pStep = engine.prologue.isActive ? engine.prologue.step : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 tracking-wide font-mono">
                {isVi ? 'HƯỚNG DẪN ĐIỀU KHIỂN & SINH TỒN' : 'CONTROLS & SURVIVAL GUIDE'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isVi ? 'Phím tắt thao tác & chỉ dẫn mục tiêu hiện tại' : 'Control scheme & current objective guidance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Đóng [ESC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
          {/* Active Campaign Step Callout */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                {isVi ? 'Mục Tiêu Hiện Tại' : 'Active Objective'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                {engine.currentChapter}
              </span>
            </div>

            <div className="text-sm font-semibold text-zinc-100">
              {engine.prologue.isActive ? (
                pStep === 'intro_cutscene' ? (
                  isVi ? 'Mở đầu: Đọc ghi chú và quan sát kho ga phế tích.' : 'Prologue: Read note and inspect depot.'
                ) : pStep === 'radio_message' ? (
                  isVi ? 'Bước 1: Đi về phía bên phải sân ga, tiếp cận đài radio và nhấn [E] để dò tần số khẩn cấp.' : 'Step 1: Move right onto the platform, approach the radio, and press [E] to tune into emergency frequency.'
                ) : pStep === 'scavenge_resources' ? (
                  isVi ? 'Bước 2: Di chuyển dọc sân ga, nhấn [E] tại các thùng hàng để hút 1 can Nhiên Liệu (+25L) và nhặt 15 Phế Liệu.' : 'Step 2: Walk along platform, press [E] at caches to siphon 1 Fuel Canister (+25L) and gather 15 Scrap.'
                ) : pStep === 'repair_engine' ? (
                  isVi ? 'Bước 3: Tiếp cận thân đầu máy xe lửa bên trái, nhấn [E] để hàn kín ống hơi bị nứt vỡ.' : 'Step 3: Approach locomotive boiler on the left, press [E] to weld fractured steam pipe.'
                ) : pStep === 'raider_ambush' ? (
                  isVi ? 'Bước 4: Bọn cướp phục kích! Nhấn chuột trái để bắn trả hoặc leo lên tháp súng toa hành khách để phòng thủ.' : 'Step 4: Raider ambush! Click left mouse to fire or mount passenger carriage defense turret.'
                ) : (
                  isVi ? 'Bước 5: Vào buồng lái đầu máy, nhấn [E] kéo cần ga để bắt đầu hành trình đến Tiền Đồn Haven.' : 'Step 5: Enter locomotive cabin, press [E] to throttle up and drive toward Haven Outpost.'
                )
              ) : engine.chapter1?.isActive ? (
                !engine.chapter1.log1Discovered ? (
                  isVi ? 'Chương I: Dò tìm bản ghi âm TS. Voss tại vùng tro tàn (Km 3.6).' : 'Chapter I: Search for Dr. Voss audio log in the ash zone (Km 3.6).'
                ) : !engine.chapter1.maraDistressHeard ? (
                  isVi ? 'Bắt sóng tín hiệu cứu hộ khẩn cấp từ Mara Cole (Km 4.6).' : 'Intercept emergency distress call from Mara Cole (Km 4.6).'
                ) : !engine.chapter1.roadblockDefeated ? (
                  isVi ? 'Tiêu diệt Xe Tải Bọc Thép Bọn Cướp chặn đường ray!' : 'Destroy Armored Raider Roadblock Truck blocking the track!'
                ) : !engine.chapter1.maraRecruited ? (
                  isVi ? 'Giải cứu và chiêu mộ Mara Cole tại tháp bẻ ghi đường sắt [E].' : 'Rescue and recruit Mara Cole at railway switch tower [E].'
                ) : (
                  isVi ? 'Lái tàu cập bến an toàn tại Tiền Đồn 42 để kết thúc Chương I.' : 'Pilot train safely into Outpost 42 to conclude Chapter I.'
                )
              ) : (
                isVi ? 'Vận hành đoàn tàu, thu gom phế liệu tại các ga bỏ hoang và duy trì chỉ số sinh tồn.' : 'Operate train, scavenge abandoned stations, and maintain survivor vitals.'
              )}
            </div>
          </div>

          {/* Keybinds Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {isVi ? 'Phím Thao Tác Cơ Bản' : 'Basic Controls'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Di chuyển nhân vật' : 'Movement'}</span>
                <span className="font-mono font-bold text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  W A S D / ↑ ← ↓ →
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Chạy nhanh' : 'Sprint'}</span>
                <span className="font-mono font-bold text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  Shift
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Tương tác / Nhặt đồ / Sửa chữa' : 'Interact / Scavenge / Repair'}</span>
                <span className="font-mono font-bold text-cyan-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  E
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Bắn súng phòng thủ' : 'Fire Defense Weapon'}</span>
                <span className="font-mono font-bold text-red-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  {isVi ? 'Chuột Trái' : 'Left Click'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Còi hơi tàu / Mở hướng dẫn' : 'Train Horn / Help'}</span>
                <span className="font-mono font-bold text-emerald-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  H
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{isVi ? 'Tạm dừng / Mở Menu' : 'Pause / Open Menu'}</span>
                <span className="font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                  ESC / P
                </span>
              </div>
            </div>
          </div>

          {/* Survival Mechanics Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {isVi ? 'Quy Tắc Sinh Tồn Cốt Lõi' : 'Core Survival Rules'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chỉ Số Sinh Tồn' : 'Survivor Vitals'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {isVi
                    ? 'Đói và khát giảm liên tục theo thời gian. Mở kho hoặc lục lọi để ăn lương khô và uống nước trước khi tụt máu.'
                    : 'Hunger and thirst deplete over time. Consume rations and water from storage before taking damage.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold font-mono">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Nhiên Liệu Đầu Máy' : 'Train Fuel'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {isVi
                    ? 'Chạy tốc độ cao tiêu hao nhiên liệu nhanh. Hãy giữ mức ga hợp lý (40-60%) để tiết kiệm nhiên liệu vượt bão tuyết.'
                    : 'Higher throttle burns fuel faster. Maintain moderate speed (40-60%) to conserve fuel across blizzards.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Bảo Trì Thân Tàu' : 'Hull Integrity'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {isVi
                    ? 'Quái vật và chướng ngại vật làm hao mòn thân tàu. Dùng phế liệu kim loại tại Bàn Chế Tạo [E] để sửa chữa.'
                    : 'Hostiles and debris damage carriages. Use scrap metal at the Workbench [E] to repair damaged sections.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/30">
          <span className="text-[11px] text-zinc-500 font-mono">
            {isVi ? 'Nhấn [H] hoặc [ESC] bất cứ lúc nào để đóng' : 'Press [H] or [ESC] at any time to close'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition-colors cursor-pointer"
          >
            {isVi ? 'Đã Hiểu / Trở Lại Trò Chơi' : 'Got It / Resume Game'}
          </button>
        </div>
      </div>
    </div>
  );
};
