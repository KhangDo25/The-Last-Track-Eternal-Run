import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { CAMPAIGN_SLOTS, SaveManager } from '../game/saveManager';
import { SaveSlotMetadata } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { Language } from '../i18n/translations';
import {
  Save,
  FolderOpen,
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Upload,
  Shield,
  Flame,
  Train,
  Box,
  Compass,
  FileWarning,
} from 'lucide-react';

interface SaveLoadModalProps {
  engine: GameEngine;
  initialMode?: 'save' | 'load';
  onClose: () => void;
  onLoaded?: () => void;
  language: Language;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  engine,
  initialMode = 'save',
  onClose,
  onLoaded,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>(initialMode);
  const [slots, setSlots] = useState<(SaveSlotMetadata | null)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Overwrite confirmation modal state
  const [confirmOverwriteSlot, setConfirmOverwriteSlot] = useState<string | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<string | null>(null);

  // Inspect corrupted slot state
  const [inspectCorruptSlot, setInspectCorruptSlot] = useState<SaveSlotMetadata | null>(null);

  const fetchSlots = async () => {
    setLoading(true);
    const metaList = await SaveManager.getAllSlotsMetadata();
    setSlots(metaList);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleSaveToSlot = async (slotId: string, force = false) => {
    const existing = slots.find((s) => s?.slotId === slotId);

    // Protection from accidental overwriting
    if (existing && !force) {
      setConfirmOverwriteSlot(slotId);
      soundManager.playAlarm();
      return;
    }

    soundManager.playClick();
    const res = await engine.saveToSlot(slotId, 'manual');
    if (res.success) {
      soundManager.playLootSound();
      setActionMessage({
        text: language === 'vi' ? `Đã lưu tiến trình vào ${slotId.toUpperCase()} thành công!` : `Successfully saved game to ${slotId.toUpperCase()}!`,
        type: 'success',
      });
      setConfirmOverwriteSlot(null);
      await fetchSlots();
    } else {
      soundManager.playAlarm();
      setActionMessage({
        text: language === 'vi' ? `Lỗi lưu trữ: ${res.error}` : `Save error: ${res.error}`,
        type: 'error',
      });
    }
  };

  const handleLoadSlot = async (slotId: string) => {
    const existing = slots.find((s) => s?.slotId === slotId);
    if (!existing) return;

    if (existing.isCorrupted) {
      setInspectCorruptSlot(existing);
      soundManager.playAlarm();
      return;
    }

    soundManager.playHorn();
    const res = await engine.loadFromSlot(slotId);
    if (res.success) {
      setActionMessage({
        text: language === 'vi' ? `Đã khôi phục thành công từ ${slotId.toUpperCase()}!` : `Successfully loaded save from ${slotId.toUpperCase()}!`,
        type: 'success',
      });
      if (onLoaded) {
        setTimeout(() => {
          onLoaded();
          onClose();
        }, 500);
      } else {
        setTimeout(onClose, 600);
      }
    } else {
      soundManager.playAlarm();
      setActionMessage({
        text: language === 'vi' ? `Lỗi nạp dữ liệu: ${res.error}` : `Load error: ${res.error}`,
        type: 'error',
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    soundManager.playClick();
    await SaveManager.deleteSlot(slotId);
    setConfirmDeleteSlot(null);
    setActionMessage({
      text: language === 'vi' ? `Đã xóa bản lưu ${slotId.toUpperCase()}` : `Deleted save slot ${slotId.toUpperCase()}`,
      type: 'success',
    });
    await fetchSlots();
  };

  const handleExportJSON = async (slotId: string) => {
    soundManager.playClick();
    const jsonStr = await SaveManager.exportSlotJSON(slotId);
    if (!jsonStr) {
      alert(language === 'vi' ? 'Không tìm thấy dữ liệu bản lưu để sao lưu!' : 'No save data found to export!');
      return;
    }

    // Trigger download of json backup
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TheLastTrack_${slotId}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 font-mono text-zinc-100 select-none">
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              {activeTab === 'save' ? <Save className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase text-zinc-100 flex items-center gap-2">
                <span>{language === 'vi' ? 'HỆ THỐNG LƯU TRỮ ĐỊA PHƯƠNG' : 'LOCAL SAVE & LOAD ARCHIVE'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  IndexedDB
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                {language === 'vi'
                  ? '3 Vị trí chiến dịch độc lập + 1 Điểm kiểm tra an toàn tự động'
                  : '3 Independent Campaign Slots + 1 Safe Auto-Save Checkpoint'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Tabs */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab('save');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'save'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Lưu Game' : 'Save'}</span>
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab('load');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'load'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Nạp Game' : 'Load'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-zinc-400 hover:text-white cursor-pointer ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Slots List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {language === 'vi' ? 'Đang truy vấn cơ sở dữ liệu IndexedDB...' : 'Querying IndexedDB storage...'}
            </div>
          ) : (
            CAMPAIGN_SLOTS.map((slotDef, idx) => {
              const meta = slots[idx];
              const isOccupied = !!meta;
              const isAuto = slotDef.isAuto;

              return (
                <div
                  key={slotDef.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    meta?.isCorrupted
                      ? 'bg-red-950/20 border-red-600/50'
                      : isOccupied
                      ? isAuto
                        ? 'bg-zinc-950/90 border-cyan-500/40 hover:border-cyan-400/80'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-amber-500/60 shadow-lg'
                      : 'bg-zinc-950/40 border-dashed border-zinc-800/80'
                  }`}
                >
                  {/* Top Bar of Slot Card */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-lg border ${
                          isAuto
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                        }`}
                      >
                        {slotDef.label}
                      </span>

                      {isOccupied && !meta.isCorrupted && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-amber-400" />
                          <span>{meta.chapterTitle}</span>
                        </span>
                      )}

                      {meta?.isCorrupted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 border border-red-500/60 text-red-300 font-bold flex items-center gap-1">
                          <FileWarning className="w-3 h-3" />
                          <span>{language === 'vi' ? 'Dữ liệu hỏng - Đã bảo toàn' : 'Corrupted / Protected'}</span>
                        </span>
                      )}
                    </div>

                    {isOccupied && (
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="font-bold text-zinc-300">
                            {SaveManager.formatPlaytime(meta.playtimeSeconds)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{new Date(meta.savedAt).toLocaleDateString()} {new Date(meta.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Slot Details Body */}
                  {isOccupied ? (
                    meta.isCorrupted ? (
                      <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2 text-xs">
                        <p className="text-red-300 font-bold">
                          {language === 'vi'
                            ? 'CẢNH BÁO: Tập tin lưu trữ bị lỗi cấu trúc nhưng KHÔNG bị xóa.'
                            : 'WARNING: Save structure damaged but PRESERVED without silent deletion.'}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {meta.corruptedReason || 'Unknown structural mismatch'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleExportJSON(slotDef.id)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>{language === 'vi' ? 'Xuất mã sao lưu JSON' : 'Export Raw Backup'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Mission / Objective Progress */}
                        <div className="bg-zinc-900/90 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="block text-[10px] font-bold text-amber-400 uppercase">
                              {meta.missionTitle}
                            </span>
                            <span className="text-[11px] text-zinc-300">{meta.missionObjective}</span>
                          </div>
                          <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                            {meta.missionProgress}
                          </span>
                        </div>

                        {/* Train & Resource Diagnostics */}
                        <div className="grid grid-cols-4 gap-2 text-[11px] bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/50">
                          <div className="flex items-center gap-1.5">
                            <Train className="w-3.5 h-3.5 text-zinc-500" />
                            <div>
                              <span className="block text-[9px] text-zinc-500">
                                {language === 'vi' ? 'Toa xe' : 'Carriages'}
                              </span>
                              <span className="font-bold text-zinc-200">{meta.carriagesCount} Toa</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <div>
                              <span className="block text-[9px] text-zinc-500">
                                {language === 'vi' ? 'Độ bền tàu' : 'Hull HP'}
                              </span>
                              <span className="font-bold text-emerald-400">
                                {meta.trainHealth} / {meta.maxTrainHealth}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <div>
                              <span className="block text-[9px] text-zinc-500">
                                {language === 'vi' ? 'Nhiên liệu' : 'Fuel'}
                              </span>
                              <span className="font-bold text-amber-400">{meta.fuel}L</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-blue-500" />
                            <div>
                              <span className="block text-[9px] text-zinc-500">
                                {language === 'vi' ? 'Quãng đường' : 'Distance'}
                              </span>
                              <span className="font-bold text-blue-300">{meta.distanceKm.toFixed(1)} km</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExportJSON(slotDef.id)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title={language === 'vi' ? 'Xuất tệp sao lưu JSON' : 'Export JSON Backup'}
                            >
                              <Download className="w-3 h-3" />
                              <span>JSON</span>
                            </button>

                            <button
                              onClick={() => setConfirmDeleteSlot(slotDef.id)}
                              className="p-1 hover:bg-red-950/60 border border-transparent hover:border-red-800 text-zinc-600 hover:text-red-400 rounded-lg text-[10px] transition-colors cursor-pointer"
                              title={language === 'vi' ? 'Xóa bản lưu này' : 'Delete save slot'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {activeTab === 'save' && (
                              <button
                                onClick={() => handleSaveToSlot(slotDef.id)}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>{language === 'vi' ? 'Ghi Đè Lưu' : 'Overwrite Save'}</span>
                              </button>
                            )}

                            {activeTab === 'load' && (
                              <button
                                onClick={() => handleLoadSlot(slotDef.id)}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>{language === 'vi' ? 'Nạp Tiến Trình' : 'Load Campaign'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Empty Slot */
                    <div className="py-3 flex items-center justify-between">
                      <span className="text-xs text-zinc-500 italic">
                        {language === 'vi' ? 'Vị trí còn trống · Sẵn sàng ghi' : 'Empty Save Slot · Ready to write'}
                      </span>

                      {activeTab === 'save' && (
                        <button
                          onClick={() => handleSaveToSlot(slotDef.id)}
                          className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-zinc-950 font-bold text-xs uppercase tracking-wide rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{language === 'vi' ? 'Lưu Vào Vị Trí Này' : 'Save Here'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Overwrite Confirmation Dialog */}
        {confirmOverwriteSlot && (
          <div className="fixed inset-0 z-60 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-sm font-black uppercase text-zinc-100">
                  {language === 'vi' ? 'XÁC NHẬN GHI ĐÈ BẢN LƯU' : 'CONFIRM OVERWRITE'}
                </h3>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {language === 'vi'
                  ? `Vị trí "${confirmOverwriteSlot.toUpperCase()}" đã chứa dữ liệu chiến dịch cũ. Bạn có chắc chắn muốn ghi đè tiến trình mới lên vị trí này?`
                  : `Slot "${confirmOverwriteSlot.toUpperCase()}" already contains existing campaign data. Are you sure you want to overwrite it?`}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmOverwriteSlot(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleSaveToSlot(confirmOverwriteSlot, true)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs uppercase rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Đồng Ý Ghi Đè' : 'Confirm Overwrite'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {confirmDeleteSlot && (
          <div className="fixed inset-0 z-60 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-red-500/80 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-sm font-black uppercase text-zinc-100">
                  {language === 'vi' ? 'XÁC NHẬN XÓA BẢN LƯU' : 'DELETE SAVE SLOT'}
                </h3>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {language === 'vi'
                  ? `Bạn có chắc chắn muốn xóa vĩnh viễn dữ liệu tại vị trí "${confirmDeleteSlot.toUpperCase()}"? Hành động này không thể hoàn tác.`
                  : `Are you sure you want to permanently delete the save in "${confirmDeleteSlot.toUpperCase()}"? This action cannot be undone.`}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteSlot(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleDeleteSlot(confirmDeleteSlot)}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Xóa Vĩnh Viễn' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-3 mt-4 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{language === 'vi' ? 'Hệ thống tự động lưu khi đến ga hoặc qua biến cố cốt truyện.' : 'Auto-saves at stations and major story events.'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors cursor-pointer text-xs font-bold"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
