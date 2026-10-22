import React, { useEffect, useState } from 'react';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { GameSettings, SettingsManager } from '../utils/settingsManager';
import { soundManager } from '../audio/soundManager';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Music,
  Tv,
  Maximize2,
  Minimize2,
  Sparkles,
  Sliders,
  Keyboard,
  RotateCcw,
  Check,
  Flame,
  Languages,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onApplySettings?: (settings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  language,
  onLanguageChange,
  onApplySettings,
}) => {
  const t = TRANSLATIONS[language];
  const [settings, setSettings] = useState<GameSettings>(() => SettingsManager.getSettings());
  const [activeTab, setActiveTab] = useState<'audio' | 'display' | 'controls'>('audio');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);
  const [remappingKey, setRemappingKey] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const updateSetting = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    const next = SettingsManager.saveSettings({ [key]: val });
    setSettings(next);

    // Apply sound live
    if (key === 'masterVolume') soundManager.setMasterVolume(val as number);
    if (key === 'musicVolume') soundManager.setMusicVolume(val as number);
    if (key === 'sfxVolume') soundManager.setSfxVolume(val as number);

    if (onApplySettings) {
      onApplySettings(next);
    }

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1200);
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          updateSetting('fullscreen', true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
          updateSetting('fullscreen', false);
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed (likely iframe restriction):', e);
    }
  };

  const handleKeyRemap = (actionKey: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newCode = e.code;
    const nextControls = {
      ...settings.controls,
      [actionKey]: newCode,
    };
    const next = SettingsManager.saveSettings({ controls: nextControls });
    setSettings(next);
    setRemappingKey(null);
    soundManager.playClick();
  };

  const handleResetDefaults = () => {
    soundManager.playClick();
    const def = SettingsManager.resetToDefaults();
    setSettings(def);
    soundManager.setMasterVolume(def.masterVolume);
    soundManager.setMusicVolume(def.musicVolume);
    soundManager.setSfxVolume(def.sfxVolume);
    if (onApplySettings) onApplySettings(def);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 font-mono text-zinc-100 select-none">
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase text-zinc-100 flex items-center gap-2">
                <span>{language === 'vi' ? 'CÀI ĐẶT HỆ THỐNG' : 'SYSTEM SETTINGS'}</span>
                {saveToast && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
                    {language === 'vi' ? 'Đã Lưu' : 'Saved'}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {language === 'vi' ? 'Lưu trữ độc lập với tiến trình chiến dịch' : 'Persisted independently from campaign saves'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-4 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('audio');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'audio' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Âm Thanh' : 'Audio'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('display');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'display' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Hiển Thị' : 'Display'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('controls');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'controls' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Phím Điều Khiển' : 'Controls'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* 1. AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Master Volume */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>{language === 'vi' ? 'Âm Lượng Tổng (Master)' : 'Master Volume'}</span>
                  </span>
                  <span className="text-xs font-bold text-amber-400 tabular-nums">{settings.masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => updateSetting('masterVolume', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <span>{language === 'vi' ? 'Âm Lượng Động Cơ & Nhạc Nền' : 'Music & Engine Ambiance'}</span>
                  </span>
                  <span className="text-xs font-bold text-cyan-400 tabular-nums">{settings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => updateSetting('musicVolume', Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>{language === 'vi' ? 'Âm Thanh Hiệu Ứng (SFX / Đạn Bắn / Còi)' : 'Sound Effects (SFX / Weapons / Horn)'}</span>
                  </span>
                  <span className="text-xs font-bold text-orange-400 tabular-nums">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => updateSetting('sfxVolume', Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Audio Test & Mute Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    soundManager.playHorn();
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Thử Còi Hơi' : 'Test Steam Horn'}
                </button>

                <button
                  onClick={() => {
                    soundManager.playTurretShot();
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'vi' ? 'Thử Tiếng Đạn Pháo' : 'Test Gunshot'}
                </button>
              </div>
            </div>
          )}

          {/* 2. DISPLAY TAB */}
          {activeTab === 'display' && (
            <div className="space-y-3.5">
              {/* Fullscreen Toggle */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {language === 'vi' ? 'Toàn Màn Hình (Fullscreen)' : 'Fullscreen Mode'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {language === 'vi' ? 'Mở rộng trò chơi tràn màn hình thiết bị' : 'Expand game to fill display'}
                  </span>
                </div>
                <button
                  onClick={handleToggleFullscreen}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    isFullscreen ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? (language === 'vi' ? 'Thu Nhỏ' : 'Exit Fullscreen') : (language === 'vi' ? 'Bật Toàn Màn Hình' : 'Enter Fullscreen')}</span>
                </button>
              </div>

              {/* Pixel Art Scaling */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {language === 'vi' ? 'Chế Độ Khử Răng Cưa Pixel-Art' : 'Pixel-Art Texture Scaling'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {settings.pixelArtScaling === 'pixelated'
                      ? (language === 'vi' ? 'Sắc nét từng điểm ảnh (Nearest-Neighbor)' : 'Crisp pixelated (Nearest-Neighbor)')
                      : (language === 'vi' ? 'Làm mượt nội suy (Bilinear Smooth)' : 'Bilinear smoothed')}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => updateSetting('pixelArtScaling', 'pixelated')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      settings.pixelArtScaling === 'pixelated' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Pixelated
                  </button>
                  <button
                    onClick={() => updateSetting('pixelArtScaling', 'smooth')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      settings.pixelArtScaling === 'smooth' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Smooth
                  </button>
                </div>
              </div>

              {/* Screen Shake */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {language === 'vi' ? 'Rung Lắc Màn Hình (Screen Shake)' : 'Camera Screen Shake'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {language === 'vi' ? 'Hiệu ứng rung khi bắn pháo hoặc va quẹt đường ray' : 'Camera impulse during gunfire & impacts'}
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('screenShake', !settings.screenShake)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    settings.screenShake ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.screenShake ? (language === 'vi' ? 'Bật (Tiêu chuẩn)' : 'Enabled') : (language === 'vi' ? 'Đã Tắt' : 'Disabled')}
                </button>
              </div>

              {/* CRT Scanlines Filter */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {language === 'vi' ? 'Bộ Lọc Màn Hình Cổ Điển (CRT Scanlines)' : 'Retro CRT Scanline Filter'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {language === 'vi' ? 'Mô phỏng màn hình radar analog thời hậu tận thế' : 'Simulate analog vacuum-tube monitor lines'}
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('crtFilter', !settings.crtFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    settings.crtFilter ? 'bg-amber-950 text-amber-400 border border-amber-700' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.crtFilter ? (language === 'vi' ? 'Đang Bật' : 'Enabled') : (language === 'vi' ? 'Đã Tắt' : 'Disabled')}
                </button>
              </div>

              {/* Language Switch */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {language === 'vi' ? 'Ngôn Ngữ Giao Diện' : 'Interface Language'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Tiếng Việt / English
                  </span>
                </div>
                <button
                  onClick={() => {
                    const nextLang = language === 'vi' ? 'en' : 'vi';
                    updateSetting('language', nextLang);
                    if (onLanguageChange) onLanguageChange(nextLang);
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-bold text-amber-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'TIẾNG VIỆT' : 'ENGLISH'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-3">
              <div className="text-[11px] text-zinc-400 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                {language === 'vi'
                  ? 'Bấm vào phím để gán lại phím tùy ý. Phím mới sẽ có hiệu lực ngay lập tức.'
                  : 'Click a button below and press a new key to remap. Updates apply immediately.'}
              </div>

              <div className="space-y-2">
                {[
                  { key: 'forward', label: language === 'vi' ? 'Tiến Lên / Đi Tới' : 'Move Forward', defaultKey: 'W' },
                  { key: 'backward', label: language === 'vi' ? 'Lùi Lại / Xuống' : 'Move Backward', defaultKey: 'S' },
                  { key: 'left', label: language === 'vi' ? 'Sang Trái' : 'Move Left', defaultKey: 'A' },
                  { key: 'right', label: language === 'vi' ? 'Sang Phải' : 'Move Right', defaultKey: 'D' },
                  { key: 'interact', label: language === 'vi' ? 'Tương Tác / Lục Lọi' : 'Interact / Operate', defaultKey: 'E' },
                  { key: 'sprint', label: language === 'vi' ? 'Chạy Nhanh' : 'Sprint', defaultKey: 'Shift' },
                  { key: 'horn', label: language === 'vi' ? 'Kéo Còi Hơi' : 'Blow Steam Horn', defaultKey: 'H' },
                  { key: 'pause', label: language === 'vi' ? 'Tạm Dừng / Menu' : 'Pause / Open Menu', defaultKey: 'ESC' },
                ].map((item) => {
                  const currentBinding = (settings.controls as any)[item.key] || item.defaultKey;
                  const isRemapping = remappingKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-300 font-bold">{item.label}</span>

                      {isRemapping ? (
                        <input
                          type="text"
                          readOnly
                          value={language === 'vi' ? 'Nhấn phím...' : 'Press key...'}
                          onKeyDown={(e) => handleKeyRemap(item.key, e)}
                          autoFocus
                          className="px-3 py-1 bg-amber-500 text-zinc-950 font-black rounded-lg text-xs w-28 text-center animate-pulse outline-none cursor-pointer"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            setRemappingKey(item.key);
                          }}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 font-black rounded-lg text-xs min-w-20 text-center cursor-pointer transition-colors"
                        >
                          {currentBinding.replace('Key', '')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-3 mt-4 flex items-center justify-between text-[11px] text-zinc-500">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            title={language === 'vi' ? 'Khôi phục cài đặt gốc' : 'Reset all settings to defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Mặc Định' : 'Reset Defaults'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer"
          >
            {language === 'vi' ? 'Đóng & Áp Dụng' : 'Done & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
