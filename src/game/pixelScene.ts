import * as THREE from 'three';
import { soundManager } from '../audio/soundManager';
import { EnemyEntity, TurretState } from '../types/game';
import { Language, TRANSLATIONS } from '../i18n/translations';

export interface InteractionTarget {
  type: 'Throttle' | 'Brake' | 'Turret' | 'Workbench' | 'Storage' | 'Loot' | 'Horn';
  id?: string;
  name: string;
  position: THREE.Vector3;
  distance: number;
}

export type WeatherType = 'clear' | 'rain' | 'blizzard';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  damage: number;
  isEnemy?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha?: number;
  decay?: number;
  type?: 'smoke' | 'spark' | 'snow' | 'rain' | 'debris' | 'casing' | 'blood';
  gravity?: number;
  bounce?: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

// 2D Pixel Art Survival Engine for "The Last Track: Eternal Run"
export class GameScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDestroyed = false;

  // Language
  public language: Language = 'vi';

  // Weather System
  public currentWeather: WeatherType = 'blizzard';
  public onWeatherChange?: (weather: WeatherType) => void;
  private weatherTransitionTimer = 0;
  private lightningTimer = 0;
  private lightningAlpha = 0;

  // Player state in 2D
  // playerPos.x: horizontal offset from train centerline (-40 to 40 on train, or up to 140 on station platform)
  // playerPos.z: vertical position along train/station (-160 to 180)
  public playerPos = new THREE.Vector3(0, 1.6, 6);
  public cameraYaw = 0;
  public cameraPitch = 0;
  public isMountedToTurret = false;
  public isPointerLocked = false;
  public currentInteractable: InteractionTarget | null = null;

  // Callbacks
  public onLootAction?: (crateId: string) => void;
  public onOpenUI?: (uiType: 'Throttle' | 'Workbench' | 'Storage') => void;

  // Input states
  private keys: Record<string, boolean> = {};
  private mousePos = { x: 0, y: 0 };
  private isMouseDown = false;

  // World scrolling & track state
  private trackScrollY = 0;
  private stationVisible = false;
  private stationY = -600; // Scrolls into view when arriving at station
  private stationTargetY = 280;

  // Entities & Combat in 2D
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private explosions: Explosion[] = [];
  private damageNumbers: DamageNumber[] = [];
  private localEnemies: EnemyEntity[] = [];
  private enemySprites: Map<string, { frame: number; animTimer: number; hitFlash: number }> = new Map();

  // Screen shake
  private screenShake = 0;

  // Procedural Scenery & Hazards
  private roadDecorations: { x: number; y: number; type: 'pole' | 'rock' | 'ruin' | 'tree' | 'hazard' | 'puddle'; variant: number }[] = [];
  private stars: { x: number; y: number; brightness: number; speed: number }[] = [];

  // Turret tracking
  private turretAngle = 0;
  private turretRecoil = 0;
  private muzzleFlashTimer = 0;

  // Procedural Sprite Cache
  private spriteCache: Record<string, HTMLCanvasElement> = {};

  // Audio timings
  private nextTrackCreak = 0;
  private nextWindGust = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // Create Canvas with crisp pixel art settings
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'w-full h-full block image-rendering-pixelated';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.outline = 'none';

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    this.container.appendChild(this.canvas);
    this.handleResize();

    // Generate Pixel Art Sprite Textures
    this.generatePixelArtSprites();

    // Initialize stars & decorative terrain objects
    this.initWorldDecorations();

    // Event listeners
    this.setupEventListeners();
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.imageSmoothingEnabled = false;
  };

  public setWeather(weather: WeatherType) {
    const from = this.currentWeather;
    this.currentWeather = weather;
    soundManager.triggerWeatherTransition(weather, from);
    if (this.onWeatherChange) {
      this.onWeatherChange(weather);
    }
  }

  public toggleWeather(): WeatherType {
    const sequence: WeatherType[] = ['blizzard', 'rain', 'clear'];
    const idx = sequence.indexOf(this.currentWeather);
    const next = sequence[(idx + 1) % sequence.length];
    this.setWeather(next);
    return next;
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  public setStationVisible(visible: boolean) {
    this.stationVisible = visible;
  }

  public updateEnemies(enemies: EnemyEntity[]) {
    this.localEnemies = enemies;
  }

  public spawnTracer(start: THREE.Vector3, direction: THREE.Vector3) {
    // Spawn tracer bullet in 2D towards mouse/direction
    const trainCenterX = this.canvas.width / 2;
    const turretY = this.canvas.height / 2 - 40;

    const angle = this.isMountedToTurret
      ? Math.atan2(this.mousePos.y - turretY, this.mousePos.x - trainCenterX)
      : -Math.PI / 2 + direction.x * 0.8;

    const speed = 1200;
    this.projectiles.push({
      x: trainCenterX + Math.cos(angle) * 35,
      y: turretY + Math.sin(angle) * 35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      damage: 28,
    });

    this.muzzleFlashTimer = 0.08;
    this.turretRecoil = 8;
    this.screenShake = Math.max(this.screenShake, 3);

    // Eject spent brass casing
    this.particles.push({
      x: trainCenterX - Math.sin(angle) * 12,
      y: turretY + Math.cos(angle) * 12,
      vx: -Math.sin(angle) * (100 + Math.random() * 80) + (Math.random() - 0.5) * 40,
      vy: Math.cos(angle) * (100 + Math.random() * 80) + (Math.random() - 0.5) * 40,
      life: 1.2,
      maxLife: 1.2,
      color: '#fbbf24',
      size: 3,
      type: 'casing',
      gravity: 300,
      bounce: 0.4,
    });
  }

  // Generate procedural pixel-art sprite assets into offscreen canvases
  private generatePixelArtSprites() {
    // Helper to create crisp pixel sprite canvas
    const makeSprite = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      return c;
    };

    // 1. LOCOMOTIVE SPRITE (Top-down 3/4 angled armored dreadnought locomotive)
    this.spriteCache['locomotive'] = makeSprite(72, 130, (ctx) => {
      // Dark chassis base & plow
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(10, 8, 52, 114);

      // Cowcatcher / heavy wedge plow at front (top)
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.lineTo(68, 22);
      ctx.lineTo(60, 26);
      ctx.lineTo(36, 8);
      ctx.lineTo(12, 26);
      ctx.lineTo(4, 22);
      ctx.closePath();
      ctx.fill();

      // Plow iron spikes & reinforced ribs
      ctx.fillStyle = '#71717a';
      ctx.fillRect(34, 0, 4, 18);
      ctx.fillRect(18, 12, 3, 12);
      ctx.fillRect(51, 12, 3, 12);

      // Boiler body (dark rusted iron cylinder with rivets)
      ctx.fillStyle = '#27272a';
      ctx.fillRect(16, 26, 40, 60);

      // Boiler highlights & shadow bands
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(20, 26, 8, 60); // highlight strip
      ctx.fillStyle = '#52525b';
      ctx.fillRect(16, 36, 40, 3); // iron band 1
      ctx.fillRect(16, 54, 40, 3); // iron band 2
      ctx.fillRect(16, 72, 40, 3); // iron band 3

      // Smokestack chimney
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(36, 40, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f'; // soot rust ring
      ctx.beginPath();
      ctx.arc(36, 40, 6, 0, Math.PI * 2);
      ctx.fill();

      // Steam dome
      ctx.fillStyle = '#d97706'; // brass dome
      ctx.beginPath();
      ctx.arc(36, 64, 7, 0, Math.PI * 2);
      ctx.fill();

      // Locomotive Cabin (rear part)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(12, 86, 48, 38);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(14, 88, 44, 4); // roof ridge

      // Cabin View Slit Windows (warm orange amber interior glow)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(18, 92, 14, 5);
      ctx.fillRect(40, 92, 14, 5);

      // Side walkways with yellow safety hazard stripes
      for (let y = 30; y < 110; y += 8) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(10, y, 5, 4);
        ctx.fillRect(57, y, 5, 4);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(10, y + 4, 5, 4);
        ctx.fillRect(57, y + 4, 5, 4);
      }

      // High-beam Headlight housings on front
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(22, 18, 6, 6);
      ctx.fillRect(44, 18, 6, 6);
    });

    // 2. DEFENSE CARRIAGE (Gatling Gun Carriage base)
    this.spriteCache['carriage_defense'] = makeSprite(68, 110, (ctx) => {
      // Base armored body
      ctx.fillStyle = '#18181b';
      ctx.fillRect(10, 6, 48, 98);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(14, 10, 40, 90);

      // Side armor plates with rivets
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(8, 16, 6, 78);
      ctx.fillRect(54, 16, 6, 78);

      // Rivets
      ctx.fillStyle = '#a1a1aa';
      for (let y = 20; y < 90; y += 12) {
        ctx.fillRect(9, y, 2, 2);
        ctx.fillRect(57, y, 2, 2);
      }

      // Circular Turret Ring Mount
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(34, 55, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#52525b';
      ctx.beginPath();
      ctx.arc(34, 55, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(34, 55, 14, 0, Math.PI * 2);
      ctx.fill();

      // Ammo feed hopper box
      ctx.fillStyle = '#b45309';
      ctx.fillRect(18, 80, 12, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, 82, 8, 2); // brass ammo belt link
    });

    // 3. TURRET CANNON SPRITE (Dual Gatling Barrels that rotate 360 deg)
    this.spriteCache['turret_cannon'] = makeSprite(44, 54, (ctx) => {
      // Center pivot at (22, 27)
      // Gun base mantlet
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(14, 20, 16, 14);

      // Armored cupola
      ctx.fillStyle = '#52525b';
      ctx.beginPath();
      ctx.arc(22, 27, 8, 0, Math.PI * 2);
      ctx.fill();

      // Gunner optic slit (red sensor eye)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(20, 24, 4, 3);

      // Dual heavy Gatling barrels extending forward (top)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(16, 0, 4, 22);
      ctx.fillRect(24, 0, 4, 22);

      // Barrel muzzle brakes & clamps
      ctx.fillStyle = '#71717a';
      ctx.fillRect(15, 0, 6, 4);
      ctx.fillRect(23, 0, 6, 4);
      ctx.fillRect(15, 10, 14, 2); // barrel connector brace
    });

    // 4. WORKSHOP CARRIAGE
    this.spriteCache['carriage_workshop'] = makeSprite(68, 110, (ctx) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(10, 6, 48, 98);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(14, 10, 40, 90);

      // Corrugated metal roof ridges
      for (let y = 14; y < 96; y += 8) {
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(14, y, 40, 4);
      }

      // Workshop hatch & vent
      ctx.fillStyle = '#475569';
      ctx.fillRect(22, 24, 24, 20);
      ctx.fillStyle = '#38bdf8'; // blue tool bench glow
      ctx.fillRect(26, 28, 16, 12);

      // Gantry Crane rail
      ctx.fillStyle = '#eab308';
      ctx.fillRect(18, 62, 32, 4);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(32, 66, 4, 8); // crane hoist
    });

    // 5. STORAGE / CARGO CARRIAGE
    this.spriteCache['carriage_storage'] = makeSprite(68, 110, (ctx) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(10, 6, 48, 98);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(14, 10, 40, 90);

      // Metal container boxes strapped onto carriage deck
      // Box 1 (scrap metal - rusted brown)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(18, 16, 32, 24);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(20, 18, 28, 4);

      // Box 2 (Fuel drums - blue)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(26, 56, 8, 0, Math.PI * 2);
      ctx.arc(42, 56, 8, 0, Math.PI * 2);
      ctx.fill();

      // Box 3 (Ammo / Component chest - olive drab)
      ctx.fillStyle = '#14532d';
      ctx.fillRect(18, 72, 32, 20);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(32, 78, 4, 8); // stencil marking
    });

    // 6. POWER CARRIAGE (Generator)
    this.spriteCache['carriage_power'] = makeSprite(68, 104, (ctx) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(10, 6, 48, 92);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(14, 10, 40, 84);

      // Giant Generator Ventilation Fan Grille
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(34, 40, 16, 0, Math.PI * 2);
      ctx.fill();

      // Fan blades
      ctx.fillStyle = '#71717a';
      ctx.fillRect(32, 26, 4, 28);
      ctx.fillRect(20, 38, 28, 4);

      // High voltage battery bank (flickering blue glow)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(18, 66, 14, 20);
      ctx.fillRect(36, 66, 14, 20);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(20, 70, 10, 12);
      ctx.fillRect(38, 70, 10, 12);
    });

    // 7. SURVIVOR PLAYER SPRITE (Post-apocalyptic engineer in gas mask & trenchcoat)
    this.spriteCache['player'] = makeSprite(24, 28, (ctx) => {
      // Trenchcoat body
      ctx.fillStyle = '#451a03'; // heavy leather/canvas coat
      ctx.fillRect(6, 10, 12, 14);

      // Gas Mask / Helmet Head
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(12, 8, 6, 0, Math.PI * 2);
      ctx.fill();

      // Gas mask dual circular eye filters (glowing cyan lenses)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(9, 6, 3, 3);
      ctx.fillRect(13, 6, 3, 3);

      // Gas mask canister
      ctx.fillStyle = '#71717a';
      ctx.fillRect(11, 10, 3, 3);

      // Utility backpack & weapon strap
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(4, 12, 3, 8);
      ctx.fillRect(17, 12, 3, 8);
    });

    // 8. ENEMY 1: CHASER (Fast mutant quadruped)
    this.spriteCache['enemy_chaser'] = makeSprite(32, 36, (ctx) => {
      // Twisted irradiated flesh & spine
      ctx.fillStyle = '#831843'; // corrupted crimson
      ctx.fillRect(10, 10, 12, 18);

      // Bony spine ridges
      ctx.fillStyle = '#fbcfe8';
      for (let y = 12; y < 26; y += 4) {
        ctx.fillRect(14, y, 4, 2);
      }

      // Predatory head & fangs
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(11, 4, 10, 8);
      // Glowing yellow mutant eyes
      ctx.fillStyle = '#fde047';
      ctx.fillRect(12, 6, 2, 2);
      ctx.fillRect(18, 6, 2, 2);

      // Claws / legs
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(4, 6, 6, 4);
      ctx.fillRect(22, 6, 6, 4);
      ctx.fillRect(4, 22, 6, 5);
      ctx.fillRect(22, 22, 6, 5);
    });

    // 9. ENEMY 2: HULL-BREAKER (Heavy armored raider brute with hammer)
    this.spriteCache['enemy_hullbreaker'] = makeSprite(44, 48, (ctx) => {
      // Heavy scrap metal chestplate
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(12, 14, 20, 22);

      // Spiked iron pauldrons
      ctx.fillStyle = '#18181b';
      ctx.fillRect(6, 12, 8, 12);
      ctx.fillRect(30, 12, 8, 12);
      ctx.fillStyle = '#dc2626'; // blood red spikes
      ctx.fillRect(8, 8, 4, 4);
      ctx.fillRect(32, 8, 4, 4);

      // Welder's heavy mask with red visor slit
      ctx.fillStyle = '#52525b';
      ctx.fillRect(17, 6, 10, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(19, 9, 6, 2);

      // Giant industrial sledgehammer in hand
      ctx.fillStyle = '#78350f';
      ctx.fillRect(36, 4, 4, 34); // long handle
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(32, 2, 12, 8); // steel head
    });

    // 10. ENEMY 3: PHANTOM (Hovering biomechanical wraith drone)
    this.spriteCache['enemy_phantom'] = makeSprite(36, 40, (ctx) => {
      // Aerodynamic stealth chassis
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(18, 4);
      ctx.lineTo(32, 28);
      ctx.lineTo(24, 32);
      ctx.lineTo(18, 24);
      ctx.lineTo(12, 32);
      ctx.lineTo(4, 28);
      ctx.closePath();
      ctx.fill();

      // Pulsating central sensor core
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(18, 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Plasma stabilizer jet glow
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(16, 26, 4, 8);
    });

    // 11. TRACK HAZARD: RUSTED FRACTURE & DEBRIS
    this.spriteCache['hazard_debris'] = makeSprite(48, 36, (ctx) => {
      // Broken rails & scrap pile
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 12, 32, 12);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 6, 22, 18);
      // Warning yellow hazard reflector
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, 10, 8, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(22, 12, 4, 4);
    });

    // 12. STATION PLATFORM TILES
    this.spriteCache['station_platform'] = makeSprite(90, 120, (ctx) => {
      // Cracked weathered concrete
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 0, 90, 120);

      // Pavement tile lines
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      for (let y = 0; y < 120; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(90, y);
        ctx.stroke();
      }

      // High-visibility yellow safety edge stripe (near train track)
      for (let y = 0; y < 120; y += 12) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(0, y, 6, 6);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, y + 6, 6, 6);
      }

      // Blood / grease stains
      ctx.fillStyle = 'rgba(24, 24, 27, 0.4)';
      ctx.beginPath();
      ctx.arc(45, 60, 18, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Populate background decor and stars
  private initWorldDecorations() {
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        brightness: 0.3 + Math.random() * 0.7,
        speed: 0.1 + Math.random() * 0.3,
      });
    }

    this.roadDecorations = [];
    for (let i = 0; i < 35; i++) {
      const isLeft = Math.random() > 0.5;
      const x = isLeft ? 60 + Math.random() * 200 : 700 + Math.random() * 200;
      const y = Math.random() * 1200 - 300;
      const types: ('pole' | 'rock' | 'ruin' | 'tree' | 'hazard' | 'puddle')[] = [
        'pole',
        'rock',
        'ruin',
        'tree',
        'puddle',
      ];
      this.roadDecorations.push({
        x,
        y,
        type: types[Math.floor(Math.random() * types.length)],
        variant: Math.floor(Math.random() * 4),
      });
    }
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.handleResize);

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'KeyE') {
      this.handleInteract();
    } else if (e.code === 'KeyT') {
      this.toggleWeather();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleInteract() {
    if (!this.currentInteractable) return;
    soundManager.playClick();
    const type = this.currentInteractable.type;

    if (type === 'Turret') {
      this.isMountedToTurret = !this.isMountedToTurret;
    } else if (type === 'Throttle' || type === 'Workbench' || type === 'Storage') {
      if (this.onOpenUI) {
        this.onOpenUI(type);
      }
    } else if (type === 'Loot' && this.currentInteractable.id) {
      if (this.onLootAction) {
        this.onLootAction(this.currentInteractable.id);
      }
      // Floating text pickup
      this.damageNumbers.push({
        x: this.canvas.width / 2 + 100,
        y: this.canvas.height / 2,
        text: '+RESOURCES LOOTED!',
        color: '#22c55e',
        life: 1.5,
        maxLife: 1.5,
      });
      soundManager.playLootSound();
    } else if (type === 'Horn') {
      soundManager.playHorn();
      this.screenShake = 6;
    }
  }

  // Check interactables relative to player's 2D position
  private checkInteractables(trainCenterX: number, trainCenterY: number) {
    const t = TRANSLATIONS[this.language];

    // Interactable hotspots on train & station
    const interactables: InteractionTarget[] = [
      {
        type: 'Throttle',
        name: t.interactThrottle,
        position: new THREE.Vector3(0, 1.7, 7.6),
        distance: 0,
      },
      {
        type: 'Horn',
        name: t.interactHorn,
        position: new THREE.Vector3(-0.8, 1.9, 7.6),
        distance: 0,
      },
      {
        type: 'Turret',
        name: this.isMountedToTurret ? t.interactDismountTurret : t.interactMountTurret,
        position: new THREE.Vector3(0, 3.2, -14.5),
        distance: 0,
      },
      {
        type: 'Workbench',
        name: t.interactWorkbench,
        position: new THREE.Vector3(-0.8, 1.5, -4.5),
        distance: 0,
      },
      {
        type: 'Storage',
        name: t.interactStorage,
        position: new THREE.Vector3(0, 1.5, -24.5),
        distance: 0,
      },
    ];

    if (this.stationVisible) {
      interactables.push(
        {
          type: 'Loot',
          id: 'crate_scrap',
          name: t.interactLootScrap,
          position: new THREE.Vector3(4.2, 1.4, 10),
          distance: 0,
        },
        {
          type: 'Loot',
          id: 'crate_fuel',
          name: t.interactLootFuel,
          position: new THREE.Vector3(4.2, 1.4, 0),
          distance: 0,
        },
        {
          type: 'Loot',
          id: 'crate_ammo',
          name: t.interactLootAmmo,
          position: new THREE.Vector3(4.2, 1.4, -10),
          distance: 0,
        }
      );
    }

    // 2D distance check
    let closest: InteractionTarget | null = null;
    let minDist = 3.5;

    for (const item of interactables) {
      const dist = this.playerPos.distanceTo(item.position);
      if (dist < minDist) {
        minDist = dist;
        closest = { ...item, distance: dist };
      }
    }

    this.currentInteractable = closest;
  }

  // Update Player Movement along the train walkways or station platform
  private updatePlayerMovement(delta: number) {
    if (this.isMountedToTurret) return;

    const moveSpeed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 6.5 : 3.8;
    const moveDir = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.playerPos.addScaledVector(moveDir, moveSpeed * delta);
    }

    // Boundary constraints in train & platform
    if (!this.stationVisible) {
      this.playerPos.x = Math.max(-1.1, Math.min(1.1, this.playerPos.x));
      this.playerPos.z = Math.max(-27.5, Math.min(8.0, this.playerPos.z));
    } else {
      // Allowed out on platform
      this.playerPos.x = Math.max(-1.1, Math.min(6.5, this.playerPos.x));
      this.playerPos.z = Math.max(-27.5, Math.min(22.0, this.playerPos.z));
    }
  }

  // Main 2D Loop
  public update(delta: number, trainSpeed: number, turretState: TurretState) {
    if (this.isDestroyed) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) return;

    const speedRatio = Math.max(0, trainSpeed / 120);
    const scrollDelta = (trainSpeed * 10 * delta);
    this.trackScrollY = (this.trackScrollY + scrollDelta) % 60;

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 15);
    }

    // Shake offset
    const shakeX = (Math.random() - 0.5) * this.screenShake;
    const shakeY = (Math.random() - 0.5) * this.screenShake;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. UPDATE LOGIC
    this.updatePlayerMovement(delta);

    // Weather lightning timer
    if (this.currentWeather === 'rain') {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 4 + Math.random() * 8;
        this.lightningAlpha = 0.85;
        soundManager.playThunder();
      }
      if (this.lightningAlpha > 0) {
        this.lightningAlpha = Math.max(0, this.lightningAlpha - delta * 3.5);
      }
    } else {
      this.lightningAlpha = 0;
    }

    // Center train on screen
    const trainCenterX = width / 2;
    const trainCenterY = height / 2 + 30;

    // Turret orientation
    if (this.isMountedToTurret) {
      const turretScreenY = trainCenterY - 60;
      this.turretAngle = Math.atan2(this.mousePos.y - turretScreenY, this.mousePos.x - trainCenterX);
    } else {
      // Auto aim
      this.turretAngle = turretState.yaw - Math.PI / 2;
    }

    if (this.turretRecoil > 0) {
      this.turretRecoil = Math.max(0, this.turretRecoil - delta * 35);
    }
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - delta);
    }

    // Automatic Firing when held in turret mode
    if (this.isMountedToTurret && this.isMouseDown && turretState.currentAmmo > 0 && !turretState.isOverheated) {
      // Periodic trigger handled by user or high rate
    }

    // Scroll road decorations
    for (const dec of this.roadDecorations) {
      dec.y += scrollDelta;
      if (dec.y > height + 100) {
        dec.y = -100 - Math.random() * 150;
        const isLeft = Math.random() > 0.5;
        dec.x = isLeft ? 40 + Math.random() * (trainCenterX - 100) : trainCenterX + 80 + Math.random() * (width - trainCenterX - 140);
      }
    }

    // 2. RENDER BACKGROUND & WASTELAND TERRAIN
    this.renderWastelandTerrain(width, height, trainCenterX, delta);

    // 3. RENDER RAILWAY TRACKS & TIES
    this.renderRailwayTracks(trainCenterX, height, scrollDelta);

    // 4. RENDER STATION PLATFORM & LOOT CRATES (IF ACTIVE)
    this.renderStationPlatform(trainCenterX, height, delta);

    // 5. RENDER SCENERY OBJECTS (Rocks, Telegraph Poles, Debris)
    this.renderSceneryObjects(delta);

    // 6. RENDER ARMORED TRAIN CARRIAGES
    this.renderTrain(trainCenterX, trainCenterY, trainSpeed, delta);

    // 7. RENDER ENEMIES IN 2D
    this.renderEnemies(trainCenterX, trainCenterY, delta);

    // 8. RENDER PLAYER SURVIVOR
    this.renderPlayer(trainCenterX, trainCenterY);

    // 9. RENDER PROJECTILES, TRACERS & EXPLOSIONS
    this.renderCombatEffects(delta);

    // 10. RENDER WEATHER PRECIPITATION (Snowflakes / Raindrops)
    this.renderWeatherParticles(width, height, delta, trainSpeed);

    // 11. DYNAMIC ATMOSPHERIC LIGHTING & SHADOW OVERLAY
    this.renderAtmosphericLighting(width, height, trainCenterX, trainCenterY);

    // 12. FLOATING DAMAGE & PICKUP TEXT
    this.renderFloatingText(delta);

    // 13. CROSSHAIR WHEN MOUNTED
    if (this.isMountedToTurret) {
      this.renderCrosshair(this.mousePos.x, this.mousePos.y);
    }

    ctx.restore();

    // Check interactables for HUD
    this.checkInteractables(trainCenterX, trainCenterY);
  }

  // 2. Wasteland background terrain rendering
  private renderWastelandTerrain(width: number, height: number, trainCenterX: number, delta: number) {
    const ctx = this.ctx;

    // Base wasteland tone depending on weather
    let groundColor = '#0f172a'; // dark frozen tundra
    if (this.currentWeather === 'blizzard') {
      groundColor = '#090e17'; // cold arctic whiteout
    } else if (this.currentWeather === 'rain') {
      groundColor = '#0a1017'; // gloomy mud wasteland
    } else {
      groundColor = '#111827'; // scorched earth
    }

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 0, width, height);

    // Deep Starry Sky Parallax (visible in Clear Weather)
    if (this.currentWeather === 'clear') {
      ctx.save();
      for (const star of this.stars) {
        ctx.fillStyle = `rgba(254, 240, 138, ${star.brightness * (0.6 + Math.sin(Date.now() * 0.003 * star.speed) * 0.4)})`;
        ctx.fillRect(star.x * width, star.y * height, 2, 2);
      }

      // Aurora Borealis Shimmering Gradient
      const auroraGrad = ctx.createLinearGradient(0, 0, width, 180);
      auroraGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      auroraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.14)');
      auroraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, width, 180);
      ctx.restore();
    }

    // Ballast track embankment bed (dark crushed gravel strip down center)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trainCenterX - 48, 0, 96, height);

    // Ballast edge dither
    ctx.fillStyle = '#27272a';
    for (let y = 0; y < height; y += 8) {
      ctx.fillRect(trainCenterX - 50, y, 2, 4);
      ctx.fillRect(trainCenterX + 48, y, 2, 4);
    }
  }

  // 3. Railway tracks & ties rendering
  private renderRailwayTracks(trainCenterX: number, height: number, scrollDelta: number) {
    const ctx = this.ctx;
    const railSpacing = 42;
    const tieSpacing = 24;

    // Wooden railroad ties (sleepers) scrolling down
    ctx.fillStyle = '#292524'; // weathered treated wood
    const startY = (this.trackScrollY % tieSpacing) - tieSpacing;

    for (let y = startY; y < height + tieSpacing; y += tieSpacing) {
      // Main tie
      ctx.fillRect(trainCenterX - 36, y, 72, 8);
      // Tie plate iron spikes
      ctx.fillStyle = '#71717a';
      ctx.fillRect(trainCenterX - railSpacing / 2 - 3, y + 2, 6, 4);
      ctx.fillRect(trainCenterX + railSpacing / 2 - 3, y + 2, 6, 4);
      ctx.fillStyle = '#292524';
    }

    // Left Steel Rail
    const leftRailX = trainCenterX - railSpacing / 2;
    ctx.fillStyle = '#52525b';
    ctx.fillRect(leftRailX - 3, 0, 6, height);
    // Railhead polished shiny reflection
    ctx.fillStyle = '#d4d4d8';
    ctx.fillRect(leftRailX - 1, 0, 2, height);

    // Right Steel Rail
    const rightRailX = trainCenterX + railSpacing / 2;
    ctx.fillStyle = '#52525b';
    ctx.fillRect(rightRailX - 3, 0, 6, height);
    ctx.fillStyle = '#d4d4d8';
    ctx.fillRect(rightRailX - 1, 0, 2, height);
  }

  // 4. Station platform & loot crates
  private renderStationPlatform(trainCenterX: number, height: number, delta: number) {
    const ctx = this.ctx;
    const platformX = trainCenterX + 48;

    if (this.stationVisible) {
      // Station platform smoothly slides in
      this.stationY = Math.min(this.stationTargetY, this.stationY + delta * 300);
    } else {
      this.stationY = -800;
      return;
    }

    const platformSprite = this.spriteCache['station_platform'];
    if (platformSprite) {
      for (let y = this.stationY - 200; y < this.stationY + 600; y += 120) {
        ctx.drawImage(platformSprite, platformX, y);
      }
    }

    // Platform roof awning canopy shadow
    ctx.fillStyle = 'rgba(9, 9, 11, 0.6)';
    ctx.fillRect(platformX + 20, this.stationY - 150, 70, 700);

    // Ruined shelter corrugated metal roof
    ctx.fillStyle = '#451a03';
    ctx.fillRect(platformX + 24, this.stationY - 150, 64, 700);

    // Support pillars
    ctx.fillStyle = '#71717a';
    for (let py = this.stationY - 120; py < this.stationY + 550; py += 140) {
      ctx.fillRect(platformX + 16, py, 6, 6);
    }

    // 3 Loot Crates with beacon glow
    const crates = [
      { id: 'crate_scrap', y: this.stationY - 80, color: '#f59e0b', name: 'SCRAP CRATE' },
      { id: 'crate_fuel', y: this.stationY + 120, color: '#3b82f6', name: 'FUEL DRUMS' },
      { id: 'crate_ammo', y: this.stationY + 320, color: '#22c55e', name: 'AMMO CACHE' },
    ];

    crates.forEach((cr) => {
      const cx = platformX + 32;
      const cy = cr.y;

      // Glow halo
      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 32);
      glow.addColorStop(0, cr.color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.45 + Math.sin(Date.now() * 0.006) * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Crate box
      ctx.fillStyle = cr.color;
      ctx.fillRect(cx - 10, cy - 10, 20, 20);
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 10, cy - 10, 20, 20);

      // Flashing Beacon LED
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 2, cy - 14, 4, 4);
    });
  }

  // 5. Scenery objects (poles, rocks, ruined cars, puddles)
  private renderSceneryObjects(delta: number) {
    const ctx = this.ctx;

    for (const dec of this.roadDecorations) {
      if (dec.type === 'pole') {
        // Telegraph pole with wire
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(dec.x, dec.y, 4, 32);
        ctx.fillRect(dec.x - 8, dec.y + 4, 20, 3);
        // Insulator cups
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(dec.x - 7, dec.y + 1, 3, 3);
        ctx.fillRect(dec.x + 8, dec.y + 1, 3, 3);
      } else if (dec.type === 'rock') {
        // Jagged wasteland rock
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(dec.x, dec.y);
        ctx.lineTo(dec.x + 14, dec.y + 8);
        ctx.lineTo(dec.x + 8, dec.y + 18);
        ctx.lineTo(dec.x - 6, dec.y + 14);
        ctx.closePath();
        ctx.fill();
      } else if (dec.type === 'tree') {
        // Dead frozen skeletal pine tree
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(dec.x, dec.y, 3, 26);
        ctx.fillRect(dec.x - 6, dec.y + 8, 14, 2);
        ctx.fillRect(dec.x - 10, dec.y + 16, 22, 2);
      } else if (dec.type === 'ruin') {
        // Rusted collapsed vehicle frame
        ctx.fillStyle = '#451a03';
        ctx.fillRect(dec.x, dec.y, 24, 16);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(dec.x + 4, dec.y + 2, 8, 6);
      } else if (dec.type === 'puddle') {
        // Reflective icy sludge puddle
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(dec.x, dec.y, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 6. Train carriages rendering
  private renderTrain(trainCenterX: number, trainCenterY: number, trainSpeed: number, delta: number) {
    const ctx = this.ctx;

    // Bogie wheel track spark particles
    if (trainSpeed > 45 && Math.random() < 0.6) {
      for (const side of [-20, 20]) {
        this.particles.push({
          x: trainCenterX + side + (Math.random() - 0.5) * 4,
          y: trainCenterY + (Math.random() - 0.5) * 120,
          vx: (side > 0 ? 1 : -1) * (40 + Math.random() * 80),
          vy: 80 + Math.random() * 120,
          life: 0.25,
          maxLife: 0.25,
          color: '#fbbf24',
          size: 2,
          type: 'spark',
        });
      }
    }

    // Train carriages arranged vertically (train travels upward, heading north)
    // 1. Locomotive (Front, top)
    const locoY = trainCenterY - 145;
    const locoSprite = this.spriteCache['locomotive'];
    if (locoSprite) {
      ctx.drawImage(locoSprite, trainCenterX - 36, locoY);
    }

    // Locomotive Smokestack Smoke Particles
    if (trainSpeed > 2 && Math.random() < 0.75) {
      this.particles.push({
        x: trainCenterX + (Math.random() - 0.5) * 6,
        y: locoY + 40,
        vx: (Math.random() - 0.5) * 15,
        vy: 120 + trainSpeed * 1.5,
        life: 1.4,
        maxLife: 1.4,
        color: '#3f3f46',
        size: 8,
        type: 'smoke',
      });
    }

    // Coupler 1-2
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trainCenterX - 4, locoY + 128, 8, 12);

    // 2. Defense Carriage (Turret)
    const defY = locoY + 138;
    const defSprite = this.spriteCache['carriage_defense'];
    if (defSprite) {
      ctx.drawImage(defSprite, trainCenterX - 34, defY);
    }

    // Rotating Gatling Turret
    const turretPivotX = trainCenterX;
    const turretPivotY = defY + 55;
    const turretSprite = this.spriteCache['turret_cannon'];

    if (turretSprite) {
      ctx.save();
      ctx.translate(turretPivotX, turretPivotY);
      // Recoil kickback along firing angle
      const recoilOffsetX = -Math.cos(this.turretAngle) * this.turretRecoil;
      const recoilOffsetY = -Math.sin(this.turretAngle) * this.turretRecoil;
      ctx.translate(recoilOffsetX, recoilOffsetY);
      ctx.rotate(this.turretAngle + Math.PI / 2); // sprite faces upward by default
      ctx.drawImage(turretSprite, -22, -27);
      ctx.restore();
    }

    // Muzzle Flash
    if (this.muzzleFlashTimer > 0) {
      ctx.save();
      ctx.translate(turretPivotX, turretPivotY);
      const flashDist = 34;
      const fx = Math.cos(this.turretAngle) * flashDist;
      const fy = Math.sin(this.turretAngle) * flashDist;

      // Brilliant yellow-white muzzle flash star
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(fx, fy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Coupler 2-3
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trainCenterX - 4, defY + 108, 8, 12);

    // 3. Workshop Carriage
    const workY = defY + 118;
    const workSprite = this.spriteCache['carriage_workshop'];
    if (workSprite) {
      ctx.drawImage(workSprite, trainCenterX - 34, workY);
    }

    // Coupler 3-4
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trainCenterX - 4, workY + 108, 8, 12);

    // 4. Storage Carriage
    const storeY = workY + 118;
    const storeSprite = this.spriteCache['carriage_storage'];
    if (storeSprite) {
      ctx.drawImage(storeSprite, trainCenterX - 34, storeY);
    }

    // Coupler 4-5
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trainCenterX - 4, storeY + 108, 8, 12);

    // 5. Power Carriage
    const powerY = storeY + 118;
    const powerSprite = this.spriteCache['carriage_power'];
    if (powerSprite) {
      ctx.drawImage(powerSprite, trainCenterX - 34, powerY);
    }
  }

  // 7. Enemies rendering & animations
  private renderEnemies(trainCenterX: number, trainCenterY: number, delta: number) {
    const ctx = this.ctx;

    for (const enemy of this.localEnemies) {
      // Map 3D coordinate (x: lateral, z: longitudinal) to 2D screen coordinate
      // 3D train z ranges from ~ -30 (rear) to +15 (front).
      // Screen y: front is higher up (smaller y), rear is lower down (larger y).
      const enemyScreenX = trainCenterX + enemy.x * 24;
      const enemyScreenY = trainCenterY - enemy.z * 18;

      let spriteKey = 'enemy_chaser';
      if (enemy.type === 'HullBreaker') spriteKey = 'enemy_hullbreaker';
      else if (enemy.type === 'Phantom') spriteKey = 'enemy_phantom';

      const sprite = this.spriteCache[spriteKey];
      if (sprite) {
        ctx.save();
        ctx.translate(enemyScreenX, enemyScreenY);

        // Face towards train centerline
        if (enemy.x > 0) {
          ctx.scale(-1, 1);
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        ctx.restore();

        // 2D Pixel Health Bar above enemy
        const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
        const barWidth = 28;
        const barHeight = 4;
        const barX = enemyScreenX - barWidth / 2;
        const barY = enemyScreenY - sprite.height / 2 - 8;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
      }
    }
  }

  // 8. Player survivor rendering
  private renderPlayer(trainCenterX: number, trainCenterY: number) {
    const ctx = this.ctx;

    // Map 3D player position to 2D screen coordinate
    const px = trainCenterX + this.playerPos.x * 24;
    const py = trainCenterY - this.playerPos.z * 18;

    const sprite = this.spriteCache['player'];
    if (sprite) {
      ctx.save();
      ctx.translate(px, py);

      // Foot shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 12, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Walking bounce
      const isWalking =
        this.keys['KeyW'] ||
        this.keys['KeyS'] ||
        this.keys['KeyA'] ||
        this.keys['KeyD'] ||
        this.keys['ArrowUp'] ||
        this.keys['ArrowDown'];
      const bounce = isWalking ? Math.sin(Date.now() * 0.015) * 2 : 0;

      ctx.drawImage(sprite, -12, -14 + bounce);

      // Flashlight beam from helmet lamp
      ctx.save();
      const lampGrad = ctx.createRadialGradient(0, -10, 2, 0, -45, 60);
      lampGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
      lampGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.lineTo(-24, -60);
      ctx.lineTo(24, -60);
      ctx.lineTo(4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
  }

  // 9. Combat projectiles, tracers, sparks & explosions
  private renderCombatEffects(delta: number) {
    const ctx = this.ctx;

    // Update & draw projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      let hit = false;
      for (const e of this.localEnemies) {
        const trainCenterX = this.canvas.width / 2;
        const trainCenterY = this.canvas.height / 2 + 30;
        const ex = trainCenterX + e.x * 24;
        const ey = trainCenterY - e.z * 18;
        const distSq = (p.x - ex) * (p.x - ex) + (p.y - ey) * (p.y - ey);

        if (distSq < 22 * 22) {
          hit = true;
          e.health -= p.damage;

          // Impact sparks & blood
          for (let s = 0; s < 5; s++) {
            this.particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              life: 0.35,
              maxLife: 0.35,
              color: '#dc2626',
              size: 2,
              type: 'blood',
            });
          }

          // Damage number
          this.damageNumbers.push({
            x: ex + (Math.random() - 0.5) * 20,
            y: ey - 10,
            text: `-${p.damage}`,
            color: '#ef4444',
            life: 0.8,
            maxLife: 0.8,
          });

          // Check kill
          if (e.health <= 0) {
            this.explosions.push({
              x: ex,
              y: ey,
              radius: 4,
              maxRadius: 28,
              life: 0.45,
              maxLife: 0.45,
              color: '#f97316',
            });
            soundManager.playExplosion();
          } else {
            soundManager.playHitImpact();
          }

          break;
        }
      }

      if (hit) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Draw high-velocity tracer
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    // Update & draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * delta;
      pt.y += pt.vy * delta;
      if (pt.gravity) {
        pt.vy += pt.gravity * delta;
      }
      pt.life -= delta;

      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = pt.life / pt.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (pt.type === 'smoke') {
        const size = pt.size * (1 + (1 - alpha) * 1.5);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'casing') {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 4, 2);
      } else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
      ctx.restore();
    }

    // Update & draw explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.life -= delta;
      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
        continue;
      }

      const progress = 1 - exp.life / exp.maxLife;
      const currentRadius = exp.radius + (exp.maxRadius - exp.radius) * progress;

      ctx.save();
      // Outer fireball ring
      ctx.fillStyle = exp.color;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, currentRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 10. Weather precipitation (Snowflakes / Raindrops)
  private renderWeatherParticles(width: number, height: number, delta: number, trainSpeed: number) {
    const ctx = this.ctx;
    const speedDown = (trainSpeed * 8 + 400) * delta;

    if (this.currentWeather === 'blizzard') {
      // Fierce diagonal blizzard flurry
      ctx.fillStyle = '#e0f2fe';
      for (let i = 0; i < 70; i++) {
        const sx = (Math.sin(Date.now() * 0.002 + i * 29) * 0.5 + 0.5) * width;
        const sy = (Date.now() * 0.8 * (0.8 + (i % 5) * 0.3) + i * 47) % height;
        const length = 8 + (i % 4) * 4;

        ctx.fillRect(sx, sy, 2, 2);
        // Wind streak
        ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
        ctx.fillRect(sx - length, sy + length * 0.5, length, 1);
        ctx.fillStyle = '#e0f2fe';
      }
    } else if (this.currentWeather === 'rain') {
      // Rapid rain streaks
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 90; i++) {
        const rx = (Math.sin(i * 37) * 0.5 + 0.5) * width;
        const ry = (Date.now() * 1.6 * (0.8 + (i % 6) * 0.25) + i * 31) % height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 22);
        ctx.stroke();
      }

      // Puddle splashes
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const px = (Math.sin(Date.now() * 0.001 + i * 53) * 0.5 + 0.5) * width;
        const py = (Math.cos(Date.now() * 0.0015 + i * 71) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.ellipse(px, py, 6, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 11. Dynamic post-apocalyptic pixel lighting overlay
  private renderAtmosphericLighting(width: number, height: number, trainCenterX: number, trainCenterY: number) {
    const ctx = this.ctx;

    // Lightning Flash in Rain
    if (this.lightningAlpha > 0) {
      ctx.fillStyle = `rgba(224, 242, 254, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Locomotive Dual Headlight Cones cutting through dark wasteland
    const locoHeadlightY = trainCenterY - 145;

    ctx.save();
    // High-beam light cone projected forward (towards top of screen)
    const beamGrad = ctx.createRadialGradient(trainCenterX, locoHeadlightY, 10, trainCenterX, 0, 480);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    beamGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.15)');
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(trainCenterX - 18, locoHeadlightY);
    ctx.lineTo(trainCenterX - 180, 0);
    ctx.lineTo(trainCenterX + 180, 0);
    ctx.lineTo(trainCenterX + 18, locoHeadlightY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dark Vignette around screen border
    ctx.save();
    const vigGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.7)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 12. Floating text for damage & loot notifications
  private renderFloatingText(delta: number) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px monospace';

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y -= 25 * delta;
      dn.life -= delta;

      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.min(1, dn.life * 2);
      ctx.fillStyle = dn.color;
      ctx.fillText(dn.text, dn.x, dn.y);
      ctx.restore();
    }
  }

  // 13. Turret Crosshair cursor
  private renderCrosshair(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;

    // Reticle circle
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 20, y);
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 20);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#f87171';
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.restore();
  }

  public destroy() {
    this.isDestroyed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.handleResize);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
