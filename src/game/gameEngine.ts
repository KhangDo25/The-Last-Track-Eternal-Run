import {
  CarriageData,
  CraftingRecipe,
  EnemyEntity,
  GameState,
  HUDNotification,
  InventoryItem,
  PlayerStats,
  StationData,
  ThrottleLevel,
  TrackHazard,
  TrackHazardType,
  TrainStats,
  TurretState,
  UpgradeOption,
  WeatherTimelineItem,
} from '../types/game';
import { soundManager } from '../audio/soundManager';

const DEFAULT_RECIPES: CraftingRecipe[] = [
  {
    id: 'recipe_ammo',
    name: '7.62mm Turret Ammo (x50)',
    description: 'Standard armor-piercing rounds for the train Gatling turret.',
    category: 'Ammunition',
    inputs: [
      { itemId: 'scrap', name: 'Scrap Metal', quantity: 15 },
      { itemId: 'chemical', name: 'Chemical Powder', quantity: 5 },
    ],
    output: {
      id: 'ammo_762',
      name: '7.62mm Ammo',
      type: 'Ammo',
      weight: 2.0,
      quantity: 50,
      maxStack: 300,
      description: 'Belt-fed ammo for defense turret.',
      icon: 'crosshair',
    },
    craftTimeSeconds: 2,
    requiredWorkshopLevel: 1,
  },
  {
    id: 'recipe_repair_kit',
    name: 'Hull Welding Patch Kit',
    description: 'Restores +50 HP to damaged carriage hulls or locomotive.',
    category: 'Repair',
    inputs: [
      { itemId: 'scrap', name: 'Scrap Metal', quantity: 20 },
      { itemId: 'steel', name: 'Refined Steel', quantity: 5 },
    ],
    output: {
      id: 'repair_kit',
      name: 'Welding Patch Kit',
      type: 'Material',
      weight: 3.5,
      quantity: 1,
      maxStack: 10,
      description: 'Used to repair carriage armor breaches.',
      icon: 'wrench',
    },
    craftTimeSeconds: 3,
    requiredWorkshopLevel: 1,
  },
  {
    id: 'recipe_biofuel',
    name: 'Bio-Diesel Fuel Canister (+25L)',
    description: 'Synthesized synthetic fuel directly injectable into locomotive fuel tank.',
    category: 'Components',
    inputs: [
      { itemId: 'chemical', name: 'Chemical Powder', quantity: 10 },
      { itemId: 'water', name: 'Purified Water', quantity: 10 },
    ],
    output: {
      id: 'fuel_can',
      name: 'Synthetic Fuel (+25L)',
      type: 'Resource',
      weight: 5.0,
      quantity: 1,
      maxStack: 5,
      description: 'High octane fuel canister.',
      icon: 'flame',
    },
    craftTimeSeconds: 4,
    requiredWorkshopLevel: 1,
  },
];

const DEFAULT_UPGRADES: UpgradeOption[] = [
  {
    id: 'upg_steel_armor',
    name: 'Reinforced Steel Armor Plates',
    targetType: 'Defense',
    slotType: 'Armor',
    description: '+25% Armor protection, +60 Carriage HP, adds 2.5 tons weight.',
    cost: [
      { itemId: 'steel', name: 'Refined Steel', quantity: 20 },
      { itemId: 'scrap', name: 'Scrap Metal', quantity: 30 },
    ],
    weightDelta: 2.5,
    powerDelta: 0,
    healthDelta: 60,
    armorDelta: 25,
  },
  {
    id: 'upg_gatling_mk2',
    name: 'Gatling Mk2 Overclocked Rotor',
    targetType: 'Defense',
    slotType: 'Weapon',
    description: '+50% Turret Fire Rate, +4 Damage per shot, requires +25W extra power.',
    cost: [
      { itemId: 'steel', name: 'Refined Steel', quantity: 25 },
      { itemId: 'electronics', name: 'Electronics Parts', quantity: 12 },
      { itemId: 'scrap', name: 'Scrap Metal', quantity: 40 },
    ],
    weightDelta: 0.8,
    powerDelta: 25,
    damageDelta: 4,
  },
  {
    id: 'upg_generator_mk2',
    name: 'Auxiliary Diesel Generator Mk2',
    targetType: 'Locomotive',
    slotType: 'Power',
    description: 'Doubles electrical grid output from 120W to 240W. Increases train weight by 1.8 tons.',
    cost: [
      { itemId: 'steel', name: 'Refined Steel', quantity: 15 },
      { itemId: 'electronics', name: 'Electronics Parts', quantity: 15 },
      { itemId: 'scrap', name: 'Scrap Metal', quantity: 25 },
    ],
    weightDelta: 1.8,
    powerDelta: -120, // Negative delta = produces 120W more
  },
];

export class GameEngine {
  public gameState: GameState = 'Playing';
  public godMode: boolean = false;

