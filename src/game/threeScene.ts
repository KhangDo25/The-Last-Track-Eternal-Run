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

interface WeatherConfig {
  fogDensity: number;
  fogColor: THREE.Color;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  moonColor: THREE.Color;
  moonIntensity: number;
  exposure: number;
  auroraOpacity: number;
  starOpacity: number;
}

const WEATHER_SETTINGS: Record<WeatherType, WeatherConfig> = {
  clear: {
    fogDensity: 0.0035, // Crisp, deep vista to see distant mountains, stars and northern lights
    fogColor: new THREE.Color(0x060a14),
    ambientColor: new THREE.Color(0x2d3e52),
    ambientIntensity: 1.5,
    moonColor: new THREE.Color(0xb8d8ff),
    moonIntensity: 2.8,
    exposure: 1.2,
    auroraOpacity: 0.8,
    starOpacity: 0.95,
  },
  rain: {
    fogDensity: 0.016, // Gloomy, rainy mist
    fogColor: new THREE.Color(0x0a1017),
    ambientColor: new THREE.Color(0x1e2a35),
    ambientIntensity: 1.1,
    moonColor: new THREE.Color(0x56708b),
    moonIntensity: 1.05,
    exposure: 0.92,
    auroraOpacity: 0.08,
    starOpacity: 0.0,
  },
  blizzard: {
    fogDensity: 0.035, // Heavy whiteout arctic blizzard
    fogColor: new THREE.Color(0x161d28),
    ambientColor: new THREE.Color(0x445365),
    ambientIntensity: 2.3,
    moonColor: new THREE.Color(0x7390ad),
    moonIntensity: 0.85,
    exposure: 1.35,
    auroraOpacity: 0.0,
    starOpacity: 0.0,
  },
};

