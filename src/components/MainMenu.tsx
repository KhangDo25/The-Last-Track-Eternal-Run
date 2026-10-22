import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { GameEngine } from '../game/gameEngine';
import {
  Play,
  RotateCcw,
  FolderOpen,
  Settings,
  Award,
  Volume2,
  VolumeX,
  Languages,
  ChevronRight,
  Flame,
  Radio,
  Compass,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Sliders,
  X,
  Eye,
  Shield,
  Zap,
} from 'lucide-react';
import { SaveManager } from '../game/saveManager';
import { SaveSlotMetadata } from '../types/game';
import { SettingsManager } from '../utils/settingsManager';
import { SaveLoadModal } from './SaveLoadModal';
import { SettingsModal } from './SettingsModal';

interface MainMenuProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onStartNewGame: (skipIntro?: boolean) => void;
  onContinueGame: () => void;
  engine: GameEngine;
}

export type MenuMode = 'title' | 'menu' | 'intro';

export const MainMenu: React.FC<MainMenuProps> = ({
  language,
  onSetLanguage,
  onStartNewGame,
  onContinueGame,
  engine,
}) => {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<MenuMode>('title');
  const [introStep, setIntroStep] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.isSoundMuted());

  // Sub-modals inside Menu
  const [activeSubModal, setActiveSubModal] = useState<'none' | 'load' | 'settings' | 'credits'>('none');

  // Settings State loaded from SettingsManager
  const [masterVolume, setMasterVolume] = useState<number>(80);
  const [sfxVolume, setSfxVolume] = useState<number>(90);
  const [screenShake, setScreenShake] = useState<boolean>(true);
  const [crtFilter, setCrtFilter] = useState<boolean>(false);

  // Check saved game state from IndexedDB
  const [hasSave, setHasSave] = useState<boolean>(false);
  const [latestSave, setLatestSave] = useState<SaveSlotMetadata | null>(null);

  // Background Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const checkSaves = async () => {
      const latest = await SaveManager.getLatestValidSave();
      if (latest) {
        setHasSave(true);
        setLatestSave(latest);
      } else {
        const legacyExists = GameEngine.hasSavedGame();
        setHasSave(legacyExists);
      }
    };
    checkSaves();

    // Read isolated settings
    const settings = SettingsManager.getSettings();
    setMasterVolume(settings.masterVolume);
    setSfxVolume(settings.sfxVolume);
    setScreenShake(settings.screenShake);
    setCrtFilter(settings.crtFilter);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'title') {
        soundManager.playHorn();
        soundManager.playClick();
        setMode('menu');
      } else if (mode === 'intro') {
        if (e.code === 'Escape' || e.code === 'Space') {
          e.preventDefault();
          soundManager.playClick();
          onStartNewGame(true);
        } else if (e.code === 'Enter') {
          e.preventDefault();
          soundManager.playClick();
          if (introStep < 2) {
            setIntroStep((prev) => prev + 1);
          } else {
            onStartNewGame(false);
          }
        }
      } else if (mode === 'menu') {
        if (e.code === 'Escape') {
          if (activeSubModal !== 'none') {
            setActiveSubModal('none');
          } else {
            setMode('title');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, introStep, activeSubModal, onStartNewGame]);

  // Animated Pixel-Art Train & Railway Background Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let trackScroll = 0;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      life: number;
      maxLife: number;
      type: 'snow' | 'smoke' | 'spark';
    }[] = [];

    // Pre-populate snow particles
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: -60 - Math.random() * 80,
        vy: 120 + Math.random() * 140,
        size: Math.random() > 0.6 ? 2 : 1,
        alpha: 0.3 + Math.random() * 0.7,
        life: 1,
        maxLife: 1,
        type: 'snow',
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      // Track movement
      const trainSpeed = 48; // km/h ambient run speed
      trackScroll = (trackScroll + trainSpeed * 8 * delta) % 40;

      // 1. Sky & Atmospheric Twilight Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#020617'); // obsidian abyss
      skyGrad.addColorStop(0.4, '#090d16');
      skyGrad.addColorStop(0.7, '#0f172a');
      skyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant Frost Mountain Silhouettes
      ctx.fillStyle = '#090f1d';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      for (let x = 0; x <= width; x += 60) {
        const peak = Math.sin(x * 0.005) * 60 + Math.cos(x * 0.012) * 40;
        ctx.lineTo(x, height * 0.45 - peak);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Soft Polar Aurora Ribbon at top
      ctx.save();
      const auroraGrad = ctx.createLinearGradient(0, 0, width, 160);
      auroraGrad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      auroraGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.09)');
      auroraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, width, 180);
      ctx.restore();

      // 2. Ruined Railway Embankment & Ballast
      const railCenterX = width * 0.5;
      const ballastWidth = 140;

      // Dark crushed gravel strip
      ctx.fillStyle = '#111827';
      ctx.fillRect(railCenterX - ballastWidth / 2, 0, ballastWidth, height);

      // Ballast borders
      ctx.fillStyle = '#1f2937';
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(railCenterX - ballastWidth / 2 - 3, y, 3, 6);
        ctx.fillRect(railCenterX + ballastWidth / 2, y, 3, 6);
      }

      // Wooden Railroad Ties (Sleepers) scrolling downward
      const tieSpacing = 28;
      const startY = (trackScroll % tieSpacing) - tieSpacing;
      ctx.fillStyle = '#1c1917';

      for (let y = startY; y < height + tieSpacing; y += tieSpacing) {
        ctx.fillRect(railCenterX - 55, y, 110, 8);
        // Tie iron spikes
        ctx.fillStyle = '#52525b';
        ctx.fillRect(railCenterX - 36, y + 2, 4, 4);
        ctx.fillRect(railCenterX + 32, y + 2, 4, 4);
        ctx.fillStyle = '#1c1917';
      }

      // Steel Rails (Twin polished tracks)
      const railSpacing = 68;
      const leftRailX = railCenterX - railSpacing / 2;
      const rightRailX = railCenterX + railSpacing / 2;

      // Base steel rail
      ctx.fillStyle = '#475569';
      ctx.fillRect(leftRailX - 3, 0, 6, height);
      ctx.fillRect(rightRailX - 3, 0, 6, height);

      // Polished top railhead reflection
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(leftRailX - 1, 0, 2, height);
      ctx.fillRect(rightRailX - 1, 0, 2, height);

      // 3. Train Headlight Cones projecting forward
      const locoY = height * 0.48;

      ctx.save();
      const beamGrad = ctx.createRadialGradient(railCenterX, locoY - 40, 10, railCenterX, 0, height * 0.6);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      beamGrad.addColorStop(0.4, 'rgba(253, 224, 71, 0.15)');
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(railCenterX - 22, locoY - 40);
      ctx.lineTo(railCenterX - 260, 0);
      ctx.lineTo(railCenterX + 260, 0);
      ctx.lineTo(railCenterX + 22, locoY - 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Render Animated 2D Pixel Locomotive (Shunter #04)
      const bob = Math.sin(time * 0.008) * 1.5;

      // Locomotive Body
      const locoW = 60;
      const locoH = 110;
      const locoDrawX = railCenterX - locoW / 2;
      const locoDrawY = locoY - 30 + bob;

      // Cowcatcher plow wedge
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(railCenterX, locoDrawY - 14);
      ctx.lineTo(railCenterX + 32, locoDrawY + 8);
      ctx.lineTo(railCenterX - 32, locoDrawY + 8);
      ctx.closePath();
      ctx.fill();

      // Plow center rib
      ctx.fillStyle = '#71717a';
      ctx.fillRect(railCenterX - 2, locoDrawY - 14, 4, 22);

      // Boiler Body
      ctx.fillStyle = '#27272a';
      ctx.fillRect(locoDrawX + 8, locoDrawY + 8, locoW - 16, 55);

      // Boiler bands & highlights
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(locoDrawX + 12, locoDrawY + 8, 8, 55);
      ctx.fillStyle = '#52525b';
      ctx.fillRect(locoDrawX + 8, locoDrawY + 18, locoW - 16, 3);
      ctx.fillRect(locoDrawX + 8, locoDrawY + 36, locoW - 16, 3);

      // Smokestack chimney
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(railCenterX, locoDrawY + 22, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(railCenterX, locoDrawY + 22, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cabin
      ctx.fillStyle = '#18181b';
      ctx.fillRect(locoDrawX + 4, locoDrawY + 63, locoW - 8, 38);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(locoDrawX + 6, locoDrawY + 64, locoW - 12, 4);

      // Cabin Windows (Warm amber glow)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(locoDrawX + 10, locoDrawY + 70, 14, 6);
      ctx.fillRect(locoDrawX + 36, locoDrawY + 70, 14, 6);

      // Twin Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(locoDrawX + 10, locoDrawY + 2, 8, 7);
      ctx.fillRect(locoDrawX + 42, locoDrawY + 2, 8, 7);

      // 5. Hitch Coupler & Passenger Carriage (Class B #108)
      const couplerY = locoDrawY + 101;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(railCenterX - 4, couplerY, 8, 12);

      const passW = 56;
      const passH = 95;
      const passY = couplerY + 12;
      const passX = railCenterX - passW / 2;

      // Wooden body
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(passX, passY, passW, passH);
      // Siding lines
      ctx.fillStyle = '#2d1810';
      for (let py = passY + 6; py < passY + passH - 6; py += 6) {
        ctx.fillRect(passX, py, passW, 1);
      }
      // Corner steel frames
      ctx.fillStyle = '#52525b';
      ctx.fillRect(passX, passY, 4, passH);
      ctx.fillRect(passX + passW - 4, passY, 4, passH);

      // Warm Amber Lantern Passenger Windows
      const winY = [passY + 12, passY + 34, passY + 56, passY + 78];
      winY.forEach((wy) => {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(passX + 6, wy, 12, 10);
        ctx.fillRect(passX + passW - 18, wy, 12, 10);
        ctx.fillStyle = '#2d1810';
        ctx.fillRect(passX + 11, wy, 2, 10);
        ctx.fillRect(passX + passW - 13, wy, 2, 10);
      });

      // 6. Spawn Smoke & Spark Particles
      if (Math.random() < 0.8) {
        particles.push({
          x: railCenterX + (Math.random() - 0.5) * 8,
          y: locoDrawY + 22,
          vx: (Math.random() - 0.5) * 18,
          vy: 80 + Math.random() * 80,
          size: 7 + Math.random() * 5,
          alpha: 0.55,
          life: 1.2,
          maxLife: 1.2,
          type: 'smoke',
        });
      }

      // Bogie sparks
      if (Math.random() < 0.25) {
        const side = Math.random() > 0.5 ? leftRailX : rightRailX;
        particles.push({
          x: side + (Math.random() - 0.5) * 4,
          y: locoDrawY + 45 + Math.random() * 50,
          vx: (side === leftRailX ? -1 : 1) * (40 + Math.random() * 60),
          vy: 60 + Math.random() * 80,
          size: 2,
          alpha: 1,
          life: 0.25,
          maxLife: 0.25,
          type: 'spark',
        });
      }

      // 7. Render & Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;

        if (p.type === 'snow') {
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width + 80;
          }
          if (p.x < -10) p.x = width + 10;

          ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else if (p.type === 'smoke') {
          p.life -= delta;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          const ratio = p.life / p.maxLife;
          const sz = p.size * (1 + (1 - ratio) * 1.6);
          ctx.save();
          ctx.globalAlpha = p.alpha * ratio;
          ctx.fillStyle = '#52525b';
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'spark') {
          p.life -= delta;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      // 8. Dark Vignette around Screen Borders
      const vigGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const handleEnterMenu = () => {
    soundManager.playHorn();
    soundManager.playClick();
    setMode('menu');
  };

  const handleStartCampaign = () => {
    soundManager.playClick();
    setIntroStep(0);
    setMode('intro');
  };

  const handleDirectNewGame = () => {
    soundManager.playClick();
    onStartNewGame(true);
  };

  const handleContinue = () => {
    if (!hasSave) {
      soundManager.playClick();
      setActiveSubModal('load');
      return;
    }
    soundManager.playHorn();
    onContinueGame();
  };

  return (
    <div className={`relative w-full h-full overflow-hidden font-mono select-none text-zinc-100 ${crtFilter ? 'crt-scanlines' : ''}`}>
      {/* 2D Pixel-Art Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Utility Controls (Language & Audio) */}
      <div className="absolute top-5 right-6 z-40 flex items-center gap-2.5">
        <button
          onClick={() => onSetLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer"
          title="Chuyển đổi Tiếng Việt / English"
        >
          <Languages className="w-4 h-4 text-amber-400" />
          <span>{language.toUpperCase()}</span>
        </button>

        <button
          onClick={handleToggleMute}
          className="p-2 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer"
          title={isMuted ? t.unmuteBtn : t.muteBtn}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. TITLE SCREEN OVERLAY */}
      {/* ======================================================== */}
      {mode === 'title' && (
        <div
          onClick={handleEnterMenu}
          className="absolute inset-0 flex flex-col justify-between p-8 md:p-14 z-30 cursor-pointer bg-zinc-950/40 backdrop-blur-[1px] transition-all duration-500"
        >
          {/* Top Wordmark Kicker */}
          <div className="flex items-center gap-2 text-xs text-amber-400/90 font-bold tracking-widest uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span>{language === 'vi' ? 'DỰ ÁN ĐƯỜNG SẮT SINH TỒN HẬU TẬN THẾ' : 'POST-APOCALYPTIC RAILWAY SURVIVAL'}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 font-normal">v1.0.4 Phase 1</span>
          </div>

          {/* Central Title Display */}
          <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="inline-flex p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-3xl text-amber-400 mb-2 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              <Flame className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-zinc-100 uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                {t.menuTitle}
              </h1>
              <div className="text-xl md:text-3xl font-extrabold tracking-widest text-amber-400 uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
                {t.menuSubtitle}
              </div>
            </div>

            <p className="text-xs md:text-sm text-zinc-400 max-w-lg leading-relaxed pt-2">
              {t.menuTagline}
            </p>

            {/* Pulsing Start Prompt */}
            <div className="pt-8 animate-pulse">
              <div className="px-6 py-3 rounded-2xl bg-zinc-900/90 border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.3)] text-amber-300 text-xs md:text-sm font-extrabold tracking-widest flex items-center gap-3">
                <Play className="w-4 h-4 fill-amber-400" />
                <span>{t.menuPressAnyKey}</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between items-end text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-4">
            <div>
              <span>Helix Dynamics Core Disaster · Year 2084</span>
              <span className="mx-2">·</span>
              <span>Terminal Zero Siding Corridor</span>
            </div>
            <div>[CLICK ANYWHERE TO CONTINUE]</div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN MENU SCREEN */}
      {/* ======================================================== */}
      {mode === 'menu' && (
        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 z-30 bg-zinc-950/70 backdrop-blur-sm">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wider uppercase text-zinc-100">
                  {t.menuTitle}: <span className="text-amber-400">{t.menuSubtitle}</span>
                </h2>
                <div className="text-[10px] text-zinc-400">
                  {language === 'vi' ? 'Trang Chủ Lệnh Tàu Bọc Thép · Sector 07' : 'Armored Train Command Deck · Sector 07'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMode('title')}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {t.menuReturnToTitle}
            </button>
          </div>

          {/* Center Navigation Menu Column */}
          <div className="max-w-md w-full mx-auto my-auto space-y-3">
            {/* 1. NEW GAME */}
            <button
              onClick={handleStartCampaign}
              className="w-full group p-4 bg-zinc-900/90 hover:bg-amber-500/20 border-2 border-amber-500/80 hover:border-amber-400 rounded-2xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-md">
                  <Play className="w-5 h-5 fill-zinc-950" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-zinc-100 group-hover:text-amber-300 uppercase tracking-wide">
                    {t.menuNewGame}
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {language === 'vi' ? 'Bắt đầu chương mở đầu với 1 đầu máy & 1 toa xe' : 'Start Prologue with 1 Locomotive & 1 Passenger Carriage'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* 2. CONTINUE */}
            <button
              onClick={handleContinue}
              disabled={!hasSave}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                hasSave
                  ? 'bg-zinc-900/90 hover:bg-emerald-950/40 border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-600 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasSave ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-900 text-zinc-700'}`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className={`block text-sm font-bold uppercase tracking-wide ${hasSave ? 'text-zinc-100' : 'text-zinc-500'}`}>
                    {t.menuContinue}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {hasSave && latestSave
                      ? `${latestSave.slotName} · ${latestSave.chapterTitle} (${SaveManager.formatPlaytime(latestSave.playtimeSeconds)})`
                      : hasSave
                      ? (language === 'vi' ? 'Tiếp tục bản lưu gần nhất' : 'Resume latest save archive')
                      : t.menuNoSaveTitle}
                  </span>
                </div>
              </div>
              {hasSave && <ChevronRight className="w-5 h-5 text-emerald-400" />}
            </button>

            {/* 3. LOAD GAME */}
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveSubModal('load');
              }}
              className="w-full p-3.5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-zinc-200 uppercase">
                    {t.menuLoadGame}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {hasSave ? (language === 'vi' ? '1 Bản lưu tự động khả dụng' : '1 Auto-Save Archive available') : (language === 'vi' ? 'Xem các vị trí lưu trữ' : 'Inspect save slots')}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            {/* 4. SETTINGS */}
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveSubModal('settings');
              }}
              className="w-full p-3.5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-zinc-200 uppercase">
                    {t.menuSettings}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {language === 'vi' ? 'Âm thanh, hình ảnh & phím tắt' : 'Audio, visuals & key bindings'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            {/* 5. CREDITS */}
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveSubModal('credits');
              }}
              className="w-full p-3.5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-zinc-200 uppercase">
                    {t.menuCredits}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {language === 'vi' ? 'Đội ngũ phát triển & kiến trúc' : 'Development team & design credits'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Footer Status Bar */}
          <div className="flex flex-wrap justify-between items-center text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{language === 'vi' ? 'Hệ thống vận hành bình thường' : 'Systems nominal'}</span>
            </div>
            <div>
              <span>[W/S] Throttle · [E] Interact · [Mouse] Turret Aim · [F1] Debug</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SKIPPABLE OPENING INTRODUCTION CINEMATIC */}
      {/* ======================================================== */}
      {mode === 'intro' && (
        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-14 z-50 bg-zinc-950/92 backdrop-blur-md">
          {/* Top Bar with Skip Button */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-black tracking-widest uppercase text-amber-400">
                {t.introCinematicTitle} · {introStep + 1} / 3
              </span>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onStartNewGame(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>{t.introSkip}</span>
            </button>
          </div>

          {/* Story Slide Content with Pixel Frame */}
          <div className="max-w-2xl w-full mx-auto my-auto space-y-6 animate-in fade-in duration-300">
            {/* Act Visual Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              {introStep === 0 && <Flame className="w-8 h-8" />}
              {introStep === 1 && <Compass className="w-8 h-8" />}
              {introStep === 2 && <Radio className="w-8 h-8 animate-pulse text-cyan-400" />}
            </div>

            {/* Act Titles */}
            <div className="text-center space-y-1.5">
              <span className="text-xs font-bold text-amber-400 tracking-widest uppercase block">
                {introStep === 0 && t.introAct1Subtitle}
                {introStep === 1 && t.introAct2Subtitle}
                {introStep === 2 && t.introAct3Subtitle}
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-zinc-100 uppercase tracking-tight">
                {introStep === 0 && t.introAct1Title}
                {introStep === 1 && t.introAct2Title}
                {introStep === 2 && t.introAct3Title}
              </h2>
            </div>

            {/* Act Narrative Text Card */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl text-xs md:text-sm text-zinc-300 leading-relaxed font-sans text-center">
              {introStep === 0 && t.introAct1Text}
              {introStep === 1 && t.introAct2Text}
              {introStep === 2 && t.introAct3Text}
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    soundManager.playClick();
                    setIntroStep(step);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    introStep === step ? 'w-8 bg-amber-400' : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <button
              onClick={() => {
                soundManager.playClick();
                setMode('menu');
              }}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer"
            >
              {language === 'vi' ? 'Quay Lại Menu' : 'Back to Menu'}
            </button>

            {introStep < 2 ? (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIntroStep((prev) => prev + 1);
                }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 cursor-pointer"
              >
                <span>{t.introNext}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  soundManager.playHorn();
                  onStartNewGame(false);
                }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>{t.introBeginRun}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. LOAD GAME MODAL */}
      {/* ======================================================== */}
      {activeSubModal === 'load' && (
        <SaveLoadModal
          engine={engine}
          initialMode="load"
          onClose={() => {
            setActiveSubModal('none');
            SaveManager.getLatestValidSave().then((latest) => {
              setHasSave(!!latest);
              setLatestSave(latest);
            });
          }}
          onLoaded={() => {
            setActiveSubModal('none');
            onContinueGame();
          }}
          language={language}
        />
      )}

      {/* ======================================================== */}
      {/* 5. SETTINGS MODAL */}
      {/* ======================================================== */}
      {activeSubModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveSubModal('none')}
          language={language}
          onLanguageChange={onSetLanguage}
          onApplySettings={(s) => {
            setCrtFilter(s.crtFilter);
            setScreenShake(s.screenShake);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 6. CREDITS MODAL */}
      {/* ======================================================== */}
      {activeSubModal === 'credits' && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold uppercase text-zinc-100">
                  {t.creditsTitle}
                </h3>
              </div>
              <button
                onClick={() => setActiveSubModal('none')}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold block">{t.creditsRoleLead}</span>
                <p className="text-zinc-200 font-semibold">The Last Track Design Core</p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold block">{t.creditsRoleArt}</span>
                <p className="text-zinc-200 font-semibold">2D Top-Down Angled Survival Pixel Art Engine</p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block">{t.creditsRoleSound}</span>
                <p className="text-zinc-200 font-semibold">Procedural Web Audio Engine & Steam Harmonics</p>
              </div>

              <div className="text-[11px] text-zinc-400 italic pt-1 text-center">
                "{t.creditsDedication}"
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setActiveSubModal('none')}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold uppercase rounded-xl transition-all shadow-md cursor-pointer"
              >
                {t.creditsClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
