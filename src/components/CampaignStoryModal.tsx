import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Language } from '../i18n/translations';
import {
  Radio,
  Flame,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Play,
  Volume2,
  RotateCcw,
  Users,
  CheckCircle2,
  FileText,
  Sparkles,
  Shield,
  Zap,
  Disc,
  Crosshair,
  MapPin,
  X,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface CampaignStoryModalProps {
  engine: GameEngine;
  language: Language;
  onClose: () => void;
  onOpenStoryLog?: () => void;
}

export const CampaignStoryModal: React.FC<CampaignStoryModalProps> = ({
  engine,
  language,
  onClose,
  onOpenStoryLog,
}) => {
  const isVi = language === 'vi';
  const pState = engine.prologue;
  const ch1State = engine.chapter1;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // ----------------------------------------------------
  // PROLOGUE STEP 1: OPENING CUTSCENE
  // ----------------------------------------------------
  if (pState.isActive && pState.step === 'intro_cutscene') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-500">
        <div className="bg-zinc-950 border-2 border-amber-600/70 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(217,119,6,0.3)] space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold block">
                {isVi ? 'PHẦN MỞ ĐẦU · HAI TOA TÀU VÀ CƠ HỘI CUỐI CÙNG' : 'PROLOGUE · TWO CARRIAGES AND ONE LAST CHANCE'}
              </span>
              <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'TỈNH LẠI GIỮA ĐỐNG PHẾ TÍCH GA ASHFALL' : 'AWAKENING AT ASHFALL FREIGHT DEPOT'}
              </h2>
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80">
            <p className="text-zinc-400 italic">
              {isVi
                ? 'Năm năm sau Đại Sụp Đổ (The Great Collapse). Thí nghiệm năng lượng Eternal Core tại Terminal Zero thất bại đã biến lục địa thành một vùng đất hoang tàn ngập trong băng giá vĩnh cửu.'
                : 'Five years after the Great Collapse. The catastrophic core failure at Terminal Zero shattered the continent into an eternal frozen wasteland.'}
            </p>
            <p>
              {isVi
                ? 'Bạn là Elias Voss, cựu kỹ sư bảo trì đường sắt của Tuyến Vành Đai Phương Bắc, con trai của TS. Adrian Voss. Bạn tỉnh dậy lạnh cóng trên nền bê tông nứt toác của Kho Ga Số 07.'
                : 'You are Elias Voss, a former railway maintenance engineer and son of Dr. Adrian Voss. You awaken shivering on the cracked floor of Ruined Freight Depot #07.'}
            </p>
            <p>
              {isVi
                ? 'Trước mắt bạn là một đầu máy Shunter #04 cũ kỹ đang rò rỉ áp suất ống hơi, nối với ĐÚNG MỘT toa hành khách bằng gỗ thô sơ. Nhiên liệu cạn kiệt, chỉ còn vài công cụ sửa chữa.'
                : 'Before you stands Shunter #04 with a fractured steam pipe, coupled to EXACTLY ONE ordinary passenger carriage. Fuel is nearly empty, with only basic tools remaining.'}
            </p>
            <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-lg text-amber-300 text-[11px] flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                {isVi
                  ? 'Bàn điều khiển radio sân ga phía trước đột ngột phát ra tiếng rè khẩn cấp...'
                  : 'The radio terminal on the depot platform suddenly crackles to life...'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                engine.advancePrologueCutscene();
              }}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 cursor-pointer"
            >
              <span>{isVi ? 'ĐỨNG DẬY & BẬT ĐÀI RADIO' : 'STAND UP & TUNE RADIO'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PROLOGUE STEP 2: RADIO MESSAGE
  // ----------------------------------------------------
  if (pState.isActive && pState.step === 'radio_message') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-2 border-cyan-500/70 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {isVi ? 'TẦN SỐ KHẨN CẤP ĐƯỜNG SẮT PHƯƠNG BẮC · 142.8 MHZ' : 'NORTHERN RAILWAY EMERGENCY FREQ · 142.8 MHZ'}
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                  {isVi ? 'BẢN TIN PHÁT THANH: BÍ ẨN TERMINAL ZERO' : 'RADIO BROADCAST: MYSTERY OF TERMINAL ZERO'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => soundManager.playAlarm()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-lg text-zinc-400 hover:text-cyan-300 transition-colors"
              title="Test Frequency Alarm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Radio Waveform */}
          <div className="h-10 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-center gap-1 px-4">
            {[4, 12, 24, 8, 30, 16, 28, 36, 18, 12, 32, 22, 10, 26, 14, 8, 20, 34, 16, 8].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-cyan-400/80 rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                }}
              />
            ))}
          </div>

          {/* Broadcast Content */}
          <div className="space-y-3.5 text-xs bg-zinc-900/70 p-5 rounded-xl border border-zinc-800/90 text-cyan-100/90 font-mono leading-relaxed">
            <p className="text-zinc-400 italic">
              {isVi ? '"...[TẠP ÂM RÈ RÈ VÀ TIẾNG GIÓ GẦO THÉT]..."' : '"...[STATIC NOISE AND HOWLING BLIZZARD WINDS]..."'}
            </p>
            <p className="text-cyan-300 font-bold">
              {isVi
                ? '"...Gửi bất kỳ ai còn sống sót trên tuyến đường sắt phương Bắc... Đây là Terminal Zero... Nhắc lại, lò phản ứng địa nhiệt trung tâm vẫn hoạt động... Chúng tôi có điện nhiệt và nước lọc..."'
                : '"...Calling any survivors along the Northern Rail Corridor... This is Terminal Zero... Repeat, the geothermal reactor at Terminal Zero remains alive... We have heat, power, and water..."'}
            </p>
            <p>
              {isVi
                ? '"...Nếu có phương tiện đường sắt bọc thép, hãy men theo tuyến chính tiến về Hướng Bắc... Cảnh giác các toán cướp phế liệu... Terminal Zero vẫn đang truyền tín hiệu..."'
                : '"...If you pilot an armored train, follow the main trunk line Northbound... Terminal Zero is still transmitting..."'}
            </p>
          </div>

          {/* Elias monologue */}
          <div className="bg-amber-950/20 border border-amber-600/30 p-3.5 rounded-xl text-xs text-amber-200">
            <span className="font-bold text-amber-400 block mb-1">
              {isVi ? 'Elias Voss tự nhủ:' : 'Elias Voss murmurs:'}
            </span>
            <p>
              {isVi
                ? 'Terminal Zero... Nếu cha mình còn ở đó, mình phải đến được đó. Nhưng đầu máy đang hỏng ống hơi và cạn sạch dầu. Mình phải thu gom phế liệu, hàn ống rồi nạp nhiên liệu để rời kho ga!'
                : 'Terminal Zero... If my father survived, he is there. But this locomotive has a ruptured steam pipe and no fuel. I must scavenge supplies and weld the boiler before the blizzard traps me.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                engine.readRadioTransmission();
                onClose();
              }}
              className="px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center gap-2 cursor-pointer"
            >
              <span>{isVi ? 'BẮT ĐẦU TÌM KIẾM NHIÊN LIỆU & PHẾ LIỆU' : 'BEGIN SCAVENGING SUPPLIES'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PROLOGUE STEP 3: ARRIVAL AT HAVEN (COMPLETION)
  // ----------------------------------------------------
  if (pState.isActive && pState.step === 'prologue_complete') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-500">
        <div className="bg-zinc-950 border-2 border-emerald-500/70 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(16,185,129,0.35)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <span className="text-2xl font-bold">★</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold block">
                {isVi ? 'HOÀN THÀNH PHẦN MỞ ĐẦU · ĐẾN TIỀN ĐỒN HAVEN' : 'PROLOGUE ACCOMPLISHED · ARRIVAL AT HAVEN'}
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'CẬP BẾN TIỀN ĐỒN HAVEN AN TOÀN' : 'SAFE ARRIVAL AT HAVEN OUTPOST'}
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80">
            <p>
              {isVi
                ? 'Đầu máy Shunter #04 kéo toa hành khách trượt bánh chầm chậm rồi dừng lại dưới ánh đèn pha quét của Tiền Đồn Haven. Tiếng còi hơi vang vọng trong gió tuyết, báo hiệu một đoàn tàu đã sống sót.'
                : 'Shunter #04 and its lone passenger carriage hiss to a halt under the sweeping arc-lights of Haven Outpost. The steam whistle cuts through the blizzard, announcing a surviving locomotive.'}
            </p>
            <p>
              {isVi
                ? 'Lực lượng phòng vệ tiền đồn tiếp tế cho bạn thêm phế liệu và nhiên liệu. Nhưng nguy hiểm chỉ mới bắt đầu: Tuyến đường phía Bắc dẫn tới Tiền Đồn 42 đang bị bọn cướp phong tỏa!'
                : 'The outpost defenders resupply you with scrap and fuel. But the northern route to Outpost 42 is barricaded by heavily armored raiders.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                engine.setupPrologue();
              }}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isVi ? 'CHƠI LẠI MỞ ĐẦU' : 'REPLAY PROLOGUE'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                engine.completePrologue();
                onClose();
              }}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>{isVi ? 'BẮT ĐẦU CHƯƠNG I: THE LAST DEPARTURE' : 'BEGIN CHAPTER I: THE LAST DEPARTURE'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHAPTER I: DISCOVERY 1 - DR. ADRIAN VOSS AUDIO LOG #12
  // ----------------------------------------------------
  if (ch1State.isActive && ch1State.activeStoryModal === 'log1_modal') {
    const log = engine.audioLogs.find((l) => l.id === 'log_01');

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-2 border-amber-500/80 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] space-y-6 relative overflow-hidden">
          {/* Cassette Tape Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin" style={{ animationDuration: '8s' }}>
                <Disc className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {isVi ? 'PHÁT HIỆN HỘP DỮ LIỆU ĐƯỜNG RAY · SECTOR 07' : 'RAILWAY DATA RELAY DISCOVERED · SECTOR 07'}
                </span>
                <h2 className="text-lg font-extrabold text-zinc-100 tracking-tight">
                  {log ? log.title : 'Dr. Voss Memo #12'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => {
                setIsPlayingAudio(!isPlayingAudio);
                soundManager.playClick();
              }}
              className="p-2 bg-zinc-900 border border-amber-500/40 rounded-lg text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isPlayingAudio ? (isVi ? 'Đang Phát' : 'Playing') : (isVi ? 'Nghe Lại' : 'Play Tone')}</span>
            </button>
          </div>

          {/* Cassette Tape Visualizer */}
          <div className="bg-zinc-900/90 rounded-xl p-4 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400/60 border-dashed animate-spin" style={{ animationDuration: '4s' }} />
              <div>
                <div className="text-xs font-bold text-zinc-200">{log?.speaker}</div>
                <div className="text-[10px] text-zinc-500">{log?.date} · {log?.location}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {[8, 16, 28, 14, 32, 22, 10, 24, 18, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-amber-400/80 rounded-full animate-pulse"
                  style={{ height: `${h}px`, animationDuration: `${0.3 + (i % 4) * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-mono space-y-3">
            <p className="text-amber-300 italic font-semibold">
              {log?.transcript}
            </p>
            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
              <strong className="text-zinc-200">{isVi ? 'Elias Voss ghi chú:' : 'Elias Voss notes:'}</strong>{' '}
              {isVi
                ? 'Cha tôi đã cảnh báo ban giám đốc Helix Dynamics trước khi thảm họa xảy ra. Đường ray sắt này chính là dây dẫn phát tán năng lượng độc hại của Eternal Core. Mình phải tiếp tục đi theo tuyến này để tìm ông.'
                : 'My father tried to stop Helix before the core melted down. The railway network itself acts as a massive energetic conductor for the Core. I must keep tracking his path.'}
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                engine.closeStoryDialogue();
                onClose();
              }}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 cursor-pointer"
            >
              <span>{isVi ? 'LƯU VÀO SỔ TAY & TIẾP TỤC HÀNH TRÌNH' : 'SAVE TO JOURNAL & PROCEED'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHAPTER I: MARA COLE DISTRESS CALL
  // ----------------------------------------------------
  if (ch1State.isActive && ch1State.activeStoryModal === 'mara_distress_modal') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-2 border-red-500/80 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(239,68,68,0.35)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                {isVi ? 'TÍN HIỆU CẦU CỨU KHẨN CẤP · KM 5.4' : 'EMERGENCY DISTRESS SOS · KM 5.4'}
              </span>
              <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'MARA COLE BỊ PHỤC KÍCH TẠI HỘP TÍN HIỆU' : 'MARA COLE PINNED AT SIGNAL TOWER'}
              </h2>
            </div>
          </div>

          {/* Distress Dialogue */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-3.5 text-xs text-zinc-300 font-mono leading-relaxed">
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
                M
              </div>
              <span className="text-cyan-400 font-bold">{isVi ? 'Mara Cole (Thợ Cơ Khí Quân Sự):' : 'Mara Cole (Combat Engineer):'}</span>
            </div>
            <p className="text-red-300 font-bold">
              {isVi
                ? '"...Mayday! Có đoàn tàu nào trên tuyến chính nghe thấy không?! Bọn cướp đã kéo một Xe Tải Bọc Thép chắn ngang ray tại Km 5.5! Tôi bị ghim chặt trong tháp bẻ ghi!"'
                : '"...Mayday! Any convoy on the main rail line hear this?! An armored raider roadblock truck has barricaded the rails at Km 5.5! I am pinned down in the signal switchbox!"'}
            </p>
            <p>
              {isVi
                ? '"...Chúng có giáp thép hàn dày và súng tự chế. Nếu bạn có súng tháp pháo, hãy tông thẳng và bắn nổ khối động cơ của chúng! Nhanh lên, cửa sắt của tôi sắp sập rồi!"'
                : '"...They have thick welded steel armor. Man your turret and blow their engine block apart before they breach my door!"'}
            </p>
          </div>

          <div className="p-3.5 bg-amber-950/20 border border-amber-600/30 rounded-xl text-amber-200 text-xs flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-amber-400 block">{isVi ? 'MỤC TIÊU CHIẾN ĐẤU:' : 'COMBAT OBJECTIVE:'}</strong>
              <span>
                {isVi
                  ? 'Leo lên súng phòng thủ toa tàu [E], ngắm bắn và tiêu diệt Xe Tải Bọc Thép Bọn Cướp (180 HP) để giải cứu Mara Cole!'
                  : 'Mount the train turret [E], aim and destroy the Armored Raider Roadblock Truck (180 HP) to rescue Mara Cole!'}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundManager.playAlarm();
                engine.closeStoryDialogue();
                onClose();
              }}
              className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <span>{isVi ? 'VÀO VỊ TRÍ CHIẾN ĐẤU & PHÁ RÀO CHẮN' : 'MAN TURRET & ENGAGE ROADBLOCK'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHAPTER I: MARA RESCUE & SURVIVAL DECISION
  // ----------------------------------------------------
  if (ch1State.isActive && ch1State.activeStoryModal === 'mara_rescue_modal') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(6,182,212,0.35)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold block">
                {isVi ? 'GẶP GỠ ĐỒNG ĐỘI MỚI · MARA COLE' : 'NEW COMPANION ENCOUNTER · MARA COLE'}
              </span>
              <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'GIẢI CỨU TẠI THÁP BẺ GHI ĐƯỜNG RAY' : 'RESCUE AT THE RAILWAY SWITCHING TOWER'}
              </h2>
            </div>
          </div>

          {/* Dialogue */}
          <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed bg-zinc-900/70 p-5 rounded-xl border border-zinc-800">
            <div className="space-y-2">
              <p className="text-cyan-300 font-bold">
                {isVi
                  ? 'Mara Cole: "Bắn chuẩn lắm, kỹ sư! Chiếc xe tải phế liệu đó đã ghim tôi lại đây hai ngày nay. Tôi là Mara Cole, cựu cơ khí pháo thủ quân sự. Những người sống sót tại Tiền Đồn 42 cử tôi đi tìm phụ tùng, nhưng máy phát điện của họ sắp chết vì cạn dầu."'
                  : 'Mara Cole: "Sharp shooting, engineer! That scrap truck had me pinned behind this tower for two days. I am Mara Cole, military combat engineer. The families at Outpost 42 sent me for parts, but their backup generator is failing without fuel."'}
              </p>
              <p className="text-amber-300 font-bold">
                {isVi
                  ? 'Elias Voss: "Tôi là Elias Voss. Chúng tôi có đầu máy đang chạy, nhưng từng lít dầu ở vùng đất băng giá này đều là sinh mạng."'
                  : 'Elias Voss: "I am Elias Voss. We have an operational locomotive, but every liter of fuel out here keeps our boiler alive."'}
              </p>
              <p>
                {isVi
                  ? 'Mara Cole: "Năm mươi gia đình ở Tiền Đồn 42 đang rét cóng. Nếu anh chia sẻ 20L dầu máy, họ sẽ bù đắp bằng thép đặc chế và linh kiện điện tử. Hoặc anh có thể giữ lại dầu cho đầu máy. Dù anh chọn gì, tôi cũng sẽ gia nhập đoàn tàu của anh—tôi biết cách hàn giáp thép và gắn toa xưởng cơ khí!"'
                  : 'Mara Cole: "Fifty families are freezing at Outpost 42. If you share 20L of fuel, they will give us refined steel and electronics. Or you can conserve it for the engine. Either way, I am joining your crew—I know how to reinforce armor and couple a proper workshop carriage!"'}
              </p>
            </div>
          </div>

          {/* The Meaningful Decision */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
              {isVi ? 'QUYẾT ĐỊNH CỦA BẠN (LỰA CHỌN CỐT TRUYỆN QUAN TRỌNG):' : 'YOUR DECISION (CRUCIAL STORY CHOICE):'}
            </span>

            <div className="grid grid-cols-2 gap-4">
              {/* Choice A: Share Fuel */}
              <button
                onClick={() => {
                  soundManager.playLootSound();
                  engine.makeChapter1Decision('share_fuel');
                  onClose();
                }}
                className="p-4 rounded-xl border-2 border-emerald-500/60 bg-emerald-950/30 hover:bg-emerald-950/60 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-300 group-hover:text-emerald-200">
                    {isVi ? '1. Chia Sẻ 20L Nhiên Liệu' : '1. Share 20L Fuel'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {isVi ? 'Được Lòng Mara' : '+Loyalty'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {isVi
                    ? 'Cứu máy sưởi Tiền Đồn 42. Tiêu hao 20L dầu, nhận +20 Thép Tinh Luyện & +12 Linh Kiện. Mara trung thành +25.'
                    : 'Rescue Outpost 42 heat. Costs 20L fuel, grants +20 Refined Steel & +12 Electronics. Mara loyalty +25.'}
                </p>
              </button>

              {/* Choice B: Conserve Fuel */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  engine.makeChapter1Decision('conserve_fuel');
                  onClose();
                }}
                className="p-4 rounded-xl border-2 border-amber-500/60 bg-amber-950/30 hover:bg-amber-950/60 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-300 group-hover:text-amber-200">
                    {isVi ? '2. Bảo Toàn Nhiên Liệu' : '2. Conserve Fuel'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    {isVi ? 'Thực Dụng' : 'Safe Engine'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {isVi
                    ? 'Ưu tiên giữ bình dầu đầu máy (+15L dự trữ) để phòng bão tuyết. Mara tôn trọng tính thực dụng (+10).'
                    : 'Prioritize locomotive reserves (+15L fuel preserved) for severe storms. Mara respects pragmatism (+10).'}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHAPTER I: COMPLETION & PREVIEW OF CHAPTER II
  // ----------------------------------------------------
  if (ch1State.isActive && ch1State.activeStoryModal === 'chapter1_complete_modal') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-500">
        <div className="bg-zinc-950 border-2 border-emerald-500/80 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_60px_rgba(16,185,129,0.35)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold block">
                {isVi ? 'HOÀN THÀNH CHƯƠNG I: THE LAST DEPARTURE' : 'CHAPTER I COMPLETE: THE LAST DEPARTURE'}
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'CẬP BẾN TIỀN ĐỒN 42 & KẾT NỐI TOA XƯỞNG' : 'OUTPOST 42 SECURED & WORKSHOP COUPLED'}
              </h2>
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80">
            <p>
              {isVi
                ? 'Đoàn tàu sắt của Elias Voss cùng người đồng đội mới Mara Cole đã vượt qua vùng ngoại ô tro tàn, đập tan chốt chặn của bọn cướp và cập bến Tiền Đồn 42 an toàn!'
                : 'Elias Voss and newly recruited mechanic Mara Cole have traversed the ash outskirts, crushed the raider blockade, and successfully docked at Outpost 42!'}
            </p>
            <p className="text-emerald-300 font-bold">
              {isVi
                ? 'Mara Cole đã hoàn tất việc gắn Toa Xưởng Kỹ Thuật (Workshop Carriage) vào sau đoàn tàu, cho phép chế tạo giáp bảo vệ, nâng cấp pháo Gatling Mk2 và bảo dưỡng áp suất lò hơi.'
                : 'Mara Cole has coupled the Workshop Carriage to your train, unlocking heavy steel armor fabrication, Gatling Mk2 autocannon upgrades, and boiler maintenance.'}
            </p>
            <div className="p-3.5 bg-zinc-900 border border-zinc-700/80 rounded-xl space-y-1.5 text-zinc-300">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                {isVi ? 'PHẦN THƯỞNG HOÀN THÀNH CHƯƠNG I:' : 'CHAPTER I REWARDS EARNED:'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-amber-400">
                <span>+ Toa Xưởng Cơ Khí (Workshop Car)</span>
                <span>+ Tuyển Mộ Mara Cole (Thợ Pháo Thủ)</span>
                <span>+50 Phế Liệu Sắt & +20 Thép Tinh Luyện</span>
                <span>+100 Viên Đạn 7.62mm & +30L Dầu</span>
              </div>
            </div>
          </div>

          {/* Chapter II Teaser */}
          <div className="p-4 bg-amber-950/20 border border-amber-600/30 rounded-xl space-y-1 text-xs">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">
              {isVi ? 'TIẾP THEO: CHƯƠNG II: SCRAP AND STEEL' : 'NEXT: CHAPTER II: SCRAP AND STEEL'}
            </span>
            <p className="text-zinc-300">
              {isVi
                ? 'Tuyến đường sắt tiến vào Bãi Phế Liệu Đại Lục hoang tàn, nơi Foreman Darius Thorne đang nắm giữ bí mật chế tạo Toa Chứa Hàng và cỗ máy chiến tranh cổ đại The Iron Warden đang thức giấc...'
                : 'The rails lead into the Continental Iron Scrapyards, where Foreman Darius Thorne holds cargo carriage blueprints and the ancient rogue walker The Iron Warden awaits...'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            {onOpenStoryLog && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  engine.completeChapter1();
                  onClose();
                  onOpenStoryLog();
                }}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>{isVi ? 'XEM NHẬT KÝ CHIẾN DỊCH' : 'VIEW STORY LOG'}</span>
              </button>
            )}

            <button
              onClick={() => {
                soundManager.playClick();
                engine.completeChapter1();
                onClose();
              }}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer ml-auto"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>{isVi ? 'TIẾP TỤC HÀNH TRÌNH ĐẠI LỤC' : 'CONTINUE TO CHAPTER II'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