export class GameScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private isDestroyed = false;

  // Language
  public language: Language = 'vi';

  // Player controls
  public playerPos = new THREE.Vector3(0, 1.6, 6); // Starts inside Locomotive Cabin
  public cameraYaw = 0;
  public cameraPitch = 0;
  public isMountedToTurret = false;
  public isPointerLocked = false;
  private lastPointerLockExitTime = 0;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Input states
  private keys: Record<string, boolean> = {};

  // Train & world hierarchy
  private trainGroup = new THREE.Group();
  private trackGroup = new THREE.Group();
  private sceneryGroup = new THREE.Group();
  private ridgeGroup = new THREE.Group();
  private mountainGroup = new THREE.Group();
  private cityHorizonGroup = new THREE.Group();
  private stationGroup = new THREE.Group();
  private enemiesGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();

  // Wheels & mechanical details
  private wheelMeshes: THREE.Mesh[] = [];
  private fireboxLight: THREE.PointLight | null = null;
  private wheelSparks: THREE.Points | null = null;
  private signalLights: THREE.PointLight[] = [];

  // Turret meshes
  private turretBaseMesh: THREE.Mesh | null = null;
  private turretBarrelsMesh: THREE.Group | null = null;

  // Particle systems
  private smokeParticles: THREE.Points | null = null;
  private snowParticles: THREE.Points | null = null;
  private rainParticles: THREE.Points | null = null;
  private starParticles: THREE.Points | null = null;
  private activeTracers: { pos: THREE.Vector3; dir: THREE.Vector3; life: number }[] = [];

  // Interaction check
  public currentInteractable: InteractionTarget | null = null;

  // Dynamic Weather System (clear | rain | blizzard)
  public currentWeather: WeatherType = 'blizzard';
  public onWeatherChange?: (weather: WeatherType) => void;
  private targetFogDensity: number = 0.035;
  private targetFogColor = new THREE.Color(0x161d28);
  private targetAmbientColor = new THREE.Color(0x445365);
  private targetAmbientIntensity: number = 2.3;
  private targetMoonColor = new THREE.Color(0x7390ad);
  private targetMoonIntensity: number = 0.85;
  private targetExposure: number = 1.35;
  private targetAuroraOpacity: number = 0.0;
  private targetStarOpacity: number = 0.0;

  // Scene references for dynamic weather lerping
  private fogExp: THREE.FogExp2 | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private moonLight: THREE.DirectionalLight | null = null;
  private auroraMesh: THREE.Mesh | null = null;

  // 3D Positional Audio System
  private audioSystemInitialized = false;
  private windPanners: {
    panner: PannerNode;
    gain: GainNode;
    filter: BiquadFilterNode;
    source: AudioBufferSourceNode;
    baseGain: number;
    baseFreq: number;
  }[] = [];
  private creakPanners: { panner: PannerNode; pos: THREE.Vector3 }[] = [];
  private nextCreakTime = 0;

  // Callbacks
  public onLootAction?: (crateId: string) => void;
  public onOpenUI?: (uiType: 'Throttle' | 'Workbench' | 'Storage') => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene & Dynamic Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = this.targetFogColor.clone();
    this.fogExp = new THREE.FogExp2(this.targetFogColor.getHex(), this.targetFogDensity);
    this.scene.fog = this.fogExp;

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.copy(this.playerPos);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.targetExposure;
    this.container.appendChild(this.renderer.domElement);

    // World builders
    this.setupLighting();
    this.setupAuroraSky();
    this.setupTracks();
    this.setupTrain();
    this.setupMountains();
    this.setupCityHorizon();
    this.setupScenery();
    this.setupParticles();

    // Event Listeners
    this.setupEventListeners();
  }

  public setWeather(weather: WeatherType) {
    const fromWeather = this.currentWeather;
    this.currentWeather = weather;
    const cfg = WEATHER_SETTINGS[weather];
    this.targetFogDensity = cfg.fogDensity;
    this.targetFogColor = cfg.fogColor;
    this.targetAmbientColor = cfg.ambientColor;
    this.targetAmbientIntensity = cfg.ambientIntensity;
    this.targetMoonColor = cfg.moonColor;
    this.targetMoonIntensity = cfg.moonIntensity;
    this.targetExposure = cfg.exposure;
    this.targetAuroraOpacity = cfg.auroraOpacity;
    this.targetStarOpacity = cfg.starOpacity;

    // Specific foley soundscape triggers for starting a blizzard, starting rain, or clearing rain
    soundManager.triggerWeatherTransition(weather, fromWeather);

    if (this.onWeatherChange) {
      this.onWeatherChange(weather);
    }
  }

  public toggleWeather(): WeatherType {
    const sequence: WeatherType[] = ['blizzard', 'rain', 'clear'];
    const currentIndex = sequence.indexOf(this.currentWeather);
    const nextWeather = sequence[(currentIndex + 1) % sequence.length];
    this.setWeather(nextWeather);
    return nextWeather;
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(this.targetAmbientColor, this.targetAmbientIntensity);
    this.scene.add(this.ambientLight);

    this.moonLight = new THREE.DirectionalLight(this.targetMoonColor, this.targetMoonIntensity);
    this.moonLight.position.set(60, 90, 40);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;
    this.moonLight.shadow.camera.near = 10;
    this.moonLight.shadow.camera.far = 200;
    const d = 50;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.scene.add(this.moonLight);

    // Locomotive High-Beam Headlight
    const headlight = new THREE.SpotLight(0xfff6d8, 18, 150, Math.PI / 5.5, 0.35, 1.2);
    headlight.position.set(0, 3.4, 14.5);
    headlight.target.position.set(0, 0, 85);
    headlight.castShadow = true;
    this.scene.add(headlight);
    this.scene.add(headlight.target);

    // Firebox pulsating light inside cabin
    this.fireboxLight = new THREE.PointLight(0xff4500, 3.0, 7);
    this.fireboxLight.position.set(0, 1.2, 7.8);
    this.trainGroup.add(this.fireboxLight);

    // Warm Interior lights for carriages
    const cabinLight = new THREE.PointLight(0xffaa44, 2.2, 8);
    cabinLight.position.set(0, 2.5, 6.5);
    this.trainGroup.add(cabinLight);

    const workshopLight = new THREE.PointLight(0x55aaff, 2.8, 10);
    workshopLight.position.set(0, 2.5, -4);
    this.trainGroup.add(workshopLight);

    const defenseLight = new THREE.PointLight(0xff3311, 2.0, 7);
    defenseLight.position.set(0, 2.8, -14);
    this.trainGroup.add(defenseLight);

    const storageLight = new THREE.PointLight(0xeeaa55, 2.0, 8);
    storageLight.position.set(0, 2.5, -24);
    this.trainGroup.add(storageLight);
  }

  private setupAuroraSky() {
    // Ethereal Aurora Borealis curve ribbon across northern night sky
    const curvePoints = [];
    for (let i = -160; i <= 160; i += 12) {
      curvePoints.push(new THREE.Vector3(i, 65 + Math.sin(i * 0.04) * 10, 130 + Math.cos(i * 0.03) * 40));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const auroraGeo = new THREE.TubeGeometry(curve, 64, 5.5, 8, false);
    const auroraMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: this.targetAuroraOpacity,
      side: THREE.DoubleSide,
    });
    this.auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    this.scene.add(this.auroraMesh);

    // Second ethereal curtain layer with violet-green shimmer
    const secondaryPoints = [];
    for (let i = -140; i <= 140; i += 14) {
      secondaryPoints.push(new THREE.Vector3(i, 78 + Math.cos(i * 0.035) * 8, 155 + Math.sin(i * 0.025) * 35));
    }
    const secondaryCurve = new THREE.CatmullRomCurve3(secondaryPoints);
    const secAurora = new THREE.Mesh(
      new THREE.TubeGeometry(secondaryCurve, 48, 4.0, 8, false),
      auroraMat
    );
    this.scene.add(secAurora);

    // Deep space celestial starfield for clear weather states
    const starCount = 1000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 280 + Math.random() * 50;
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = Math.abs(r * Math.cos(phi)) + 15;
      starPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xeef6ff,
      size: 1.25,
      transparent: true,
      opacity: this.targetStarOpacity,
    });
    this.starParticles = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starParticles);
  }

  private setupTracks() {
    this.scene.add(this.trackGroup);

    // Vast Snow/Wasteland Terrain with uneven edges
    const groundGeo = new THREE.PlaneGeometry(600, 800, 48, 48);
    // Subtle height displacement
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      if (Math.abs(vx) > 8) {
        pos.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.05) * 2.8);
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141a22,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Railway Gravel Ballast Embankment
    const ballastGeo = new THREE.BoxGeometry(4.4, 0.4, 800);
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.9 });
    const ballast = new THREE.Mesh(ballastGeo, ballastMat);
    ballast.position.set(0, 0.05, 0);
    ballast.receiveShadow = true;
    this.trackGroup.add(ballast);

    // Steel Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8fa4b8, metalness: 0.92, roughness: 0.25 });
    const railGeo = new THREE.BoxGeometry(0.12, 0.18, 800);

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-1.1, 0.35, 0);
    this.trackGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(1.1, 0.35, 0);
    this.trackGroup.add(rightRail);

    // Wooden Ties
    const tieGeo = new THREE.BoxGeometry(3.4, 0.16, 0.45);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x2b221a, roughness: 0.9 });
    const tieCount = 260;
    const tieInstanced = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
    tieInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < tieCount; i++) {
      dummy.position.set(0, 0.26, -400 + i * 3.1);
      dummy.updateMatrix();
      tieInstanced.setMatrixAt(i, dummy.matrix);
    }
    tieInstanced.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(tieInstanced);
  }

  private addBogieWheels(xOffset: number, zCenter: number) {
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333b45, metalness: 0.85, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);

    for (const zOff of [-1.2, 1.2]) {
      for (const side of [-1.15, 1.15]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side, 0.42, zCenter + zOff);
        wheel.castShadow = true;
        this.trainGroup.add(wheel);
        this.wheelMeshes.push(wheel);
      }
    }
  }

  private setupTrain() {
    this.scene.add(this.trainGroup);

    const locoMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.6, metalness: 0.75 });
    const ironTrimMat = new THREE.MeshStandardMaterial({ color: 0x943e15, roughness: 0.7, metalness: 0.5 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.8, metalness: 0.8 });

    // ==========================================
    // 1. LOCOMOTIVE (Z: +5 to +14)
    // ==========================================
    // Boiler
    const boilerGeo = new THREE.CylinderGeometry(1.45, 1.45, 7.5, 20);
    const boiler = new THREE.Mesh(boilerGeo, locoMat);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 2.3, 10.5);
    boiler.castShadow = true;
    this.trainGroup.add(boiler);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(3.0, 3.2, 3.8);
    const cabin = new THREE.Mesh(cabinGeo, locoMat);
    cabin.position.set(0, 2.5, 6.5);
    cabin.castShadow = true;
    this.trainGroup.add(cabin);

    // Cabin Floor
    const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 3.6), darkMetal);
    cabinFloor.position.set(0, 0.9, 6.5);
    this.trainGroup.add(cabinFloor);

    // Cowcatcher wedge
    const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), ironTrimMat);
    cowcatcher.rotation.x = Math.PI / 2;
    cowcatcher.rotation.y = Math.PI / 4;
    cowcatcher.position.set(0, 0.65, 14.5);
    this.trainGroup.add(cowcatcher);

    // Smokestack & Steam Dome
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.5, 16), ironTrimMat);
    stack.position.set(0, 4.3, 12.6);
    this.trainGroup.add(stack);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), ironTrimMat);
    dome.position.set(0, 3.8, 9.5);
    this.trainGroup.add(dome);

    // Cabin Controls Desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.8), ironTrimMat);
    desk.position.set(0, 1.4, 7.8);
    this.trainGroup.add(desk);

    // Throttle & Brake Levers
    const throttleLever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0xff3b1a, metalness: 0.9 }));
    throttleLever.position.set(-0.5, 2.0, 7.8);
    throttleLever.rotation.z = 0.3;
    this.trainGroup.add(throttleLever);

    const brakeLever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f75fe, metalness: 0.9 }));
    brakeLever.position.set(0.5, 2.0, 7.8);
    this.trainGroup.add(brakeLever);

    // Wheels for Locomotive
    this.addBogieWheels(0, 12.0);
    this.addBogieWheels(0, 7.0);

    // ==========================================
    // 2. WORKSHOP / LIVING CARRIAGE (Z: -1 to -8)
    // ==========================================
    const carriageMat = new THREE.MeshStandardMaterial({ color: 0x22272f, roughness: 0.7, metalness: 0.45 });
    const workshop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 7.2), carriageMat);
    workshop.position.set(0, 2.4, -4.5);
    workshop.castShadow = true;
    this.trainGroup.add(workshop);

    // Workbench table
    const workbench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 }));
    workbench.position.set(-0.8, 1.4, -4.5);
    this.trainGroup.add(workbench);

    this.addBogieWheels(0, -2.5);
    this.addBogieWheels(0, -6.5);

    // Coupler 1-2
    const coupler1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.6), ironTrimMat);
    coupler1.position.set(0, 0.8, 0.5);
    this.trainGroup.add(coupler1);

    // ==========================================
    // 3. DEFENSE CARRIAGE WITH GATLING TURRET (Z: -11 to -18)
    // ==========================================
    const defenseCar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.1, 7.2), darkMetal);
    defenseCar.position.set(0, 1.95, -14.5);
    defenseCar.castShadow = true;
    this.trainGroup.add(defenseCar);

    // Turret Mount Pedestal
    const turretPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.85, 16), ironTrimMat);
    turretPedestal.position.set(0, 3.1, -14.5);
    this.trainGroup.add(turretPedestal);

    // Rotating Base
    this.turretBaseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 16), darkMetal);
    this.turretBaseMesh.position.set(0, 3.75, -14.5);
    this.trainGroup.add(this.turretBaseMesh);

    // Turret Barrels & Housing
    this.turretBarrelsMesh = new THREE.Group();
    const barrelBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 1.3), ironTrimMat);
    barrelBody.position.set(0, 0, 0);
    this.turretBarrelsMesh.add(barrelBody);

    // Twin Gatling Barrels
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9, 8), new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.95 }));
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(-0.16, 0, 1.25);
    this.turretBarrelsMesh.add(barrel1);

    const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9, 8), new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.95 }));
    barrel2.rotation.x = Math.PI / 2;
    barrel2.position.set(0.16, 0, 1.25);
    this.turretBarrelsMesh.add(barrel2);

    this.turretBarrelsMesh.position.set(0, 0.35, 0);
    this.turretBaseMesh.add(this.turretBarrelsMesh);

    this.addBogieWheels(0, -12.5);
    this.addBogieWheels(0, -16.5);

    // Coupler 2-3
    const coupler2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.6), ironTrimMat);
    coupler2.position.set(0, 0.8, -9.5);
    this.trainGroup.add(coupler2);

    // ==========================================
    // 4. STORAGE CARRIAGE (Z: -21 to -28)
    // ==========================================
    const storageCar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 7.2), carriageMat);
    storageCar.position.set(0, 2.4, -24.5);
    storageCar.castShadow = true;
    this.trainGroup.add(storageCar);

    // Cargo Crates
    const crateGeo = new THREE.BoxGeometry(1.0, 0.9, 1.0);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xa46b28, roughness: 0.9 });
    const crate1 = new THREE.Mesh(crateGeo, crateMat);
    crate1.position.set(-0.7, 1.4, -24.5);
    this.trainGroup.add(crate1);

    const crate2 = new THREE.Mesh(crateGeo, crateMat);
    crate2.position.set(0.7, 1.4, -23.5);
    this.trainGroup.add(crate2);

    this.addBogieWheels(0, -22.5);
    this.addBogieWheels(0, -26.5);

    // Coupler 3-4
    const coupler3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.6), ironTrimMat);
    coupler3.position.set(0, 0.8, -19.5);
    this.trainGroup.add(coupler3);
  }

  private setupMountains() {
    this.scene.add(this.mountainGroup);
    this.scene.add(this.ridgeGroup);

    // Left and Right Mountain Ranges (Distant peaks)
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x182029,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xe6f0fa,
      roughness: 0.88,
      flatShading: true,
    });

    const createPeak = (x: number, z: number, height: number, radius: number) => {
      const peakGroup = new THREE.Group();
      peakGroup.position.set(x, 0, z);

      // Base mountain
      const geo = new THREE.ConeGeometry(radius, height, 5);
      const mesh = new THREE.Mesh(geo, mountainMat);
      mesh.position.y = height / 2;
      peakGroup.add(mesh);

      // Snow Cap
      const capGeo = new THREE.ConeGeometry(radius * 0.35, height * 0.35, 5);
      const cap = new THREE.Mesh(capGeo, snowCapMat);
      cap.position.y = height * 0.83;
      peakGroup.add(cap);

      this.mountainGroup.add(peakGroup);
    };

    // Distant Left Range
    for (let z = -400; z <= 400; z += 55) {
      const h = 48 + (Math.sin(z * 0.05) + 1) * 22;
      createPeak(-135 - Math.random() * 30, z, h, 40 + Math.random() * 15);
    }

    // Distant Right Range
    for (let z = -400; z <= 400; z += 55) {
      const h = 52 + (Math.cos(z * 0.05) + 1) * 24;
      createPeak(135 + Math.random() * 30, z, h, 42 + Math.random() * 15);
    }

    // Mid-distance Snow Foothills & Undulating Ridges (Layer 2 Parallax)
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1f2732,
      roughness: 0.92,
      flatShading: true,
    });
    const ridgeSnowMat = new THREE.MeshStandardMaterial({
      color: 0xd8e4f0,
      roughness: 0.9,
      flatShading: true,
    });

    const createRidge = (x: number, z: number, width: number, height: number, length: number) => {
      const ridge = new THREE.Group();
      ridge.position.set(x, 0, z);

      const baseGeo = new THREE.CylinderGeometry(width * 0.4, width, height, 5);
      const baseMesh = new THREE.Mesh(baseGeo, ridgeMat);
      baseMesh.position.y = height / 2;
      baseMesh.scale.z = length / width;
      ridge.add(baseMesh);

      const snowGeo = new THREE.ConeGeometry(width * 0.5, height * 0.3, 5);
      const snowMesh = new THREE.Mesh(snowGeo, ridgeSnowMat);
      snowMesh.position.y = height * 0.88;
      snowMesh.scale.z = length / width;
      ridge.add(snowMesh);

      this.ridgeGroup.add(ridge);
    };

    for (let z = -350; z <= 350; z += 45) {
      createRidge(-75 - Math.random() * 20, z, 26, 22 + Math.random() * 10, 50);
      createRidge(75 + Math.random() * 20, z, 26, 24 + Math.random() * 10, 50);
    }
  }

  private setupCityHorizon() {
    this.scene.add(this.cityHorizonGroup);

    // Dark atmospheric silhouette materials for post-apocalyptic ruins
    const cityMat = new THREE.MeshStandardMaterial({
      color: 0x090e15,
      roughness: 0.95,
      metalness: 0.3,
      flatShading: true,
    });

    const brokenEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x141b24,
      roughness: 0.9,
      metalness: 0.45,
      flatShading: true,
    });

    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x1f2733,
      roughness: 0.75,
      metalness: 0.8,
    });

    // Helper to generate a procedural ruined skyscraper cluster
    const createBrokenSkyscraper = (x: number, z: number, totalHeight: number, width: number, depth: number) => {
      const cluster = new THREE.Group();
      cluster.position.set(x, 0, z);

      // 1. Main tower shaft core
      const coreH = totalHeight * (0.62 + Math.random() * 0.16);
      const coreGeo = new THREE.BoxGeometry(width, coreH, depth);
      const coreMesh = new THREE.Mesh(coreGeo, cityMat);
      coreMesh.position.y = coreH / 2;
      cluster.add(coreMesh);

      // 2. Vertical structural ribs / window columns
      const ribCount = Math.max(2, Math.floor(width / 3.2));
      for (let r = 0; r < ribCount; r++) {
        const rx = -width / 2 + 1.2 + r * (width / ribCount);
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.35, coreH, depth + 0.3), brokenEdgeMat);
        rib.position.set(rx, coreH / 2, 0);
        cluster.add(rib);
      }

      // 3. Collapsed / stepped upper floors with jagged fractures
      const brokenLevels = 2 + Math.floor(Math.random() * 3);
      let currentY = coreH;
      let curW = width * 0.88;
      let curD = depth * 0.88;

      for (let lvl = 0; lvl < brokenLevels; lvl++) {
        const stepH = (totalHeight - coreH) / brokenLevels;
        const stepW = curW * (0.7 + Math.random() * 0.2);
        const stepD = curD * (0.7 + Math.random() * 0.2);
        const offX = (Math.random() - 0.5) * (curW - stepW);
        const offZ = (Math.random() - 0.5) * (curD - stepD);

        const stepGeo = new THREE.BoxGeometry(stepW, stepH, stepD);
        const stepMesh = new THREE.Mesh(stepGeo, brokenEdgeMat);
        stepMesh.position.set(offX, currentY + stepH / 2, offZ);

        // Sheared angle on crumbling upper storeys
        if (lvl === brokenLevels - 1) {
          stepMesh.rotation.z = (Math.random() - 0.5) * 0.22;
          stepMesh.rotation.x = (Math.random() - 0.5) * 0.22;
        }

        cluster.add(stepMesh);
        currentY += stepH;
        curW = stepW;
        curD = stepD;
      }

      // 4. Exposed rebar & broadcast antenna spire needle
      const spireH = 10 + Math.random() * 24;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.45, spireH, 4), trussMat);
      spire.position.set((Math.random() - 0.5) * (curW * 0.4), currentY + spireH / 2, (Math.random() - 0.5) * (curD * 0.4));
      cluster.add(spire);

      // 5. Pulsating red aircraft obstruction warning beacon on tall towers
      if (totalHeight > 70) {
        const beaconGeo = new THREE.SphereGeometry(0.45, 6, 6);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1e00 });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(spire.position.x, currentY + spireH, spire.position.z);
        cluster.add(beaconMesh);

        const beaconLight = new THREE.PointLight(0xff1500, 2.5, 40);
        beaconLight.position.copy(beaconMesh.position);
        cluster.add(beaconLight);
        this.signalLights.push(beaconLight);
      }

      // 6. Collapsed skyway bridge between adjacent megastructures
      if (Math.random() > 0.68) {
        const bridgeW = 16 + Math.random() * 14;
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 3.2, 4.0), cityMat);
        bridge.position.set(width * 0.72, coreH * 0.7, 0);
        bridge.rotation.z = (Math.random() - 0.5) * 0.3;
        cluster.add(bridge);
      }

      // 7. Structural tilt (subsidence in frozen soil)
      cluster.rotation.z = (Math.random() - 0.5) * 0.05;
      cluster.rotation.x = (Math.random() - 0.5) * 0.04;

      return cluster;
    };

    // Generate vast post-apocalyptic cityscape along both distant horizons
    // Left horizon skyline (X: -190 to -245)
    for (let z = -450; z <= 450; z += 30) {
      const h = 45 + Math.random() * 65 + (Math.sin(z * 0.03) + 1) * 20;
      const w = 15 + Math.random() * 18;
      const d = 16 + Math.random() * 20;
      const x = -195 - Math.random() * 45;
      this.cityHorizonGroup.add(createBrokenSkyscraper(x, z + Math.random() * 8, h, w, d));
    }

    // Right horizon skyline (X: 190 to 245)
    for (let z = -450; z <= 450; z += 30) {
      const h = 48 + Math.random() * 65 + (Math.cos(z * 0.03) + 1) * 20;
      const w = 15 + Math.random() * 18;
      const d = 16 + Math.random() * 20;
      const x = 195 + Math.random() * 45;
      this.cityHorizonGroup.add(createBrokenSkyscraper(x, z + Math.random() * 8, h, w, d));
    }
  }

  private setupScenery() {
    this.scene.add(this.sceneryGroup);
    this.scene.add(this.stationGroup);
    this.scene.add(this.enemiesGroup);

    // 1. Ruined Telegraph & Power Poles with Crossbeams & Drooping Wires
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d3024, roughness: 0.9 });
    const crossGeo = new THREE.BoxGeometry(1.8, 0.12, 0.12);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x15181e });

    const poleCount = 31;
    const poleStep = 22;
    for (let i = -15; i <= 15; i++) {
      const zPos = i * poleStep;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-5.5, 3.75, zPos);
      pole.castShadow = true;

      const cross = new THREE.Mesh(crossGeo, poleMat);
      cross.position.set(0, 3.3, 0);
      pole.add(cross);

      this.sceneryGroup.add(pole);

      // Drooping telegraph wire between poles
      if (i < 15) {
        const wirePoints = [
          new THREE.Vector3(-5.5, 7.0, zPos),
          new THREE.Vector3(-5.5, 6.2, zPos + poleStep * 0.5),
          new THREE.Vector3(-5.5, 7.0, zPos + poleStep),
        ];
        const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
        const wireGeo = new THREE.BufferGeometry().setFromPoints(wireCurve.getPoints(12));
        const wireLine = new THREE.Line(wireGeo, wireMat);
        this.sceneryGroup.add(wireLine);
      }
    }

    // 2. Overhead Heavy Steel Signal Gantries (passing over rails every 90m)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x272c35, metalness: 0.85, roughness: 0.4 });
    const beamGeo = new THREE.BoxGeometry(8.5, 0.4, 0.5);
    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 6.5, 8);

    for (let gz of [-180, -60, 60, 180]) {
      const gantry = new THREE.Group();
      gantry.position.set(0, 0, gz);

      // Left post
      const leftPost = new THREE.Mesh(postGeo, trussMat);
      leftPost.position.set(-3.8, 3.25, 0);
      gantry.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(postGeo, trussMat);
      rightPost.position.set(3.8, 3.25, 0);
      gantry.add(rightPost);

      // Top Crossbar
      const topBar = new THREE.Mesh(beamGeo, trussMat);
      topBar.position.set(0, 6.2, 0);
      gantry.add(topBar);

      // Flashing Signal Lamp
      const signalHousing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), trussMat);
      signalHousing.position.set(-1.0, 5.5, 0);
      gantry.add(signalHousing);

      const lamp = new THREE.PointLight(0xff3300, 2.0, 12);
      lamp.position.set(-1.0, 5.5, 0.3);
      gantry.add(lamp);
      this.signalLights.push(lamp);

      this.sceneryGroup.add(gantry);
    }

    // 3. Snowy Pine Trees (Conifers with snow caps lining the wilderness)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.95 });
    const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x14241d, roughness: 0.88 });
    const pineSnowMat = new THREE.MeshStandardMaterial({ color: 0xdce7f2, roughness: 0.9 });

    const createPineTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.8 * scale, 6), trunkMat);
      trunk.position.y = 1.4 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      // 3 Tiers of conifer branches + snow layer
      const tiers = [
        { y: 2.0, r: 1.8, h: 2.2 },
        { y: 3.3, r: 1.4, h: 1.9 },
        { y: 4.5, r: 0.95, h: 1.6 },
      ];

      tiers.forEach((t) => {
        const branchMesh = new THREE.Mesh(
          new THREE.ConeGeometry(t.r * scale, t.h * scale, 6),
          pineNeedleMat
        );
        branchMesh.position.y = t.y * scale;
        branchMesh.castShadow = true;
        tree.add(branchMesh);

        const snowMesh = new THREE.Mesh(
          new THREE.ConeGeometry(t.r * 0.72 * scale, t.h * 0.4 * scale, 6),
          pineSnowMat
        );
        snowMesh.position.y = (t.y + t.h * 0.28) * scale;
        tree.add(snowMesh);
      });

      return tree;
    };

    // Plant lush clusters of pine trees on both sides of the tracks
    for (let z = -260; z <= 260; z += 18) {
      // Left side forest band
      const leftX = -12 - Math.random() * 32;
      const leftScale = 0.85 + Math.random() * 0.6;
      this.sceneryGroup.add(createPineTree(leftX, z + Math.random() * 8, leftScale));

      // Second layer left
      if (Math.random() > 0.4) {
        this.sceneryGroup.add(createPineTree(leftX - 14, z - 8, leftScale * 1.15));
      }

      // Right side forest band
      const rightX = 12 + Math.random() * 32;
      const rightScale = 0.85 + Math.random() * 0.6;
      this.sceneryGroup.add(createPineTree(rightX, z + Math.random() * 8, rightScale));

      // Second layer right
      if (Math.random() > 0.4) {
        this.sceneryGroup.add(createPineTree(rightX + 14, z + 6, rightScale * 1.15));
      }
    }

    // 4. Communication & Radar Lattice Towers with Pulsating Red Warning Beacons
    const createRadioTower = (x: number, z: number) => {
      const tower = new THREE.Group();
      tower.position.set(x, 0, z);

      const mastGeo = new THREE.CylinderGeometry(0.35, 1.8, 30, 4);
      const mast = new THREE.Mesh(mastGeo, trussMat);
      mast.position.y = 15;
      tower.add(mast);

      // Horizontal brace rings
      for (let y = 5; y <= 27; y += 4.5) {
        const ringSize = 2.4 - (y / 30) * 1.6;
        const ring = new THREE.Mesh(new THREE.BoxGeometry(ringSize, 0.2, ringSize), trussMat);
        ring.position.y = y;
        tower.add(ring);
      }

      // Red blinking aviation beacon
      const beaconLight = new THREE.PointLight(0xff1100, 3.5, 35);
      beaconLight.position.set(0, 30.5, 0);
      tower.add(beaconLight);
      this.signalLights.push(beaconLight);

      const beaconSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2200 })
      );
      beaconSphere.position.set(0, 30.5, 0);
      tower.add(beaconSphere);

      return tower;
    };

    this.sceneryGroup.add(createRadioTower(-48, -120));
    this.sceneryGroup.add(createRadioTower(52, 140));

    // 5. Translucent Glacial Ice Formations / Shards
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x7dc4e8,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.78,
    });

    for (let iz of [-210, -90, 40, 190]) {
      const iceCluster = new THREE.Group();
      const side = iz % 2 === 0 ? -18 : 18;
      iceCluster.position.set(side, 0, iz);

      for (let k = 0; k < 4; k++) {
        const shardGeo = new THREE.ConeGeometry(0.8 + Math.random() * 0.6, 3.5 + Math.random() * 2.5, 5);
        const shard = new THREE.Mesh(shardGeo, iceMat);
        shard.position.set((Math.random() - 0.5) * 3, 1.8, (Math.random() - 0.5) * 3);
        shard.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
        iceCluster.add(shard);
      }

      this.sceneryGroup.add(iceCluster);
    }

    // 6. Brutalist Concrete Bunkers & Outposts half-buried in snow
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x363b44, roughness: 0.9 });
    for (let bz of [-150, 110]) {
      const bunker = new THREE.Group();
      const bx = bz < 0 ? -24 : 26;
      bunker.position.set(bx, 1.2, bz);

      const bunkerBody = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.8, 6.5), concreteMat);
      bunker.add(bunkerBody);

      // Vision slit
      const slit = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x050505 }));
      slit.position.set(0, 0.5, bz < 0 ? 3.3 : -3.3);
      bunker.add(slit);

      // Snow on bunker roof
      const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.3, 6.8), pineSnowMat);
      roofSnow.position.set(0, 1.5, 0);
      bunker.add(roofSnow);

      this.sceneryGroup.add(bunker);
    }

    // 7. Derelict Ruined Freight Cars alongside track (abandoned side rail)
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x5a291b, roughness: 0.9, metalness: 0.4 });
    for (let rx of [-9.5, 9.5]) {
      const wreckedCar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 9.0), rustMat);
      wreckedCar.position.set(rx, 1.4, -40);
      wreckedCar.rotation.y = rx < 0 ? 0.08 : -0.06;
      wreckedCar.rotation.z = rx < 0 ? -0.1 : 0.08;
      this.sceneryGroup.add(wreckedCar);
    }

    // 8. Snowy Boulders and Rock Outcrops along embankment
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x353d47, roughness: 0.95 });

    for (let b = -12; b <= 12; b++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const side = b % 2 === 0 ? 6.5 + Math.random() * 6 : -6.5 - Math.random() * 6;
      rock.position.set(side, 0.7, b * 30 + Math.random() * 10);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.set(1 + Math.random() * 0.8, 0.8 + Math.random() * 0.6, 1 + Math.random() * 0.8);
      this.sceneryGroup.add(rock);
    }
  }

  public setupStationVisuals(stationName: string) {
    while (this.stationGroup.children.length > 0) {
      this.stationGroup.remove(this.stationGroup.children[0]);
    }

    // Concrete Platform beside tracks (X: +4.0)
    const platformGeo = new THREE.BoxGeometry(4.5, 0.9, 50);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x3d444f, roughness: 0.85 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(4.2, 0.45, 0);
    platform.receiveShadow = true;
    this.stationGroup.add(platform);

    // Weathered Corrugated Shelter
    const roofGeo = new THREE.BoxGeometry(4.0, 0.15, 20);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6e352b, roughness: 0.7, metalness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(4.5, 3.6, 0);
    this.stationGroup.add(roof);

    // Shelter pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x222 });
    for (const pz of [-8, -2, 4, 8]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2), pillarMat);
      pillar.position.set(6.0, 2.0, pz);
      this.stationGroup.add(pillar);
    }

    // Station loot crates with bright directional beacons
    const crateOffsets = [
      { id: 'crate_scrap', z: 10, color: 0xd97724 },
      { id: 'crate_fuel', z: 0, color: 0x2563eb },
      { id: 'crate_ammo', z: -10, color: 0x16a34a },
    ];

    crateOffsets.forEach((cr) => {
      const crateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 1.2),
        new THREE.MeshStandardMaterial({ color: cr.color, roughness: 0.8, metalness: 0.4 })
      );
      crateMesh.position.set(4.2, 1.4, cr.z);
      crateMesh.castShadow = true;
      crateMesh.name = `loot_${cr.id}`;
      this.stationGroup.add(crateMesh);

      const beacon = new THREE.PointLight(cr.color, 2.2, 7);
      beacon.position.set(4.2, 2.4, cr.z);
      this.stationGroup.add(beacon);
    });

    this.stationGroup.position.set(0, 0, 0);
    this.stationGroup.visible = false;
  }

  public setStationVisible(visible: boolean) {
    this.stationGroup.visible = visible;
  }

  private setupParticles() {
    this.scene.add(this.particlesGroup);

    // 1. Snow / Ash Storm Particles
    const snowCount = 1800;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount * 3; i += 3) {
      snowPos[i] = (Math.random() - 0.5) * 110;
      snowPos[i + 1] = Math.random() * 35;
      snowPos[i + 2] = (Math.random() - 0.5) * 160;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xe0e8f0,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
    });
    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.particlesGroup.add(this.snowParticles);

    // 2. Locomotive Smoke Column
    const smokeCount = 180;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount * 3; i += 3) {
      smokePos[i] = 0;
      smokePos[i + 1] = 4.3;
      smokePos[i + 2] = 12.6;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x3f4650,
      size: 0.9,
      transparent: true,
      opacity: 0.45,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.particlesGroup.add(this.smokeParticles);

    // 3. Wheel Rail Sparks
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      sparkPos[i] = (Math.random() > 0.5 ? 1.1 : -1.1) + (Math.random() - 0.5) * 0.1;
      sparkPos[i + 1] = 0.25;
      sparkPos[i + 2] = 10 - Math.random() * 35;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
    });
    this.wheelSparks = new THREE.Points(sparkGeo, sparkMat);
    this.particlesGroup.add(this.wheelSparks);

    // 4. Rain Particles (active in rain state)
    const rainCount = 2200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 80;
      rainPos[i + 1] = Math.random() * 32;
      rainPos[i + 2] = (Math.random() - 0.5) * 130;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x7fa9d6,
      size: 0.16,
      transparent: true,
      opacity: 0.8,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.particlesGroup.add(this.rainParticles);
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

  private onPointerLockChange = () => {
    const wasLocked = this.isPointerLocked;
    this.isPointerLocked = document.pointerLockElement === this.container;
    if (wasLocked && !this.isPointerLocked) {
      this.lastPointerLockExitTime = Date.now();
    }
  };

  private onPointerLockError = () => {
    this.lastPointerLockExitTime = Date.now();
    this.isPointerLocked = false;
  };

  private safeRequestPointerLock = () => {
    if (this.isPointerLocked) return;
    const now = Date.now();
    if (now - this.lastPointerLockExitTime < 1500) {
      return;
    }

    try {
      const res = this.container.requestPointerLock?.();
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {
          this.lastPointerLockExitTime = Date.now();
        });
      }
    } catch {
      this.lastPointerLockExitTime = Date.now();
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.safeRequestPointerLock();
    }
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    const sensitivity = 0.0022;

    if (this.isPointerLocked) {
      this.cameraYaw -= e.movementX * sensitivity;
      this.cameraPitch -= e.movementY * sensitivity;
      this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch));
    } else if (this.isMouseDown) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraYaw -= deltaX * sensitivity;
      this.cameraPitch -= deltaY * sensitivity;
      this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch));
    }
  };

  private setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.container.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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
    } else if (type === 'Horn') {
      soundManager.playHorn();
    }
  }

  public spawnTracer(start: THREE.Vector3, direction: THREE.Vector3) {
    this.activeTracers.push({
      pos: start.clone(),
      dir: direction.clone().normalize(),
      life: 0.6,
    });
  }

  public updateEnemies(enemies: EnemyEntity[]) {
    while (this.enemiesGroup.children.length > 0) {
      this.enemiesGroup.remove(this.enemiesGroup.children[0]);
    }

    const enemyBodyGeo = new THREE.BoxGeometry(0.85, 0.75, 1.45);
    const enemyHeadGeo = new THREE.ConeGeometry(0.35, 0.65, 6);
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x781212, roughness: 0.5, metalness: 0.75 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1e00 });

    enemies.forEach((enemy) => {
      const group = new THREE.Group();
      group.position.set(enemy.x, enemy.y, enemy.z);

      const body = new THREE.Mesh(enemyBodyGeo, enemyMat);
      body.position.y = 0.5;
      group.add(body);

      const head = new THREE.Mesh(enemyHeadGeo, enemyMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.6, 0.85);
      group.add(head);

      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.1), eyeMat);
      eye.position.set(0, 0.62, 1.1);
      group.add(eye);

      // Spider-like metallic legs
      for (const leg of [-1, 1]) {
        for (const lz of [-0.4, 0.2]) {
          const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95), enemyMat);
          legMesh.position.set(leg * 0.55, 0.28, lz);
          legMesh.rotation.z = leg * 0.42;
          group.add(legMesh);
        }
      }

      this.enemiesGroup.add(group);
    });
  }

  // Main simulation render step
  public update(delta: number, trainSpeed: number, turretState: TurretState) {
    if (this.isDestroyed) return;

    const speedMps = (trainSpeed * 1000) / 3600; // m/s
    const moveZ = speedMps * delta;

    // Dynamic Weather Lerping (Smooth transition of Fog & Global Illumination)
    if (this.fogExp) {
      this.fogExp.density = THREE.MathUtils.lerp(this.fogExp.density, this.targetFogDensity, delta * 2.0);
      this.fogExp.color.lerp(this.targetFogColor, delta * 2.0);
      (this.scene.background as THREE.Color).lerp(this.targetFogColor, delta * 2.0);
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, this.targetAmbientIntensity, delta * 2.0);
      this.ambientLight.color.lerp(this.targetAmbientColor, delta * 2.0);
    }
    if (this.moonLight) {
      this.moonLight.intensity = THREE.MathUtils.lerp(this.moonLight.intensity, this.targetMoonIntensity, delta * 2.0);
      this.moonLight.color.lerp(this.targetMoonColor, delta * 2.0);
    }
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, this.targetExposure, delta * 2.0);
    if (this.auroraMesh) {
      const mat = this.auroraMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, this.targetAuroraOpacity, delta * 2.0);
    }
    if (this.starParticles) {
      const mat = this.starParticles.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, this.targetStarOpacity, delta * 2.0);
    }

    // 1. Move Scenery backwards based on speed
    this.sceneryGroup.children.forEach((obj) => {
      obj.position.z -= moveZ;
      if (obj.position.z < -280) {
        obj.position.z += 560;
      }
    });

    // 2. Parallax Foothills & Ridges movement (middle distance)
    this.ridgeGroup.children.forEach((rg) => {
      rg.position.z -= moveZ * 0.42;
      if (rg.position.z < -350) {
        rg.position.z += 700;
      }
    });

    // 3. Parallax Mountains movement (moving slower to simulate vast distance)
    this.mountainGroup.children.forEach((mt) => {
      mt.position.z -= moveZ * 0.18;
      if (mt.position.z < -400) {
        mt.position.z += 800;
      }
    });

    // 4. Parallax Distant Broken City Horizon Silhouettes (procedural skyline shifting with train speed)
    const horizonSpeedFactor = 0.12 + Math.min(0.04, (trainSpeed / 120) * 0.04);
    this.cityHorizonGroup.children.forEach((building) => {
      building.position.z -= moveZ * horizonSpeedFactor;
      if (building.position.z < -450) {
        building.position.z += 900;
      }
      // Speed-dependent dynamic perspective shift / vibration
      if (trainSpeed > 25) {
        building.position.y = Math.sin(Date.now() * 0.003 + building.position.z * 0.02) * 0.14;
      }
    });

    // 5. Rotate Steel Bogie Wheels
    if (speedMps > 0.05) {
      const angularRotation = (speedMps / 0.42) * delta;
      this.wheelMeshes.forEach((w) => {
        w.rotation.x += angularRotation;
      });
    }

    // 4. Firebox pulsation
    if (this.fireboxLight) {
      this.fireboxLight.intensity = 2.4 + Math.sin(Date.now() * 0.008) * 0.8;
    }

    // 5. Blinking warning lamps on signal gantries
    if (this.signalLights.length > 0) {
      const blink = Math.sin(Date.now() * 0.005) > 0;
      this.signalLights.forEach((light) => {
        light.intensity = blink ? 3.0 : 0.4;
      });
    }

    // 6. Precipitation Particles: Blizzard Snow vs Freezing Rain
    if (this.snowParticles) {
      const isBlizzard = this.currentWeather === 'blizzard';
      this.snowParticles.visible = isBlizzard;
      if (isBlizzard) {
        const positions = this.snowParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 5.5 * delta; // falling
          positions[i + 2] -= (speedMps + 12.0) * delta; // fierce horizontal blizzard drift
          positions[i] += Math.sin(positions[i + 1] * 0.2 + Date.now() * 0.003) * 0.15;
          if (positions[i + 1] < 0) positions[i + 1] = 30;
          if (positions[i + 2] < -80) positions[i + 2] += 160;
        }
        this.snowParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.rainParticles) {
      const isRain = this.currentWeather === 'rain';
      this.rainParticles.visible = isRain;
      if (isRain) {
        const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 32.0 * delta; // rapid heavy rain downpour
          positions[i + 2] -= (speedMps + 2.5) * delta; // angled rain
          if (positions[i + 1] < 0) positions[i + 1] = 30;
          if (positions[i + 2] < -80) positions[i + 2] += 160;
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 7. Locomotive Smokestack Smoke
    if (this.smokeParticles && trainSpeed > 2) {
      const pos = this.smokeParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += 3.8 * delta;
        pos[i + 2] -= (speedMps * 0.85 + 7) * delta;
        pos[i] += (Math.random() - 0.5) * 0.12;
        if (pos[i + 2] < -45 || pos[i + 1] > 14) {
          pos[i] = 0;
          pos[i + 1] = 4.3;
          pos[i + 2] = 12.6;
        }
      }
      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 8. Wheel Sparks (active when moving fast > 40 km/h)
    if (this.wheelSparks) {
      const sparkPos = this.wheelSparks.geometry.attributes.position.array as Float32Array;
      const isSparksActive = trainSpeed > 45;
      for (let i = 0; i < sparkPos.length; i += 3) {
        if (isSparksActive) {
          sparkPos[i + 2] -= (speedMps + 10) * delta;
          sparkPos[i + 1] += (Math.random() - 0.4) * 0.2;
          if (sparkPos[i + 2] < -35) {
            sparkPos[i + 2] = 10 - Math.random() * 30;
            sparkPos[i + 1] = 0.25;
          }
        } else {
          sparkPos[i + 1] = -10; // hide below ground
        }
      }
      this.wheelSparks.geometry.attributes.position.needsUpdate = true;
    }

    // 9. Update Turret Model rotation
    if (this.turretBaseMesh && this.turretBarrelsMesh) {
      if (this.isMountedToTurret) {
        this.turretBaseMesh.rotation.y = this.cameraYaw;
        this.turretBarrelsMesh.rotation.x = this.cameraPitch;
      } else {
        this.turretBaseMesh.rotation.y = turretState.yaw;
        this.turretBarrelsMesh.rotation.x = turretState.pitch;
      }
    }

    // 10. Player Movement
    this.updatePlayerMovement(delta);

    // 11. Camera sync
    if (this.isMountedToTurret) {
      this.camera.position.set(0, 4.35, -14.5);
    } else {
      this.camera.position.copy(this.playerPos);
    }

    const forward = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ');
    forward.applyEuler(euler);
    this.camera.lookAt(this.camera.position.clone().add(forward));

    // 12. Check Interactables
    this.checkInteractables();

    // 13. Update 3D Positional Audio System
    this.update3DAudio(delta, trainSpeed);

    // 14. Render
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlayerMovement(delta: number) {
    if (this.isMountedToTurret) return;

    const moveSpeed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 6.5 : 3.8;
    const moveDir = new THREE.Vector3();

    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      this.playerPos.addScaledVector(moveDir, moveSpeed * delta);
    }

    // Aisle boundary constraints
    if (!this.stationGroup.visible) {
      this.playerPos.x = Math.max(-1.1, Math.min(1.1, this.playerPos.x));
      this.playerPos.z = Math.max(-27.5, Math.min(8.0, this.playerPos.z));
      this.playerPos.y = 1.7;
    } else {
      // Allowed on platform
      this.playerPos.x = Math.max(-1.1, Math.min(6.5, this.playerPos.x));
      this.playerPos.z = Math.max(-27.5, Math.min(22.0, this.playerPos.z));
      this.playerPos.y = 1.7;
    }
  }

  private checkInteractables() {
    const t = TRANSLATIONS[this.language];

    const interactables: InteractionTarget[] = [
      { type: 'Throttle', name: t.interactThrottle, position: new THREE.Vector3(0, 1.7, 7.6), distance: 0 },
      { type: 'Horn', name: t.interactHorn, position: new THREE.Vector3(-0.8, 1.9, 7.6), distance: 0 },
      { type: 'Workbench', name: t.interactWorkbench, position: new THREE.Vector3(-0.8, 1.5, -4.5), distance: 0 },
      {
        type: 'Turret',
        name: this.isMountedToTurret ? t.interactDismountTurret : t.interactMountTurret,
        position: new THREE.Vector3(0, 3.2, -14.5),
        distance: 0,
      },
      { type: 'Storage', name: t.interactStorage, position: new THREE.Vector3(0, 1.5, -24.5), distance: 0 },
    ];

    if (this.stationGroup.visible) {
      interactables.push(
        { type: 'Loot', id: 'crate_scrap', name: t.interactLootScrap, position: new THREE.Vector3(4.2, 1.4, 10), distance: 0 },
        { type: 'Loot', id: 'crate_fuel', name: t.interactLootFuel, position: new THREE.Vector3(4.2, 1.4, 0), distance: 0 },
        { type: 'Loot', id: 'crate_ammo', name: t.interactLootAmmo, position: new THREE.Vector3(4.2, 1.4, -10), distance: 0 }
      );
    }

    let closest: InteractionTarget | null = null;
    let minDist = 3.2;

    for (const item of interactables) {
      const dist = this.playerPos.distanceTo(item.position);
      if (dist < minDist) {
        minDist = dist;
        closest = { ...item, distance: dist };
      }
    }

    this.currentInteractable = closest;
  }

  private init3DAudioSystem(ctx: AudioContext) {
    if (this.audioSystemInitialized || !ctx) return;
    this.audioSystemInitialized = true;

    // Helper: create a looped procedural wind noise buffer
    const bufferDuration = 4.0;
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * bufferDuration;
    const noiseBuffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = noiseBuffer.getChannelData(0);

    // Filtered pink-ish noise buffer for smooth gusting wind
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    // 1. Setup 3D Howling Wind Emitters around train exterior
    const windEmitterConfigs = [
      { pos: new THREE.Vector3(-2.8, 2.2, 6.5), baseFreq: 460, baseGain: 0.16 }, // Cab Left Window
      { pos: new THREE.Vector3(2.8, 2.2, 6.5), baseFreq: 480, baseGain: 0.16 },  // Cab Right Window
      { pos: new THREE.Vector3(0, 1.4, 14.5), baseFreq: 580, baseGain: 0.26 },   // Front Cowcatcher Grill
      { pos: new THREE.Vector3(0, 4.0, -14.5), baseFreq: 640, baseGain: 0.30 },  // Turret Open Gun Deck
      { pos: new THREE.Vector3(0, 2.0, -27.0), baseFreq: 420, baseGain: 0.20 },  // Rear Carriage Gangway
    ];

    windEmitterConfigs.forEach((cfg) => {
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(cfg.baseFreq, ctx.currentTime);
      filter.Q.setValueAtTime(4.2, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);

      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3.0;
      panner.maxDistance = 55.0;
      panner.rolloffFactor = 1.6;

      if (panner.positionX) {
        panner.positionX.setValueAtTime(cfg.pos.x, ctx.currentTime);
        panner.positionY.setValueAtTime(cfg.pos.y, ctx.currentTime);
        panner.positionZ.setValueAtTime(cfg.pos.z, ctx.currentTime);
      } else {
        panner.setPosition(cfg.pos.x, cfg.pos.y, cfg.pos.z);
      }

      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);

      source.start();

      this.windPanners.push({
        panner,
        gain,
        filter,
        source,
        baseGain: cfg.baseGain,
        baseFreq: cfg.baseFreq,
      });
    });

    // 2. Setup 3D Metallic Creaks Emitters at wheels and couplers
    const creakLocations = [
      new THREE.Vector3(-1.15, 0.35, 12.0), // Front bogie left rail
      new THREE.Vector3(1.15, 0.35, 7.0),   // Locomotive bogie right rail
      new THREE.Vector3(0, 0.8, 0.5),       // Coupler 1-2
      new THREE.Vector3(-1.15, 0.35, -4.5), // Workshop bogie
      new THREE.Vector3(0, 0.8, -9.5),      // Coupler 2-3
      new THREE.Vector3(1.15, 0.35, -14.5), // Defense carriage bogie
      new THREE.Vector3(0, 0.8, -19.5),     // Coupler 3-4
      new THREE.Vector3(0, 0.35, -24.5),    // Storage carriage bogie
    ];

    creakLocations.forEach((pos) => {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 2.2;
      panner.maxDistance = 45.0;
      panner.rolloffFactor = 1.8;

      if (panner.positionX) {
        panner.positionX.setValueAtTime(pos.x, ctx.currentTime);
        panner.positionY.setValueAtTime(pos.y, ctx.currentTime);
        panner.positionZ.setValueAtTime(pos.z, ctx.currentTime);
      } else {
        panner.setPosition(pos.x, pos.y, pos.z);
      }

      panner.connect(ctx.destination);
      this.creakPanners.push({ panner, pos });
    });
  }

  private update3DAudio(delta: number, trainSpeed: number) {
    if (this.isDestroyed) return;
    const ctx = soundManager.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended' && !soundManager.isSoundMuted()) {
      ctx.resume().catch(() => {});
    }

    if (!this.audioSystemInitialized && ctx.state === 'running') {
      this.init3DAudioSystem(ctx);
    }

    if (!this.audioSystemInitialized) return;

    // 1. Update 3D Audio Listener to match First-Person Camera position & orientation
    const camPos = this.camera.position;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const up = this.camera.up;

    if (ctx.listener.positionX) {
      ctx.listener.positionX.setTargetAtTime(camPos.x, ctx.currentTime, 0.04);
      ctx.listener.positionY.setTargetAtTime(camPos.y, ctx.currentTime, 0.04);
      ctx.listener.positionZ.setTargetAtTime(camPos.z, ctx.currentTime, 0.04);
      ctx.listener.forwardX.setTargetAtTime(forward.x, ctx.currentTime, 0.04);
      ctx.listener.forwardY.setTargetAtTime(forward.y, ctx.currentTime, 0.04);
      ctx.listener.forwardZ.setTargetAtTime(forward.z, ctx.currentTime, 0.04);
      ctx.listener.upX.setTargetAtTime(up.x, ctx.currentTime, 0.04);
      ctx.listener.upY.setTargetAtTime(up.y, ctx.currentTime, 0.04);
      ctx.listener.upZ.setTargetAtTime(up.z, ctx.currentTime, 0.04);
    } else if (ctx.listener.setPosition) {
      ctx.listener.setPosition(camPos.x, camPos.y, camPos.z);
      ctx.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }

    // 2. Modulate Positional Howling Wind according to Weather & Speed
    const isMuted = soundManager.isSoundMuted();
    const now = Date.now();
    const speedRatio = Math.min(1.5, trainSpeed / 60);

    let weatherMultiplier = 1.0;
    let freqOffset = 0;
    if (this.currentWeather === 'blizzard') {
      weatherMultiplier = 1.8 + Math.sin(now * 0.002) * 0.6; // heavy gale howling gusts
      freqOffset = 180 + Math.sin(now * 0.0028) * 120;
    } else if (this.currentWeather === 'rain') {
      weatherMultiplier = 0.75 + Math.sin(now * 0.0015) * 0.25;
      freqOffset = -80;
    } else {
      weatherMultiplier = 0.25; // crisp quiet breeze
      freqOffset = -140;
    }

    this.windPanners.forEach((wp, idx) => {
      if (isMuted) {
        wp.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      } else {
        const gustPhase = Math.sin(now * 0.0025 + idx * 1.4);
        const targetVol = wp.baseGain * weatherMultiplier * (0.8 + 0.4 * gustPhase) * (0.7 + speedRatio * 0.6);
        wp.gain.gain.setTargetAtTime(Math.min(0.45, Math.max(0, targetVol)), ctx.currentTime, 0.08);

        const targetFreq = Math.max(120, wp.baseFreq + freqOffset + speedRatio * 140 + gustPhase * 80);
        wp.filter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
      }
    });

    // 3. Periodically Trigger Positional Track Creaks from Bogies & Couplers
    if (!isMuted && trainSpeed > 6) {
      if (now > this.nextCreakTime) {
        const creakInterval = Math.max(1600, 4800 - (trainSpeed / 80) * 2600 + (Math.random() - 0.5) * 1200);
        this.nextCreakTime = now + creakInterval;

        const randomPanner = this.creakPanners[Math.floor(Math.random() * this.creakPanners.length)];
        if (randomPanner) {
          this.playPositionalTrackCreak(ctx, randomPanner.panner, speedRatio);
        }
      }
    }
  }

  private playPositionalTrackCreak(ctx: AudioContext, panner: PannerNode, speedRatio: number) {
    if (soundManager.isSoundMuted()) return;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const isHighFlangeSqueal = Math.random() > 0.55;
    const baseFreq = isHighFlangeSqueal ? 950 + Math.random() * 850 : 175 + Math.random() * 150;

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * (0.82 + Math.random() * 0.35), t + 0.48);

    osc2.frequency.setValueAtTime(baseFreq * 1.52, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + 0.48);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.25, t);
    filter.Q.setValueAtTime(isHighFlangeSqueal ? 8.5 : 4.8, t);

    const peakVol = (0.09 + Math.random() * 0.11) * Math.min(1.4, 0.7 + speedRatio * 0.6);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peakVol, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  private cleanup3DAudio() {
    this.windPanners.forEach((wp) => {
      try {
        wp.source.stop();
        wp.source.disconnect();
        wp.filter.disconnect();
        wp.gain.disconnect();
        wp.panner.disconnect();
      } catch {}
    });
    this.windPanners = [];

    this.creakPanners.forEach((cp) => {
      try {
        cp.panner.disconnect();
      } catch {}
    });
    this.creakPanners = [];
    this.audioSystemInitialized = false;
  }

  public destroy() {
    this.isDestroyed = true;
    this.cleanup3DAudio();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.container.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);

    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);

    window.removeEventListener('resize', this.onResize);

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
