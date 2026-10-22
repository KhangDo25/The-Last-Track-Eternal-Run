import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameEngine } from './game/gameEngine';
import { GameScene, InteractionTarget, WeatherType } from './game/pixelScene';
import { GameHUD } from './components/GameHUD';
import { CabinControlsModal } from './components/CabinControlsModal';
import { WorkbenchModal } from './components/WorkbenchModal';
import { StorageModal } from './components/StorageModal';
import { DebugModal } from './components/DebugModal';
import { UnityProjectViewer } from './components/UnityProjectViewer';
import { soundManager } from './audio/soundManager';
import { Language, TRANSLATIONS } from './i18n/translations';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Bug,
  Compass,
  Code2,
  Play,
  Flame,
  Languages,
  CloudSnow,
  CloudRain,
  Sparkles,
  Menu,
  Save,
  Pause,
  Settings,
} from 'lucide-react';
import { MainMenu } from './components/MainMenu';
import { SaveLoadModal } from './components/SaveLoadModal';
import { PauseMenuModal } from './components/PauseMenuModal';
import { SettingsModal } from './components/SettingsModal';
import { SaveManager } from './game/saveManager';
import { SettingsManager } from './utils/settingsManager';

export default function App() {
  const [engine] = useState(() => new GameEngine());
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameSceneRef = useRef<GameScene | null>(null);

  // Language state (default Vietnamese per user request)
  const [language, setLanguage] = useState<Language>('vi');
  const t = TRANSLATIONS[language];

  // Dynamic Weather state
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('blizzard');

  // CRT Filter visual setting
  const [crtFilter, setCrtFilter] = useState<boolean>(() => SettingsManager.getSettings().crtFilter);

  // View switch: 'Game' | 'UnityCode'
  const [currentView, setCurrentView] = useState<'Game' | 'UnityCode'>('Game');

  const [activeModal, setActiveModal] = useState<
    'None' | 'Throttle' | 'Workbench' | 'Storage' | 'Debug' | 'SaveLoad' | 'Pause' | 'Settings'
  >('None');
  const [modalReturnTarget, setModalReturnTarget] = useState<'None' | 'Pause'>('None');
  const [saveLoadInitialMode, setSaveLoadInitialMode] = useState<'save' | 'load'>('save');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [interactTarget, setInteractTarget] = useState<InteractionTarget | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 1.6, z: 6 });
  const [, setFrameTick] = useState<number>(0);

  // Keep ref for activeModal so requestAnimationFrame loop reads current state without tearing down scene
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;

  // Sync scene language when state changes
  useEffect(() => {
    if (gameSceneRef.current) {
      gameSceneRef.current.language = language;
    }
  }, [language]);

  // Subscribe to persistent settings changes
  useEffect(() => {
    const unsub = SettingsManager.subscribe((s) => {
      setCrtFilter(s.crtFilter);
      if (gameSceneRef.current) {
        gameSceneRef.current.applySettings({
          pixelArtScaling: s.pixelArtScaling,
          screenShake: s.screenShake,
        });
      }
    });
    return unsub;
  }, []);

  const handleToggleWeather = () => {
    if (gameSceneRef.current) {
      const next = gameSceneRef.current.toggleWeather();
      setCurrentWeather(next);
      engine.setWeather(next, true);
    }
  };

  // Initialize Three.js scene once container is mounted
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new GameScene(canvasContainerRef.current, engine);
    scene.language = language;

    // Apply initial persistent settings to scene and audio
    const initialSettings = SettingsManager.getSettings();
    scene.applySettings({
      pixelArtScaling: initialSettings.pixelArtScaling,
      screenShake: initialSettings.screenShake,
    });
    soundManager.setMasterVolume(initialSettings.masterVolume);
    soundManager.setMusicVolume(initialSettings.musicVolume);
    soundManager.setSfxVolume(initialSettings.sfxVolume);

    scene.onWeatherChange = (w) => {
      setCurrentWeather(w);
      if (engine.currentWeather !== w) {
        engine.setWeather(w, false);
      }
    };
    engine.onWeatherChange = (w) => {
      setCurrentWeather(w);
      if (gameSceneRef.current && gameSceneRef.current.getWeather() !== w) {
        gameSceneRef.current.setWeather(w);
      }
    };
    gameSceneRef.current = scene;

    // Hook callbacks
    scene.onOpenUI = (uiType) => {
      setActiveModal(uiType);
    };

    scene.onLootAction = (crateId) => {
      engine.lootStationCrate(crateId);
    };

    let lastTime = performance.now();
    let animId: number;

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      if (gameStarted) {
        const isPaused = activeModalRef.current === 'Pause' || engine.gameState === 'Paused';

        if (!isPaused) {
          // Step engine physics & game loop
          engine.update(dt);

          // Update station visuals
          if (engine.currentStation) {
            scene.setStationVisible(true);
          } else {
            scene.setStationVisible(false);
          }

          // Synchronize enemies
          scene.updateEnemies(engine.enemies);

          // Update 3D render
          scene.update(dt, engine.trainStats.currentSpeed, engine.turret);

          // Update HUD state
          setInteractTarget(scene.currentInteractable);
          setIsMounted(scene.isMountedToTurret);
          setPlayerPos({
            x: scene.playerPos.x,
            y: scene.playerPos.y,
            z: scene.playerPos.z,
          });
        } else {
          // When paused: render static scene without ticking physics, enemies, weather, or timers!
          scene.update(0, 0, engine.turret);
        }
      }

      setFrameTick((tick: number) => tick + 1);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      scene.destroy();
      gameSceneRef.current = null;
    };
  }, [engine, gameStarted]);

  // Handle global F1-F8 keyboard shortcuts per Section 58
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F1') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'Debug' ? 'None' : 'Debug'));
      } else if (e.code === 'F2') {
        e.preventDefault();
        engine.debugAddFuel();
      } else if (e.code === 'F3') {
        e.preventDefault();
        engine.debugAddResources();
      } else if (e.code === 'F4') {
        e.preventDefault();
        engine.debugSpawnEnemy();
      } else if (e.code === 'F5') {
        e.preventDefault();
        engine.saveToSlot('slot_1', 'manual');
      } else if (e.code === 'F6') {
        e.preventDefault();
        engine.debugRepairTrain();
      } else if (e.code === 'F7') {
        e.preventDefault();
        engine.debugToggleGodMode();
      } else if (e.code === 'F8') {
        e.preventDefault();
        engine.debugTriggerStation();
      } else {
        const pauseKey = SettingsManager.getSettings().controls.pause || 'Escape';
        if (e.code === 'Escape' || e.code === 'KeyP' || e.code === pauseKey) {
          if (!gameStarted) return;
          e.preventDefault();
          if (activeModal === 'Pause') {
            engine.gameState = 'Playing';
            soundManager.resumeAudio();
            setActiveModal('None');
          } else if (activeModal !== 'None') {
            if (modalReturnTarget === 'Pause') {
              setActiveModal('Pause');
            } else {
              setActiveModal('None');
            }
          } else if (isMounted && gameSceneRef.current && e.code === 'Escape') {
            gameSceneRef.current.isMountedToTurret = false;
          } else {
            engine.gameState = 'Paused';
            soundManager.pauseAudio();
            setModalReturnTarget('None');
            setActiveModal('Pause');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, activeModal, isMounted, gameStarted, modalReturnTarget]);

  // Handle manual turret firing with Left Click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (activeModalRef.current !== 'None' || engine.gameState === 'Paused') return;
      if (e.button === 0 && isMounted && gameSceneRef.current) {
        const fired = engine.fireTurretManual({ x: 0, y: 0, z: -1 });
        if (fired) {
          gameSceneRef.current.spawnTracer(
            gameSceneRef.current.playerPos.clone(),
            new THREE.Vector3(0, 0, -1)
          );
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [isMounted, engine]);

  const handleStartNewGame = async (skipIntro = false) => {
    engine.setupPrologue();
    if (skipIntro) {
      engine.advancePrologueCutscene();
    }
    soundManager.startEngineSound();
    soundManager.playHorn();
    await engine.saveToSlot('slot_1', 'manual');
    setGameStarted(true);
  };

  const handleContinueGame = async () => {
    const latest = await SaveManager.getLatestValidSave();
    if (latest) {
      const res = await engine.loadFromSlot(latest.slotId);
      if (res.success) {
        soundManager.startEngineSound();
        soundManager.playHorn();
        setGameStarted(true);
        return;
      }
    }
    const loaded = engine.loadGameFromStorage();
    if (loaded) {
      soundManager.startEngineSound();
      soundManager.playHorn();
      setGameStarted(true);
    } else {
      handleStartNewGame(false);
    }
  };

  const handleToggleMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    soundManager.setMuted(next);
  };

  const handleResetRun = () => {
    window.location.reload();
  };

  return (
    <div className="relative w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans">
      {/* Universal Top Bar Contract (Section 2) */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between z-40 select-none">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <h1 className="text-sm font-bold tracking-wider uppercase text-zinc-100 font-mono">
            {t.appTitle}
          </h1>
        </div>

        {/* Zone 2: Navigation Links / Segmented View Control */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
          <button
            onClick={() => setCurrentView('Game')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentView === 'Game'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {t.view3DGame}
          </button>

          <button
            onClick={() => setCurrentView('UnityCode')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentView === 'UnityCode'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            {t.viewUnityCode}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Dynamic Weather Toggle */}
          <button
            onClick={handleToggleWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors font-bold cursor-pointer"
            title={`${t.weather}: ${
              currentWeather === 'blizzard'
                ? t.weatherBlizzard
                : currentWeather === 'rain'
                ? t.weatherRain
                : t.weatherClear
            } (${t.weatherToggleHint})`}
          >
            {currentWeather === 'blizzard' && <CloudSnow className="w-3.5 h-3.5 text-cyan-400" />}
            {currentWeather === 'rain' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
            {currentWeather === 'clear' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden md:inline">
              {currentWeather === 'blizzard'
                ? t.weatherBlizzard
                : currentWeather === 'rain'
                ? t.weatherRain
                : t.weatherClear}
            </span>
            <span className="text-[10px] text-zinc-500 font-normal px-1 py-0.2 rounded bg-zinc-800">
              [T]
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage((l) => (l === 'vi' ? 'en' : 'vi'))}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors font-bold cursor-pointer"
            title="Chuyển đổi Tiếng Việt / English"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title={isAudioMuted ? t.unmuteBtn : t.muteBtn}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {gameStarted && (
            <button
              onClick={() => {
                setSaveLoadInitialMode('save');
                setModalReturnTarget('None');
                setActiveModal('SaveLoad');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer font-bold"
              title={language === 'vi' ? 'Lưu / Nạp Game (3 Slot Chiến Dịch)' : 'Save / Load Game'}
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{language === 'vi' ? 'Lưu / Nạp' : 'Save / Load'}</span>
            </button>
          )}

          {gameStarted && (
            <button
              onClick={() => {
                engine.gameState = 'Paused';
                soundManager.pauseAudio();
                setModalReturnTarget('None');
                setActiveModal('Pause');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer font-bold"
              title={language === 'vi' ? 'Tạm Dừng / Menu Hệ Thống [ESC / P]' : 'Pause Game / Menu [ESC / P]'}
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{language === 'vi' ? 'Tạm Dừng' : 'Pause'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setModalReturnTarget(activeModal === 'Pause' ? 'Pause' : 'None');
              setActiveModal('Settings');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer font-bold"
            title={language === 'vi' ? 'Cài Đặt Hệ Thống' : 'System Settings'}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">{language === 'vi' ? 'Cài Đặt' : 'Settings'}</span>
          </button>

          <button
            onClick={() => setActiveModal('Debug')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <Bug className="w-3.5 h-3.5 text-red-400" />
            <span>{t.debugBtn}</span>
          </button>

          <button
            onClick={handleResetRun}
            className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title={t.resetBtn}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* VIEW 1: 3D First-Person Game Viewport */}
        <div className={`w-full h-full relative ${currentView === 'Game' ? 'block' : 'hidden'}`}>
          <div ref={canvasContainerRef} className="w-full h-full cursor-crosshair" />

          {/* First Person HUD Overlay */}
          {gameStarted && (
            <GameHUD
              engine={engine}
              interactTarget={interactTarget}
              isMounted={isMounted}
              onDismount={() => {
                if (gameSceneRef.current) {
                  gameSceneRef.current.isMountedToTurret = false;
                }
              }}
              language={language}
              currentWeather={currentWeather}
              onToggleWeather={handleToggleWeather}
              onOpenPause={() => {
                engine.gameState = 'Paused';
                soundManager.pauseAudio();
                setModalReturnTarget('None');
                setActiveModal('Pause');
              }}
              onOpenSave={() => {
                setSaveLoadInitialMode('save');
                setModalReturnTarget('None');
                setActiveModal('SaveLoad');
              }}
              onOpenSettings={() => {
                setModalReturnTarget('None');
                setActiveModal('Settings');
              }}
            />
          )}

          {/* Atmospheric Opening Sequence & Main Menu */}
          {!gameStarted && (
            <MainMenu
              language={language}
              onSetLanguage={setLanguage}
              onStartNewGame={handleStartNewGame}
              onContinueGame={handleContinueGame}
              engine={engine}
            />
          )}

          {/* Game Over Modal */}
          {engine.gameState === 'GameOver' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50 font-mono">
              <div className="bg-zinc-950 border border-red-800/80 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold shadow-lg">
                  ☠
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-red-400 uppercase">
                    {t.gameOverTitle}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {t.gameOverDesc}
                  </p>
                </div>
                <button
                  onClick={handleResetRun}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {t.restartRunBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VIEW 2: Unity 6 C# Project Scripts & Architecture Explorer */}
        {currentView === 'UnityCode' && <UnityProjectViewer language={language} />}
      </div>

      {/* MODALS */}
      {activeModal === 'Throttle' && (
        <CabinControlsModal
          engine={engine}
          onClose={() => setActiveModal('None')}
          language={language}
        />
      )}

      {activeModal === 'Workbench' && (
        <WorkbenchModal
          engine={engine}
          onClose={() => setActiveModal('None')}
          language={language}
        />
      )}

      {activeModal === 'Storage' && (
        <StorageModal
          engine={engine}
          onClose={() => setActiveModal('None')}
          language={language}
        />
      )}

      {activeModal === 'Debug' && (
        <DebugModal
          engine={engine}
          playerPos={playerPos}
          onClose={() => setActiveModal('None')}
          onRefresh={() => setFrameTick((tick: number) => tick + 1)}
          language={language}
        />
      )}

      {activeModal === 'Pause' && (
        <PauseMenuModal
          engine={engine}
          onResume={() => {
            engine.gameState = 'Playing';
            soundManager.resumeAudio();
            setActiveModal('None');
          }}
          onOpenSave={() => {
            setSaveLoadInitialMode('save');
            setModalReturnTarget('Pause');
            setActiveModal('SaveLoad');
          }}
          onOpenLoad={() => {
            setSaveLoadInitialMode('load');
            setModalReturnTarget('Pause');
            setActiveModal('SaveLoad');
          }}
          onOpenSettings={() => {
            setModalReturnTarget('Pause');
            setActiveModal('Settings');
          }}
          onReturnToMainMenu={async (saveFirst) => {
            if (saveFirst) {
              await engine.saveToSlot('slot_auto', 'auto_checkpoint');
            }
            soundManager.pauseAudio();
            engine.gameState = 'Playing';
            setGameStarted(false);
            setActiveModal('None');
          }}
          language={language}
        />
      )}

      {activeModal === 'SaveLoad' && (
        <SaveLoadModal
          engine={engine}
          initialMode={saveLoadInitialMode}
          onClose={() => setActiveModal(modalReturnTarget)}
          onLoaded={() => {
            engine.gameState = 'Playing';
            soundManager.startEngineSound();
            soundManager.resumeAudio();
            setGameStarted(true);
            setActiveModal('None');
          }}
          language={language}
        />
      )}

      {activeModal === 'Settings' && (
        <SettingsModal
          onClose={() => setActiveModal(modalReturnTarget)}
          language={language}
          onLanguageChange={setLanguage}
          onApplySettings={(s) => {
            setCrtFilter(s.crtFilter);
            if (gameSceneRef.current) {
              gameSceneRef.current.applySettings({
                pixelArtScaling: s.pixelArtScaling,
                screenShake: s.screenShake,
              });
            }
          }}
        />
      )}
    </div>
  );
}
