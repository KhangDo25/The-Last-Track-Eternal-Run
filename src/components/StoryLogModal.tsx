import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Language } from '../i18n/translations';
import {
  BookOpen,
  Users,
  Disc,
  Compass,
  CheckCircle2,
  Lock,
  X,
  Volume2,
  Shield,
  Zap,
  MapPin,
  ChevronRight,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { CHAPTER_CONFIGS, ChapterConfig } from '../game/storyData';
import { ChapterId } from '../types/game';

interface StoryLogModalProps {
  engine: GameEngine;
  language: Language;
  onClose: () => void;
}

export const StoryLogModal: React.FC<StoryLogModalProps> = ({
  engine,
  language,
  onClose,
}) => {
  const isVi = language === 'vi';
  const [activeTab, setActiveTab] = useState<'chapters' | 'companions' | 'audiologs' | 'decisions'>('chapters');
  const [selectedChapterId, setSelectedChapterId] = useState<ChapterId>(engine.currentChapter || 'Chapter1');
  const [selectedLogId, setSelectedLogId] = useState<string>('log_01');

  const chaptersList = Object.values(CHAPTER_CONFIGS) as ChapterConfig[];
  const selectedConfig = CHAPTER_CONFIGS[selectedChapterId] || CHAPTER_CONFIGS['Chapter1'];
  const activeLog = engine.audioLogs.find((l) => l.id === selectedLogId) || engine.audioLogs[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono text-zinc-100">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[650px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-2">
                <span>{isVi ? 'NHẬT KÝ CHIẾN DỊCH: THE LAST TRACK' : 'CAMPAIGN DOSSIER: THE LAST TRACK'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-normal">
                  {engine.currentChapter.toUpperCase()}
                </span>
              </h2>
              <span className="text-xs text-zinc-500">
                {isVi ? 'Theo dõi cốt truyện, đồng đội, bản ghi âm và tiến trình mở rộng saga' : 'Track narrative arc, recruited companions, audio logs, and saga roadmap'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('chapters');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'chapters' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isVi ? 'Chương Hồi' : 'Chapters'}</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('companions');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'companions' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đồng Đội' : 'Companions'}</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('audiologs');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'audiologs' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>{isVi ? 'Bản Ghi Âm' : 'Audio Logs'}</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('decisions');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'decisions' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isVi ? 'Quyết Định' : 'Decisions'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Chapters & Saga Roadmap */}
        {activeTab === 'chapters' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Chapters Timeline list */}
            <div className="w-2/5 border-r border-zinc-800 p-5 overflow-y-auto space-y-2 bg-zinc-950/60">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                {isVi ? 'TIẾN TRÌNH CHIẾN DỊCH TOÀN BỘ SAGA' : 'SAGA CAMPAIGN TIMELINE'}
              </span>

              {chaptersList.map((ch) => {
                const isCurrent = engine.currentChapter === ch.id;
                const isPrologueDone = engine.completedObjectives.includes('prologue_completed');
                const isCh1Done = engine.completedObjectives.includes('ch1_complete');
                const isSelected = selectedChapterId === ch.id;

                let isUnlocked = false;
                if (ch.id === 'Prologue') isUnlocked = true;
                else if (ch.id === 'Chapter1') isUnlocked = isPrologueDone || isCurrent;
                else if (ch.id === 'Chapter2') isUnlocked = isCh1Done || isCurrent;

                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedChapterId(ch.id);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-900 border-cyan-500/80 text-cyan-200 shadow-md'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          (ch.id === 'Prologue' && isPrologueDone) || (ch.id === 'Chapter1' && isCh1Done) ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          )
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                        <span className="font-extrabold text-[11px] uppercase tracking-wide">
                          {ch.title.split(':')[0]}
                        </span>
                      </div>
                      <div className="text-zinc-300 font-semibold truncate max-w-[200px]">
                        {ch.title.split(':')[1]?.trim() || ch.title}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">{ch.startDistance} - {ch.bossDistance} km</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (ch.id === 'Prologue' && isPrologueDone) || (ch.id === 'Chapter1' && isCh1Done)
                          ? 'bg-emerald-950 text-emerald-400'
                          : isCurrent
                          ? 'bg-cyan-950 text-cyan-400'
                          : 'bg-zinc-900 text-zinc-600'
                      }`}>
                        {(ch.id === 'Prologue' && isPrologueDone) || (ch.id === 'Chapter1' && isCh1Done)
                          ? (isVi ? 'Hoàn Thành' : 'Done')
                          : isCurrent
                          ? (isVi ? 'Đang Chơi' : 'Active')
                          : (isVi ? 'Khóa' : 'Locked')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Detailed Chapter Mission Dossier */}
            <div className="w-3/5 p-6 overflow-y-auto space-y-4 bg-zinc-950">
              <div className="space-y-1.5 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedConfig.location}</span>
                </div>
                <h3 className="text-lg font-extrabold text-zinc-100">
                  {selectedConfig.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {selectedConfig.description}
                </p>
              </div>

              {/* Boss & Encounter Card */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  {isVi ? 'MỐI ĐE DỌA TRÙM CHƯƠNG / BOSS ENCOUNTER' : 'CHAPTER BOSS THREAT'}
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    {selectedConfig.bossName}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {isVi ? `Tại Km ${selectedConfig.bossDistance}` : `At Km ${selectedConfig.bossDistance}`}
                  </span>
                </div>
              </div>

              {/* Story Missions */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  {isVi ? 'NHIỆM VỤ CỐT TRUYỆN / MISSION OBJECTIVES' : 'STORY OBJECTIVES'}
                </span>

                {selectedConfig.missions.map((m) => {
                  let isDone = false;
                  if (m.id === 'prologue_m1') isDone = engine.completedObjectives.includes('repaired_shunter_pipe');
                  if (m.id === 'prologue_m2') isDone = engine.completedObjectives.includes('prologue_completed');
                  if (m.id === 'ch1_m1') isDone = engine.completedObjectives.includes('ch1_roadblock_defeated');
                  if (m.id === 'ch1_m2') isDone = engine.completedObjectives.includes('ch1_complete');

                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-zinc-200">{m.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDone ? 'bg-emerald-900/60 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {isDone ? (isVi ? 'Hoàn Thành' : 'Completed') : (isVi ? 'Chưa Đạt' : 'Active')}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{m.description}</p>
                      <div className="pt-1.5 border-t border-zinc-800/80 flex justify-between items-center text-[11px]">
                        <span className="text-zinc-500">{m.objective}</span>
                        <span className="text-amber-400 font-semibold">{m.rewardText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Revelation Snippet */}
              <div className="p-3.5 bg-amber-950/20 border border-amber-600/30 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  {selectedConfig.revelationTitle}
                </span>
                <p className="text-zinc-300 italic text-[11px] leading-relaxed">
                  "{selectedConfig.revelationText}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Companions Dossier */}
        {activeTab === 'companions' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-zinc-950">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
              {isVi ? 'HỒ SƠ THỦY THỦ ĐOÀN & ĐỒNG ĐỘI ĐƯỢC TUYỂN MỘ' : 'TRAIN CREW & RECRUITED COMPANIONS'}
            </span>

            <div className="grid grid-cols-2 gap-4">
              {engine.companions.map((comp) => {
                const isRecruited = comp.isRecruited;

                return (
                  <div
                    key={comp.id}
                    className={`rounded-2xl border p-5 space-y-3 flex flex-col justify-between ${
                      isRecruited
                        ? 'bg-zinc-900/70 border-cyan-500/40 shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base border ${
                            isRecruited
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                          }`}>
                            {comp.name[0]}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100">{comp.name}</h4>
                            <span className="text-[11px] text-zinc-400 block">{comp.role}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isRecruited
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                        }`}>
                          {isRecruited ? (isVi ? 'Đã Tuyển Mộ' : 'Recruited') : (isVi ? 'Chưa Mở Khóa' : 'Locked')}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed mt-3">
                        {comp.bio}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-zinc-800">
                      {/* Loyalty Bar */}
                      {isRecruited && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                            <span>{isVi ? 'ĐỘ TRUNG THÀNH' : 'LOYALTY'}</span>
                            <span className="text-cyan-400">{comp.loyalty} / 100</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                              style={{ width: `${comp.loyalty}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Perk badge */}
                      <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 text-[11px] space-y-1">
                        <span className="font-bold text-amber-400 block">★ {comp.unlockedPerk}</span>
                        <span className="text-zinc-400">{comp.perkDescription}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Dr. Adrian Voss Audio Logs */}
        {activeTab === 'audiologs' && (
          <div className="flex-1 flex overflow-hidden">
            {/* List */}
            <div className="w-2/5 border-r border-zinc-800 p-5 overflow-y-auto space-y-2 bg-zinc-950/60">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                {isVi ? 'KHO BẢN GHI ÂM TS. ADRIAN VOSS' : 'DR. ADRIAN VOSS AUDIO ARCHIVE'}
              </span>

              {engine.audioLogs.map((log) => {
                const isSelected = selectedLogId === log.id;

                return (
                  <button
                    key={log.id}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedLogId(log.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-500/80 text-amber-300 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {log.unlocked ? (
                        <Disc className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block text-zinc-200">
                          {log.unlocked ? log.title : `Log #${log.number}: [Dữ Liệu Mã Hóa]`}
                        </span>
                        <span className="text-[10px] text-zinc-500">{log.location}</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      log.unlocked ? 'bg-amber-950 text-amber-400' : 'bg-zinc-900 text-zinc-600'
                    }`}>
                      {log.unlocked ? (isVi ? 'Đã Mở' : 'Decrypted') : (isVi ? 'Khóa' : 'Locked')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Transcript View */}
            <div className="w-3/5 p-6 overflow-y-auto space-y-4 bg-zinc-950">
              {activeLog.unlocked ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">
                        {activeLog.speaker} · {activeLog.date}
                      </span>
                      <h3 className="text-base font-extrabold text-zinc-100">{activeLog.title}</h3>
                    </div>
                    <button
                      onClick={() => soundManager.playAlarm()}
                      className="p-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-lg text-amber-400 transition-colors"
                      title="Replay tone"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-3 text-xs leading-relaxed font-mono">
                    <p className="text-amber-200 italic font-semibold">
                      {activeLog.transcript}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-zinc-600">
                  <Lock className="w-12 h-12 text-zinc-700" />
                  <h4 className="text-sm font-bold text-zinc-400">
                    {isVi ? 'BẢN GHI ÂM NÀY CHƯA ĐƯỢC TÌM THẤY' : 'AUDIO MEMO ENCRYPTED'}
                  </h4>
                  <p className="text-xs max-w-sm">
                    {isVi
                      ? `Bản ghi âm số #${activeLog.number} được cất giấu dọc theo các tháp tín hiệu tại ${activeLog.chapter}. Khám phá vùng đất để giải mã.`
                      : `Log #${activeLog.number} is buried along the rail lines in ${activeLog.chapter}. Explore the stations to uncover it.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Decisions & Story Clues */}
        {activeTab === 'decisions' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-zinc-950">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
              {isVi ? 'CÁC QUYẾT ĐỊNH SINH TỒN ĐÃ THỰC HIỆN' : 'RECORDED CAMPAIGN DECISIONS'}
            </span>

            <div className="space-y-3">
              {Object.keys(engine.storyDecisions).length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-xs italic">
                  {isVi ? 'Chưa có quyết định nào được đưa ra.' : 'No major decisions made yet.'}
                </div>
              ) : (
                Object.entries(engine.storyDecisions).map(([key, value]) => {
                  let title = key;
                  let desc = `Lựa chọn: ${String(value)}`;

                  if (key === 'mara_fuel_shared') {
                    title = isVi ? 'Quyết Định Nhiên Liệu Tiền Đồn 42' : 'Outpost 42 Fuel Decision';
                    desc = value
                      ? (isVi ? 'Bạn đã chia sẻ 20L dầu máy cứu các gia đình tại Tiền Đồn 42. Mara trung thành tuyệt đối, tặng kèm Thép và Linh Kiện.' : 'Shared 20L fuel with Outpost 42. High companion loyalty and valuable engineering supplies rewarded.')
                      : (isVi ? 'Bạn đã bảo toàn 15L dầu cho đầu máy để phòng bão tuyết. Mara tôn trọng quyết định thực dụng.' : 'Conserved fuel for the locomotive boiler. Prioritized train survival over outpost comfort.');
                  } else if (key === 'ch1_roadblock_destroyed') {
                    title = isVi ? 'Tiêu Diệt Xe Tải Bọc Thép Bọn Cướp' : 'Raider Roadblock Destroyed';
                    desc = isVi ? 'Phá hủy vật cản bọc thép hạng nặng tại Km 5.5, giải cứu Mara Cole an toàn.' : 'Destroyed the armored roadblock truck, securing the northern line.';
                  } else if (key === 'engine_repaired') {
                    title = isVi ? 'Bảo Trì Ống Hơi Shunter #04' : 'Shunter #04 Boiler Repaired';
                    desc = isVi ? 'Hàn kín ống hơi bị vỡ bằng phế liệu, khôi phục áp suất xi lanh.' : 'Repaired broken steam pipes with salvaged metal plates.';
                  } else if (key === 'outpost42_secured') {
                    title = isVi ? 'Cập Bến Tiền Đồn 42' : 'Docked at Outpost 42';
                    desc = isVi ? 'Hoàn thành Chương I: The Last Departure. Gắn toa xưởng kỹ thuật vào đoàn tàu.' : 'Accomplished Chapter I. Workshop carriage earned and coupled.';
                  }

                  return (
                    <div
                      key={key}
                      className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-cyan-300">{title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                          {String(value)}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">{desc}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
          <span>{isVi ? 'Hành Trình Bất Tận: Tuyến Đường Sắt Phương Bắc' : 'The Eternal Run: Northern Continental Corridor'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            {isVi ? 'Đóng Nhật Ký' : 'Close Dossier'}
          </button>
        </div>
      </div>
    </div>
  );
};