  // Player state
  public playerStats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    hunger: 100,
    thirst: 100,
    bodyTemperature: 37.0,
    toxicity: 0,
    sanity: 100,
    oxygen: 100,
  };

  public inventory: InventoryItem[] = [
    { id: 'scrap', name: 'Scrap Metal', type: 'Material', weight: 0.5, quantity: 45, maxStack: 100, description: 'Salvaged metal pieces.', icon: 'box' },
    { id: 'steel', name: 'Refined Steel', type: 'Material', weight: 1.2, quantity: 22, maxStack: 50, description: 'Heavy structural alloy.', icon: 'shield' },
    { id: 'water', name: 'Purified Water', type: 'Water', weight: 1.0, quantity: 15, maxStack: 30, description: 'Clean drinking water.', icon: 'droplet' },
    { id: 'food', name: 'MRE Ration', type: 'Food', weight: 0.4, quantity: 8, maxStack: 20, description: 'Nutritious military rations.', icon: 'coffee' },
    { id: 'ammo_762', name: '7.62mm Ammo', type: 'Ammo', weight: 0.05, quantity: 180, maxStack: 400, description: 'Defense turret ammunition.', icon: 'crosshair' },
    { id: 'chemical', name: 'Chemical Powder', type: 'Resource', weight: 0.2, quantity: 14, maxStack: 50, description: 'Volatile compounds.', icon: 'beaker' },
    { id: 'electronics', name: 'Electronics Parts', type: 'Resource', weight: 0.3, quantity: 8, maxStack: 40, description: 'Circuit boards and relays.', icon: 'cpu' },
  ];

  public storage: InventoryItem[] = [
    { id: 'scrap', name: 'Scrap Metal', type: 'Material', weight: 0.5, quantity: 80, maxStack: 500, description: 'Train stockpile scrap.', icon: 'box' },
    { id: 'steel', name: 'Refined Steel', type: 'Material', weight: 1.2, quantity: 30, maxStack: 200, description: 'Stockpile steel.', icon: 'shield' },
  ];

  // Train state
  public trainStats: TrainStats = {
    currentSpeed: 45,
    targetSpeed: 45,
    maxSpeed: 95,
    throttle: 50,
    state: 'Moving',
    currentFuel: 82,
    maxFuel: 100,
    fuelConsumptionRate: 1.2,
    totalWeight: 44.5,
    powerGeneration: 160,
    powerConsumption: 85,
    circuitBreakerTripped: false,
    distanceTraveled: 12.4,
    nextStationDistance: 3.5, // km until station
  };

  // Carriages
  public carriages: CarriageData[] = [
    {
      id: 'car_locomotive',
      name: 'Ironclad Locomotive #01',
      type: 'Locomotive',
      maxHealth: 500,
      currentHealth: 480,
      baseWeight: 22.0,
      powerConsumption: 10,
      powerProduction: 160, // Generator Mk1
      armorRating: 30,
      installedUpgrades: [],
      weaponSlots: 0,
      armorSlots: 2,
      utilitySlots: 2,
      positionIndex: 0,
    },
    {
      id: 'car_workshop',
      name: 'Workshop & Living Car',
      type: 'Workshop',
      maxHealth: 300,
      currentHealth: 290,
      baseWeight: 8.5,
      powerConsumption: 35,
      powerProduction: 0,
      armorRating: 15,
      installedUpgrades: [],
      weaponSlots: 0,
      armorSlots: 2,
      utilitySlots: 3,
      positionIndex: 1,
    },
    {
      id: 'car_defense',
      name: 'Reinforced Defense Car',
      type: 'Defense',
      maxHealth: 350,
      currentHealth: 340,
      baseWeight: 9.0,
      powerConsumption: 25,
      powerProduction: 0,
      armorRating: 25,
      installedUpgrades: [],
      weaponSlots: 2,
      armorSlots: 4,
      utilitySlots: 1,
      positionIndex: 2,
    },
    {
      id: 'car_storage',
      name: 'Heavy Cargo Storage Car',
      type: 'Storage',
      maxHealth: 280,
      currentHealth: 275,
      baseWeight: 5.0,
      powerConsumption: 15,
      powerProduction: 0,
      armorRating: 10,
      installedUpgrades: [],
      weaponSlots: 0,
      armorSlots: 2,
      utilitySlots: 4,
      positionIndex: 3,
    },
  ];

  // Turret
  public turret: TurretState = {
    id: 'turret_01',
    name: 'Gatling Autocannon Mk1',
    type: 'Gatling',
    level: 1,
    damage: 16,
    range: 65,
    fireRate: 8, // shots/sec
    powerConsumption: 25,
    ammoType: '7.62mm',
    currentAmmo: 250,
    maxAmmo: 300,
    heat: 0,
    isOverheated: false,
    targetCarriageId: 'car_defense',
    isMounted: false,
    yaw: 0,
    pitch: 0,
  };

  // Enemies
  public enemies: EnemyEntity[] = [];
  private enemySpawnTimer = 0;

  // Station
  public currentStation: StationData | null = null;

  // Timers for hunger / thirst drain per spec:
  // Hunger base: -1 / 15 sec (spec section 45)
  // Thirst base: -1 / 10 sec (spec section 46)
  private hungerTimer = 0;
  private thirstTimer = 0;
  private weatherTempTimer = 0;

  public availableRecipes = DEFAULT_RECIPES;
  public availableUpgrades = DEFAULT_UPGRADES;

  // Dynamic Weather Cycle & Timeline
  public currentWeather: 'clear' | 'rain' | 'blizzard' = 'blizzard';
  public weatherTimeRemaining: number = 75; // seconds left in current weather segment
  public weatherTimeline: WeatherTimelineItem[] = [
    { weather: 'blizzard', startsInSeconds: 0, durationSeconds: 75 },
    { weather: 'rain', startsInSeconds: 75, durationSeconds: 60 },
    { weather: 'clear', startsInSeconds: 135, durationSeconds: 85 },
    { weather: 'blizzard', startsInSeconds: 220, durationSeconds: 90 },
  ];
  public onWeatherChange?: (weather: 'clear' | 'rain' | 'blizzard') => void;

  // Real-time notification feed
  public notifications: HUDNotification[] = [];

  public addNotification(notif: Omit<HUDNotification, 'id' | 'timestamp'>) {
    const item: HUDNotification = {
      ...notif,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    this.notifications.unshift(item);
    if (this.notifications.length > 5) {
      this.notifications.pop();
    }
  }

  // Track Condition & Hazardous Terrain System
  public currentTrackHazard: TrackHazard | null = null;
  private distanceToNextHazard = 0.9; // km

  constructor() {
    Object.defineProperty(this.trainStats, 'fuel', {
      get: () => this.trainStats.currentFuel,
      set: (val: number) => {
        this.trainStats.currentFuel = val;
      },
      enumerable: true,
      configurable: true,
    });
    this.recalculateTrainStats();
  }

  public recalculateTrainStats() {
    let weight = 0;
    let powerProd = 0;
    let powerCons = 0;

    for (const c of this.carriages) {
      weight += c.baseWeight;
      powerProd += c.powerProduction;
      powerCons += c.powerConsumption;
    }

    // Add cargo weight
    let storageWeightTons = 0;
    for (const it of this.storage) {
      storageWeightTons += (it.weight * it.quantity) / 1000;
    }
    weight += storageWeightTons;

    // Turret power
    powerCons += this.turret.powerConsumption;

    this.trainStats.totalWeight = Math.round(weight * 10) / 10;
    this.trainStats.powerGeneration = powerProd;
    this.trainStats.powerConsumption = powerCons;

    // Circuit breaker trip condition per section 14
    if (powerCons > powerProd) {
      this.trainStats.circuitBreakerTripped = true;
    } else {
      this.trainStats.circuitBreakerTripped = false;
    }

    // Max speed decreases with weight
    const maxPossible = Math.max(50, 115 - this.trainStats.totalWeight * 0.8);
    this.trainStats.maxSpeed = Math.round(maxPossible);
  }

  public setThrottle(level: ThrottleLevel) {
    this.trainStats.throttle = level;
    let ratio = 0;
    if (level === 25) ratio = 0.3;
    else if (level === 50) ratio = 0.55;
    else if (level === 75) ratio = 0.8;
    else if (level === 100) ratio = 1.0;
    else if (level === 120) ratio = 1.25;

    this.trainStats.targetSpeed = Math.round(this.trainStats.maxSpeed * ratio);
    if (level === 0) {
      this.trainStats.targetSpeed = 0;
      this.trainStats.state = 'Braking';
    } else {
      this.trainStats.state = 'Moving';
    }
    soundManager.playClick();
  }

  public triggerEmergencyBrake() {
    this.trainStats.throttle = 0;
    this.trainStats.targetSpeed = 0;
    this.trainStats.state = 'EmergencyStop';
    soundManager.playAlarm();
  }

  public update(delta: number) {
    if (this.gameState === 'GameOver' || this.gameState === 'Paused') return;

    // Prune expired notifications (> 5.5s)
    const now = Date.now();
    this.notifications = this.notifications.filter((n) => now - n.timestamp < 5500);

    // Weather Cycle Progression & Dynamic Timeline
    this.updateWeatherCycle(delta);

    // 1. Train Movement & Physics (spec 8.2, 8.4) with weather modifiers
    this.updateTrainPhysics(delta);

    // Track Condition & Terrain Hazards
    this.updateTrackHazards(delta);

    // 2. Survival Systems (spec 44-48) with hypothermia in blizzard
    this.updateSurvival(delta);

    // 3. Station Logic & Timer (spec 30-32)
    this.updateStation(delta);

    // 4. Enemy Spawning & AI (spec 22-24)
    this.updateEnemies(delta);

    // 5. Turret Auto Fire & Overheat (spec 18-20) with visibility debuff
    this.updateTurret(delta);
  }

  public setWeather(weather: 'clear' | 'rain' | 'blizzard', triggerNotification = true) {
    this.currentWeather = weather;
    this.weatherTimeRemaining = weather === 'blizzard' ? 75 : weather === 'rain' ? 60 : 85;

    // Realign timeline
    const sequence: ('blizzard' | 'rain' | 'clear')[] = ['blizzard', 'rain', 'clear'];
    const idx = sequence.indexOf(weather);
    this.weatherTimeline = [
      { weather, startsInSeconds: 0, durationSeconds: this.weatherTimeRemaining },
      { weather: sequence[(idx + 1) % 3], startsInSeconds: this.weatherTimeRemaining, durationSeconds: 65 },
      { weather: sequence[(idx + 2) % 3], startsInSeconds: this.weatherTimeRemaining + 65, durationSeconds: 80 },
      { weather: sequence[idx], startsInSeconds: this.weatherTimeRemaining + 145, durationSeconds: 75 },
    ];

    if (triggerNotification) {
      const summary =
        weather === 'blizzard'
          ? 'Bão Tuyết: Nhiên liệu +45%, Gia tốc -30%, Tầm nhìn giảm'
          : weather === 'rain'
          ? 'Mưa Lạnh: Phanh -25%, Nhiên liệu +15%, Đường ray trơn'
          : 'Trời Quang: Tầm nhìn tối đa, Hiệu suất động cơ 100%';
      this.addNotification({
        title: 'Chuyển Biến Thời Tiết',
        details: summary,
        type: 'weather',
      });
    }

    if (this.onWeatherChange) {
      this.onWeatherChange(weather);
    }
  }

  private updateWeatherCycle(delta: number) {
    this.weatherTimeRemaining -= delta;

    if (this.weatherTimeline.length > 0) {
      this.weatherTimeline[0].durationSeconds = Math.max(0, this.weatherTimeRemaining);
    }

    let accumulatedTime = Math.max(0, this.weatherTimeRemaining);
    for (let i = 1; i < this.weatherTimeline.length; i++) {
      this.weatherTimeline[i].startsInSeconds = accumulatedTime;
      accumulatedTime += this.weatherTimeline[i].durationSeconds;
    }

    if (this.weatherTimeRemaining <= 0) {
      // Advance to next segment in cycle
      this.weatherTimeline.shift();
      const nextSegment = this.weatherTimeline[0] || { weather: 'blizzard' as const, startsInSeconds: 0, durationSeconds: 75 };

      this.currentWeather = nextSegment.weather;
      this.weatherTimeRemaining = nextSegment.durationSeconds;
      this.weatherTimeline[0].startsInSeconds = 0;

      // Append new future segment to maintain continuous timeline
      const sequence: ('blizzard' | 'rain' | 'clear')[] = ['blizzard', 'rain', 'clear'];
      const lastItem = this.weatherTimeline[this.weatherTimeline.length - 1];
      const nextIdx = (sequence.indexOf(lastItem ? lastItem.weather : 'clear') + 1) % 3;
      const nextWeather = sequence[nextIdx];
      const nextDuration = nextWeather === 'blizzard' ? 75 : nextWeather === 'rain' ? 60 : 85;
      this.weatherTimeline.push({
        weather: nextWeather,
        startsInSeconds: accumulatedTime,
        durationSeconds: nextDuration,
      });

      const summary =
        this.currentWeather === 'blizzard'
          ? 'Bão Tuyết: Nhiên liệu +45%, Gia tốc -30%, Tầm nhìn giảm'
          : this.currentWeather === 'rain'
          ? 'Mưa Lạnh: Phanh -25%, Nhiên liệu +15%, Đường ray trơn'
          : 'Trời Quang: Tầm nhìn tối đa, Hiệu suất động cơ 100%';

      this.addNotification({
        title: 'Chuyển Biến Thời Tiết',
        details: summary,
        type: 'weather',
      });

      if (this.onWeatherChange) {
        this.onWeatherChange(this.currentWeather);
      }
    }
  }

  private updateTrainPhysics(delta: number) {
    const ts = this.trainStats;

    // Environmental gameplay debuffs linked to weather:
    // Blizzard: +45% fuel consumption (snow drag & heating), -30% acceleration (icy rails)
    // Rain: +15% fuel consumption, -25% braking power (slick wet rails)
    // Clear: 100% optimal
    let weatherFuelMultiplier = 1.0;
    let weatherAccelMultiplier = 1.0;
    let weatherBrakeMultiplier = 1.0;

    if (this.currentWeather === 'blizzard') {
      weatherFuelMultiplier = 1.45;
      weatherAccelMultiplier = 0.70;
    } else if (this.currentWeather === 'rain') {
      weatherFuelMultiplier = 1.15;
      weatherBrakeMultiplier = 0.75;
    }

    // Calculate acceleration: a = enginePower / weight
    const enginePower = ts.throttle > 0 ? 120 * (ts.throttle / 100) : 0;
    const accelRate = (enginePower / ts.totalWeight) * 0.45 * weatherAccelMultiplier;
    const brakeRate = (ts.state === 'EmergencyStop' ? 18 : 6) * weatherBrakeMultiplier;

    if (ts.currentSpeed < ts.targetSpeed) {
      ts.currentSpeed = Math.min(ts.targetSpeed, ts.currentSpeed + accelRate * delta);
    } else if (ts.currentSpeed > ts.targetSpeed) {
      ts.currentSpeed = Math.max(ts.targetSpeed, ts.currentSpeed - brakeRate * delta);
    }

    if (ts.currentSpeed === 0 && ts.targetSpeed === 0) {
      ts.state = this.currentStation ? 'Stationary' : 'Stationary';
    }

    // Fuel consumption formula (spec 8.4) with weather impact:
    // FuelConsumption = BaseConsumption * SpeedMultiplier * WeightMultiplier * WeatherMultiplier
    if (ts.currentSpeed > 0 && !this.godMode) {
      const speedMult = ts.currentSpeed / 45;
      const weightMult = ts.totalWeight / 40;
      const baseConsumptionPerSec = 0.05; // ~3L per minute
      const consumed = baseConsumptionPerSec * speedMult * weightMult * weatherFuelMultiplier * delta;
      ts.currentFuel = Math.max(0, ts.currentFuel - consumed);

      if (ts.currentFuel <= 0) {
        // Out of fuel -> train loses power and halts
        ts.throttle = 0;
        ts.targetSpeed = 0;
        ts.state = 'Disabled';
      }
    }

    // Update audio engine pitch
    soundManager.updateEnginePitch(ts.currentSpeed / ts.maxSpeed);

    // Distance tracking
    const kmTraveled = (ts.currentSpeed * delta) / 3600;
    ts.distanceTraveled += kmTraveled;

    if (!this.currentStation) {
      ts.nextStationDistance = Math.max(0, ts.nextStationDistance - kmTraveled);
      if (ts.nextStationDistance <= 0.05 && ts.currentSpeed <= 25) {
        // Arrive at Station!
        this.arriveAtStation();
      }
    }
  }

  private updateTrackHazards(delta: number) {
    if (this.currentStation || this.trainStats.currentSpeed <= 0) return;

    const kmTraveled = (this.trainStats.currentSpeed * delta) / 3600;

    if (!this.currentTrackHazard) {
      this.distanceToNextHazard -= kmTraveled;
      if (this.distanceToNextHazard <= 0) {
        this.spawnTrackHazard();
      }
    } else {
      const metersTraveled = ((this.trainStats.currentSpeed * 1000) / 3600) * delta;
      this.currentTrackHazard.distanceMeters -= metersTraveled;

      if (this.currentTrackHazard.distanceMeters <= 0) {
        // Evaluate transit condition
        const excessSpeed = this.trainStats.currentSpeed > this.currentTrackHazard.maxSafeSpeed;
        if (excessSpeed && !this.godMode) {
          const dmg = this.currentTrackHazard.damageAmount;
          this.carriages[0].currentHealth = Math.max(10, this.carriages[0].currentHealth - dmg);
          soundManager.playHitImpact();
          soundManager.playAlarm();
          this.addNotification({
            title: 'VA CHẠM ĐƯỜNG RAY!',
            details: `Vượt tốc độ an toàn (${Math.round(this.trainStats.currentSpeed)} > ${this.currentTrackHazard.maxSafeSpeed} km/h). Đầu máy chịu ${dmg} sát thương!`,
            type: 'warning',
          });
        } else {
          soundManager.playClick();
          this.addNotification({
            title: 'Vượt Qua Đoạn Ray An Toàn',
            details: `Đã duy trì tốc độ an toàn dưới ${this.currentTrackHazard.maxSafeSpeed} km/h`,
            type: 'loot',
          });
        }

        this.currentTrackHazard = null;
        this.distanceToNextHazard = 1.4 + Math.random() * 2.0; // km
      }
    }
  }

  public spawnTrackHazard() {
    const hazardTypes: {
      type: TrackHazardType;
      name: string;
      maxSafeSpeed: number;
      severity: 'Caution' | 'Danger' | 'Critical';
      damageAmount: number;
      distanceMeters: number;
    }[] = [
      {
        type: 'RustedRails',
        name: 'Đoạn Ray Rỉ Sét Bào Mòn',
        maxSafeSpeed: 40,
        severity: 'Caution',
        damageAmount: 25,
        distanceMeters: 380,
      },
      {
        type: 'TrackDebris',
        name: 'Mảnh Vỡ Đổ Nát Chắn Ray',
        maxSafeSpeed: 30,
        severity: 'Danger',
        damageAmount: 40,
        distanceMeters: 420,
      },
      {
        type: 'IcyFracture',
        name: 'Nứt Gãy Băng Ray',
        maxSafeSpeed: 25,
        severity: 'Critical',
        damageAmount: 55,
        distanceMeters: 360,
      },
    ];

    const template = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    this.currentTrackHazard = {
      id: 'hazard_' + Date.now(),
      type: template.type,
      name: template.name,
      distanceMeters: template.distanceMeters,
      totalDistanceMeters: template.distanceMeters,
      maxSafeSpeed: template.maxSafeSpeed,
      severity: template.severity,
      damageAmount: template.damageAmount,
    };

    soundManager.playAlarm();
    this.addNotification({
      title: 'CẢNH BÁO: ĐỊA HÌNH NGUY HIỂM',
      details: `${template.name} phía trước (${template.distanceMeters}m)! Giảm tốc dưới ${template.maxSafeSpeed} km/h`,
      type: 'warning',
    });
  }

  private arriveAtStation() {
    this.trainStats.currentSpeed = 0;
    this.trainStats.targetSpeed = 0;
    this.trainStats.throttle = 0;
    this.trainStats.state = 'Stationary';
    this.gameState = 'Station';

    // Create Station data with 180 seconds countdown (Section 31)
    this.currentStation = {
      id: 'station_ruin_' + Math.floor(Math.random() * 1000),
      name: 'Outpost Delta-7 Ruin Depot',
      type: 'Ruin',
      totalDuration: 180, // 3 minutes per spec 31
      remainingTime: 180,
      hasWarned120: false,
      hasWarned30: false,
      lootContainers: [
        {
          id: 'crate_scrap',
          name: 'Salvage Scrap Cache',
          looted: false,
          items: [
            { item: { id: 'scrap', name: 'Scrap Metal', type: 'Material', weight: 0.5, quantity: 25, maxStack: 100, description: 'Metal scraps', icon: 'box' }, quantity: 25 },
            { item: { id: 'steel', name: 'Refined Steel', type: 'Material', weight: 1.2, quantity: 8, maxStack: 50, description: 'Alloy bar', icon: 'shield' }, quantity: 8 },
          ],
        },
        {
          id: 'crate_fuel',
          name: 'Fuel Drum Reserve',
          looted: false,
          items: [
            { item: { id: 'chemical', name: 'Chemical Powder', type: 'Resource', weight: 0.2, quantity: 12, maxStack: 50, description: 'Powder', icon: 'beaker' }, quantity: 12 },
            { item: { id: 'biofuel', name: 'Diesel Siphon', type: 'Resource', weight: 4.0, quantity: 1, maxStack: 5, description: 'Fuel can', icon: 'flame' }, quantity: 1 },
          ],
        },
        {
          id: 'crate_ammo',
          name: 'Military Lockbox',
          looted: false,
          items: [
            { item: { id: 'ammo_762', name: '7.62mm Ammo', type: 'Ammo', weight: 0.05, quantity: 100, maxStack: 400, description: 'Turret ammo', icon: 'crosshair' }, quantity: 100 },
            { item: { id: 'electronics', name: 'Electronics Parts', type: 'Resource', weight: 0.3, quantity: 6, maxStack: 40, description: 'Circuits', icon: 'cpu' }, quantity: 6 },
          ],
        },
      ],
    };

    soundManager.playHorn();

    this.addNotification({
      title: 'Đã Cập Trạm Phế Tích',
      details: `${this.currentStation.name} · Đếm ngược 180s`,
      type: 'station',
    });
  }

  private updateStation(delta: number) {
    if (!this.currentStation) return;

    this.currentStation.remainingTime -= delta;

    // Spec 31 Warning schedule:
    // 120 sec -> 1 horn
    // 30 sec  -> 3 horns
    // 0 sec   -> Train departure
    if (this.currentStation.remainingTime <= 120 && !this.currentStation.hasWarned120) {
      this.currentStation.hasWarned120 = true;
      soundManager.playHorn();
      this.addNotification({
        title: 'Cảnh Báo Còi Trạm (120s)',
        details: 'Còn 2 phút trước khi tàu rời ga!',
        type: 'warning',
      });
    }

    if (this.currentStation.remainingTime <= 30 && !this.currentStation.hasWarned30) {
      this.currentStation.hasWarned30 = true;
      soundManager.playHorn();
      setTimeout(() => soundManager.playHorn(), 1500);
      setTimeout(() => soundManager.playHorn(), 3000);
      this.addNotification({
        title: 'CẢNH BÁO KHỞI HÀNH (30s)',
        details: 'Khẩn trương quay lại tàu ngay!',
        type: 'warning',
      });
    }

    if (this.currentStation.remainingTime <= 0) {
      this.departFromStation();
    }
  }

  public departFromStation() {
    this.currentStation = null;
    this.gameState = 'Playing';
    this.trainStats.nextStationDistance = 12.0; // Next station 12km out
    this.setThrottle(50);
    soundManager.playHorn();
    this.addNotification({
      title: 'Đoàn Tàu Đã Rời Trạm',
      details: 'Tiếp tục hành trình xuyên vùng đất hoang',
      type: 'station',
    });
  }

  private updateSurvival(delta: number) {
    if (this.godMode) return;

    const p = this.playerStats;

    // Weather impact on body temperature (hypothermia in blizzard):
    if (this.currentWeather === 'blizzard') {
      p.bodyTemperature = Math.max(33.2, p.bodyTemperature - 0.045 * delta);
    } else if (this.currentWeather === 'clear') {
      p.bodyTemperature = Math.min(37.0, p.bodyTemperature + 0.05 * delta);
    }

    // Hunger: -1 per 15s (spec 45)
    this.hungerTimer += delta;
    if (this.hungerTimer >= 15) {
      this.hungerTimer = 0;
      p.hunger = Math.max(0, p.hunger - 1);
    }

    // Thirst: -1 per 10s (spec 46), rain increases drain rate by 30%
    const thirstRate = this.currentWeather === 'rain' ? 1.3 : 1.0;
    this.thirstTimer += delta * thirstRate;
    if (this.thirstTimer >= 10) {
      this.thirstTimer = 0;
      p.thirst = Math.max(0, p.thirst - 1);
    }

    // Oxygen level simulation:
    // If circuit breaker is tripped (scrubbers down) or toxicity > 40, oxygen decreases
    if (this.trainStats.circuitBreakerTripped || p.toxicity > 40) {
      p.oxygen = Math.max(0, p.oxygen - 2.5 * delta);
    } else {
      p.oxygen = Math.min(100, p.oxygen + 4.0 * delta);
    }

    // Starvation / Dehydration / Hypothermia / Asphyxiation damage
    const isHypothermic = p.bodyTemperature < 34.5;
    const isLowOxygen = p.oxygen < 20;
    if (p.hunger === 0 || p.thirst === 0 || isHypothermic || isLowOxygen) {
      const hypothermiaPenalty = isHypothermic ? 0.6 : 0;
      const oxygenPenalty = isLowOxygen ? 1.5 : 0;
      p.health = Math.max(0, p.health - (0.5 + hypothermiaPenalty + oxygenPenalty) * delta);
    }

    // Check game over
    if (p.health <= 0) {
      this.gameState = 'GameOver';
      soundManager.playAlarm();
    }
  }

  private updateEnemies(delta: number) {
    if (this.trainStats.currentSpeed < 5) return; // Chasers chase moving train

    this.enemySpawnTimer += delta;
    if (this.enemySpawnTimer > 14 && this.enemies.length < 5) {
      this.enemySpawnTimer = 0;
      // Spawn chaser alongside train (Z: behind train, running to catch up)
      const side = Math.random() > 0.5 ? 4.5 : -4.5;
      this.enemies.push({
        id: 'chaser_' + Math.floor(Math.random() * 10000),
        type: 'Chaser',
        x: side,
        y: 0.2,
        z: -35 - Math.random() * 20,
        health: 40,
        maxHealth: 40,
        speed: 18 + Math.random() * 4,
        targetCarriageIndex: 2, // Attacks Defense or Storage car
        isAttached: false,
        attackTimer: 0,
        damagePerHit: 8,
      });
    }

    // Update enemy movement towards train
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const targetZ = -14.5; // Defense carriage position

      if (e.z < targetZ) {
        e.z += e.speed * delta;
      } else {
        // In attacking range of the carriage!
        e.isAttached = true;
        e.attackTimer += delta;
        if (e.attackTimer > 2.0) {
          e.attackTimer = 0;
          // Attack carriage!
          const targetCar = this.carriages[e.targetCarriageIndex];
          if (targetCar && !this.godMode) {
            const effectiveDamage = Math.max(2, e.damagePerHit * (1 - targetCar.armorRating / 100));
            targetCar.currentHealth = Math.max(0, targetCar.currentHealth - effectiveDamage);
            soundManager.playHitImpact();
          }
        }
      }
    }
  }

  private updateTurret(delta: number) {
    const t = this.turret;

    // Cool down turret heat over time
    if (t.heat > 0) {
      t.heat = Math.max(0, t.heat - 18 * delta);
      if (t.heat < 25) {
        t.isOverheated = false;
      }
    }

    // Auto targeting when not player mounted (spec 20) with weather visibility limit
    const visibilityRange =
      this.currentWeather === 'blizzard'
        ? t.range * 0.6
        : this.currentWeather === 'rain'
        ? t.range * 0.85
        : t.range;

    if (!t.isMounted && this.enemies.length > 0 && t.currentAmmo > 0 && !t.isOverheated) {
      // Find closest enemy
      let closest: EnemyEntity | null = null;
      let minDist = visibilityRange;

      for (const e of this.enemies) {
        const dist = Math.hypot(e.x, e.z - (-14.5));
        if (dist < minDist) {
          minDist = dist;
          closest = e;
        }
      }

      if (closest) {
        // Aim at enemy
        const angle = Math.atan2(closest.x, closest.z - (-14.5));
        t.yaw = angle;

        // Auto Fire
        this.fireTurretAt(closest, delta);
      }
    }
  }

  public fireTurretManual(cameraForward: { x: number; y: number; z: number }) {
    const t = this.turret;
    if (t.currentAmmo <= 0 || t.isOverheated) {
      soundManager.playClick();
      return false;
    }

    t.currentAmmo--;
    t.heat = Math.min(100, t.heat + 4.5);
    if (t.heat >= 100) {
      t.isOverheated = true;
      soundManager.playAlarm();
    }

    soundManager.playTurretShot();

    // Check hit against enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      // Manual aim ray check
      e.health -= t.damage;
      soundManager.playHitImpact();
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
      }
      break;
    }

    return true;
  }

  private fireTurretAt(enemy: EnemyEntity, delta: number) {
    const t = this.turret;
    t.heat = Math.min(100, t.heat + 15 * delta);
    if (t.heat >= 100) {
      t.isOverheated = true;
    }

    t.currentAmmo = Math.max(0, t.currentAmmo - 1);
    soundManager.playTurretShot();

    enemy.health -= t.damage * (delta * t.fireRate);
    if (enemy.health <= 0) {
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) {
        this.enemies.splice(idx, 1);
        soundManager.playHitImpact();
      }
    }
  }

  public lootStationCrate(crateId: string): boolean {
    if (!this.currentStation) return false;
    const crate = this.currentStation.lootContainers.find((c) => c.id === crateId);
    if (!crate || crate.looted) return false;

    crate.looted = true;
    soundManager.playLootSound();

    // Add items to inventory
    const summaryItems: string[] = [];
    const notifItems: { name: string; quantity: number; icon?: string }[] = [];

    for (const itemEntry of crate.items) {
      const existing = this.inventory.find((i) => i.id === itemEntry.item.id);
      if (existing) {
        existing.quantity += itemEntry.quantity;
      } else {
        this.inventory.push({ ...itemEntry.item, quantity: itemEntry.quantity });
      }
      summaryItems.push(`+${itemEntry.quantity} ${itemEntry.item.name}`);
      notifItems.push({
        name: itemEntry.item.name,
        quantity: itemEntry.quantity,
        icon: itemEntry.item.icon,
      });
    }

    this.addNotification({
      title: crate.name,
      details: summaryItems.join(' · '),
      items: notifItems,
      type: 'loot',
    });

    return true;
  }

  public craftRecipe(recipeId: string): boolean {
    const recipe = this.availableRecipes.find((r) => r.id === recipeId);
    if (!recipe) return false;

    // Check inputs
    for (const req of recipe.inputs) {
      const has = this.inventory.find((i) => i.id === req.itemId);
      if (!has || has.quantity < req.quantity) return false;
    }

    // Deduct inputs
    for (const req of recipe.inputs) {
      const has = this.inventory.find((i) => i.id === req.itemId)!;
      has.quantity -= req.quantity;
    }

    // Clean zero quantities
    this.inventory = this.inventory.filter((i) => i.quantity > 0);

    // Add output
    const out = recipe.output;
    const existing = this.inventory.find((i) => i.id === out.id);
    if (existing) {
      existing.quantity += out.quantity;
    } else {
      this.inventory.push({ ...out });
    }

    // Special: if ammo crafted, refill turret
    if (out.id === 'ammo_762') {
      this.turret.currentAmmo = Math.min(this.turret.maxAmmo, this.turret.currentAmmo + out.quantity);
    }

    soundManager.playLootSound();

    this.addNotification({
      title: 'Chế Tạo Thành Công',
      details: `+${out.quantity} ${out.name}`,
      items: [{ name: out.name, quantity: out.quantity, icon: out.icon }],
      type: 'craft',
    });

    return true;
  }

  public applyUpgrade(upgradeId: string): boolean {
    const upgrade = this.availableUpgrades.find((u) => u.id === upgradeId);
    if (!upgrade) return false;

    // Check cost
    for (const cost of upgrade.cost) {
      const has = this.inventory.find((i) => i.id === cost.itemId);
      if (!has || has.quantity < cost.quantity) return false;
    }

    // Deduct cost
    for (const cost of upgrade.cost) {
      const has = this.inventory.find((i) => i.id === cost.itemId)!;
      has.quantity -= cost.quantity;
    }
    this.inventory = this.inventory.filter((i) => i.quantity > 0);

    // Apply upgrade effects
    if (upgrade.id === 'upg_steel_armor') {
      const def = this.carriages.find((c) => c.type === 'Defense');
      if (def) {
        def.armorRating += upgrade.armorDelta || 25;
        def.maxHealth += upgrade.healthDelta || 60;
        def.currentHealth += upgrade.healthDelta || 60;
        def.baseWeight += upgrade.weightDelta;
        def.installedUpgrades.push(upgrade.name);
      }
    } else if (upgrade.id === 'upg_gatling_mk2') {
      this.turret.damage += upgrade.damageDelta || 4;
      this.turret.fireRate = 12;
      this.turret.powerConsumption += upgrade.powerDelta;
      this.turret.name = 'Gatling Autocannon Mk2';
    } else if (upgrade.id === 'upg_generator_mk2') {
      const loco = this.carriages.find((c) => c.type === 'Locomotive');
      if (loco) {
        loco.powerProduction += 120; // up to 280W
        loco.baseWeight += upgrade.weightDelta;
        loco.installedUpgrades.push(upgrade.name);
      }
    }

    this.recalculateTrainStats();
    soundManager.playLootSound();
    return true;
  }

  public transferToStorage(itemId: string, qty: number) {
    const invItem = this.inventory.find((i) => i.id === itemId);
    if (!invItem || invItem.quantity < qty) return;

    invItem.quantity -= qty;
    const storeItem = this.storage.find((i) => i.id === itemId);
    if (storeItem) {
      storeItem.quantity += qty;
    } else {
      this.storage.push({ ...invItem, quantity: qty });
    }

    this.inventory = this.inventory.filter((i) => i.quantity > 0);
    this.recalculateTrainStats();
    soundManager.playClick();
  }

  public transferToInventory(itemId: string, qty: number) {
    const storeItem = this.storage.find((i) => i.id === itemId);
    if (!storeItem || storeItem.quantity < qty) return;

    storeItem.quantity -= qty;
    const invItem = this.inventory.find((i) => i.id === itemId);
    if (invItem) {
      invItem.quantity += qty;
    } else {
      this.inventory.push({ ...storeItem, quantity: qty });
    }

    this.storage = this.storage.filter((i) => i.quantity > 0);
    this.recalculateTrainStats();
    soundManager.playClick();
  }

  public consumeItem(itemId: string) {
    const item = this.inventory.find((i) => i.id === itemId);
    if (!item || item.quantity <= 0) return;

    if (item.type === 'Food') {
      this.playerStats.hunger = Math.min(100, this.playerStats.hunger + 30);
      item.quantity--;
      soundManager.playClick();
    } else if (item.type === 'Water') {
      this.playerStats.thirst = Math.min(100, this.playerStats.thirst + 40);
      item.quantity--;
      soundManager.playClick();
    } else if (item.id === 'fuel_can' || item.id === 'biofuel') {
      this.trainStats.currentFuel = Math.min(this.trainStats.maxFuel, this.trainStats.currentFuel + 25);
      item.quantity--;
      soundManager.playLootSound();
    } else if (item.id === 'repair_kit') {
      // Repair damaged carriage
      for (const c of this.carriages) {
        if (c.currentHealth < c.maxHealth) {
          c.currentHealth = Math.min(c.maxHealth, c.currentHealth + 60);
          break;
        }
      }
      item.quantity--;
      soundManager.playLootSound();
    }

    this.inventory = this.inventory.filter((i) => i.quantity > 0);
  }

  // Debug methods (F1-F8 per Section 58)
  public debugAddFuel() {
    this.trainStats.currentFuel = this.trainStats.maxFuel;
    soundManager.playLootSound();
  }

  public debugAddResources() {
    ['scrap', 'steel', 'water', 'chemical', 'electronics'].forEach((id) => {
      const it = this.inventory.find((i) => i.id === id);
      if (it) it.quantity += 50;
    });
    this.turret.currentAmmo = this.turret.maxAmmo;
    soundManager.playLootSound();
  }

  public debugSpawnEnemy() {
    const side = Math.random() > 0.5 ? 4.5 : -4.5;
    this.enemies.push({
      id: 'chaser_debug_' + Math.floor(Math.random() * 1000),
      type: 'Chaser',
      x: side,
      y: 0.2,
      z: -28,
      health: 40,
      maxHealth: 40,
      speed: 19,
      targetCarriageIndex: 2,
      isAttached: false,
      attackTimer: 0,
      damagePerHit: 10,
    });
    soundManager.playHitImpact();
  }

  public debugDamageTrain() {
    for (const c of this.carriages) {
      c.currentHealth = Math.max(10, c.currentHealth - 60);
    }
    soundManager.playHitImpact();
  }

  public debugRepairTrain() {
    for (const c of this.carriages) {
      c.currentHealth = c.maxHealth;
    }
    soundManager.playLootSound();
  }

  public debugToggleGodMode() {
    this.godMode = !this.godMode;
    if (this.godMode) {
      this.playerStats.health = 100;
      this.playerStats.hunger = 100;
      this.playerStats.thirst = 100;
      this.playerStats.oxygen = 100;
      this.playerStats.bodyTemperature = 37.0;
    }
  }

  public debugTriggerStation() {
    this.trainStats.nextStationDistance = 0.01;
    this.trainStats.currentSpeed = 10;
  }

  public debugTriggerHazard() {
    this.spawnTrackHazard();
  }
}
