import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { Language } from '../i18n/translations';
import { Radio, Flame, Wrench, ShieldAlert, ArrowRight, Play, Volume2, RotateCcw } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PrologueStoryModalProps {
  engine: GameEngine;
  language: Language;
  onClose: () => void;
}

export const PrologueStoryModal: React.FC<PrologueStoryModalProps> = ({
  engine,
  language,
  onClose,
}) => {
  const pState = engine.prologue;
  const isVi = language === 'vi';

  // 1. OPENING SEQUENCE: INTRODUCING THE RUINED WORLD & ELIAS VOSS
  if (pState.step === 'intro_cutscene') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-500">
        <div className="bg-zinc-950 border-2 border-amber-600/60 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(217,119,6,0.25)] space-y-6 relative overflow-hidden">
          {/* Scanline CRT overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold block">
                {isVi ? 'PHẦN 1: MỞ ĐẦU · CHUYẾN RỜI ĐI CUỐI CÙNG' : 'PHASE 1: PROLOGUE · THE LAST DEPARTURE'}
              </span>
              <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'TỈNH DẬY TẠI KHO GA ASHFALL' : 'AWAKENING AT ASHFALL DEPOT'}
              </h2>
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80">
            <p className="text-zinc-400 italic">
              {isVi
                ? 'Năm năm sau Đại Thảm Họa (The Great Collapse). Một thử nghiệm năng lượng thất bại đã phá hủy hoàn toàn nền văn minh, biến lục địa thành một vùng đất hoang tàn băng giá vĩnh cửu.'
                : 'Five years after the Great Collapse. A failed planetary energy experiment shattered civilization, plunging the continent into an eternal arctic ruin.'}
            </p>
            <p>
              {isVi
                ? 'Bạn là Elias Voss, cựu kỹ sư bảo trì đường sắt của Tuyến Vành Đai Phương Bắc. Bạn tỉnh dậy lạnh cóng trên sàn bê tông của Kho Ga Đầu Máy Số 07 bị bỏ hoang.'
                : 'You are Elias Voss, a former railway maintenance engineer. You regain consciousness shivering on the cracked concrete floor of Abandoned Railway Depot #07.'}
            </p>
            <p>
              {isVi
                ? 'Bên cạnh bạn là một chiếc đầu máy hơi nước cũ kỹ đang rò rỉ ống áp suất, nối với đúng MỘT toa hành khách bằng gỗ thô sơ. Nhiên liệu cạn kiệt, chỉ còn vài dụng cụ cơ bản.'
                : 'Before you stands a battered steam shunter with a leaking steam manifold, coupled to exactly ONE wooden passenger carriage. Fuel is nearly dry, with only rudimentary tools remaining.'}
            </p>
            <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-lg text-amber-300 text-[11px] flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                {isVi
                  ? 'Một tiếng rè radio khẩn cấp đột ngột phát ra từ bàn điều khiển sân ga phía trước...'
                  : 'An old transistor radio receiver suddenly crackles to life on the depot platform...'}
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                engine.advancePrologueCutscene();
              }}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 cursor-pointer"
            >
              <span>{isVi ? 'ĐỨNG DẬY & KIỂM TRA RADIO' : 'STAND UP & CHECK RADIO'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. RADIO MESSAGE: ESTABLISHING TERMINAL ZERO
  if (pState.step === 'radio_message') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-300">
        <div className="bg-zinc-950 border-2 border-cyan-500/60 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {isVi ? 'TẦN SỐ KHẨN CẤP ĐƯỜNG SẮT PHƯƠNG BẮC · 142.8 MHZ' : 'NORTHERN LINE EMERGENCY BROADCAST · 142.8 MHZ'}
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                  {isVi ? 'BẢN TIN BÍ ẨN VỀ TERMINAL ZERO' : 'THE MYSTERY OF TERMINAL ZERO'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => soundManager.playAlarm()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-lg text-zinc-400 hover:text-cyan-300 transition-colors"
              title="Replay Static Tone"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Radio Audio Waveform representation */}
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
              "...[TIẾNG RÈ TĨNH ĐIỆN VÀ TIẾNG GIÓ RÍT]..."
            </p>
            <p className="text-cyan-300 font-bold">
              {isVi
                ? '"...Gọi mọi người sống sót dọc theo Tuyến Đường Sắt Phương Bắc... Đây là Terminal Zero... Nhắc lại, lò phản ứng địa nhiệt tại Ga Số Không vẫn hoạt động... Chúng tôi có điện nhiệt và nước lọc..."'
                : '"...Calling any survivors along the Northern Rail Corridor... This is Terminal Zero... Repeat, the deep geothermal core at Terminal Zero remains intact... We have heat, power, and clean water..."'}
            </p>
            <p>
              {isVi
                ? '"...Nếu có phương tiện đường sắt bọc thép, hãy men theo tuyến chính đi về Hướng Bắc... Cảnh giác các toán cướp phế liệu... Terminal Zero vẫn tồn tại... [RÈ RÈ MẤT TÍN HIỆU]..."'
                : '"...If you have rail transport, head North along the main trunk line... Beware of scavenger raiding parties... Terminal Zero still stands... [STATIC FADES]..."'}
            </p>
          </div>

          {/* Elias reaction */}
          <div className="bg-amber-950/20 border border-amber-600/30 p-3.5 rounded-xl text-xs text-amber-200">
            <span className="font-bold text-amber-400 block mb-1">
              {isVi ? 'Elias Voss tự nhủ:' : 'Elias Voss murmurs:'}
            </span>
            <p>
              {isVi
                ? 'Terminal Zero... Trạm ga trung tâm ngầm trong truyền thuyết. Nếu nó còn hoạt động, đó là cơ hội sống sót duy nhất. Nhưng chiếc đầu máy này đang rò rỉ ống hơi và cạn sạch dầu. Mình phải thu gom nhiên liệu, phế liệu hàn ống, rồi tiến về Tiền Đồn Haven gần đây.'
                : 'Terminal Zero... The subterranean railway hub. If it survived, it is our only refuge. But this shunter has a fractured steam pipe and empty fuel tanks. I must scavenge supplies, seal the boiler, and make for nearby Haven Outpost.'}
            </p>
          </div>

          {/* Action button */}
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

  // 8. ENDING SEQUENCE: REACHING HAVEN SURVIVOR SETTLEMENT
  if (pState.step === 'prologue_complete') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono select-none animate-in fade-in duration-500">
        <div className="bg-zinc-950 border-2 border-emerald-500/60 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <span className="text-2xl font-bold">★</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold block">
                {isVi ? 'HOÀN THÀNH PHẦN 1 · PROLOGUE THÀNH CÔNG' : 'PHASE 1 COMPLETE · PROLOGUE ACCOMPLISHED'}
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                {isVi ? 'ĐẾN TIỀN ĐỒN SINH TỒN HAVEN' : 'ARRIVAL AT HAVEN OUTPOST'}
              </h2>
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80">
            <p>
              {isVi
                ? 'Chiếc đầu máy số 04 kéo toa hành khách trượt bánh chầm chậm rồi dừng hẳn dưới ánh đèn pha quét rực rỡ của Tiền Đồn Haven. Những tay súng phòng thủ trên tháp canh hạ nòng súng khi nhận ra tiếng còi hơi của một đoàn tàu.'
                : 'Shunter #04 and its lone passenger carriage slide to a halt under the sweeping arc-lights of Haven Outpost. Watchtower guards lower their rifles as they hear the rhythmic hiss of a living locomotive.'}
            </p>
            <p>
              {isVi
                ? 'Lần đầu tiên sau nhiều năm, bạn ngửi thấy mùi củi cháy và nghe thấy giọng nói của đồng loại. Bạn đã sống sót rời khỏi kho ga hoang tàn, đẩy lùi toán cướp phế liệu và bảo toàn cỗ máy của mình.'
                : 'For the first time in years, Elias smells woodsmoke and hears voices that are not screaming. You survived the frozen depot, repelled the rust raiders, and kept your machine intact.'}
            </p>
            <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-cyan-200 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
                <Radio className="w-4 h-4" />
                <span>{isVi ? 'BẢN TIN PHÁT LẠI TỪ TERMINAL ZERO:' : 'TRANSMISSION ECHO FROM TERMINAL ZERO:'}</span>
              </div>
              <p className="italic text-[11px]">
                {isVi
                  ? '"...Nếu ngươi đã đến được Haven, Voss... ngươi không phải là người duy nhất muốn tìm lời giải đáp. Hãy gia cố đoàn tàu. Lắp thêm toa xưởng và tháp súng. Tuyến đường phía Bắc sẽ thử thách mọi giới hạn của ngươi..."'
                  : '"...If you made it to Haven, Voss... you are not the only soul heading north. Terminal Zero holds the truth of the Collapse. Armor your carriages. Build your workshop. The northern wastes will test everything you have..."'}
              </p>
            </div>
          </div>

          {/* Buttons */}
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
              <span>{isVi ? 'BƯỚC VÀO VÙNG ĐẤT HOANG (GIAI ĐOẠN 2)' : 'CONTINUE JOURNEY (PHASE 2 PREVIEW)'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
