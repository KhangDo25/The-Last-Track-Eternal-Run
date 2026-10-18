export type GameState = 'MainMenu' | 'Loading' | 'Playing' | 'Paused' | 'Station' | 'GameOver';

export type TrainState = 'Moving' | 'Braking' | 'Stationary' | 'Departing' | 'EmergencyStop' | 'Disabled';

export type CarriageType = 'Locomotive' | 'Workshop' | 'Defense' | 'Storage' | 'Living' | 'Power';

export type BiomeType = 'Normal' | 'AbsoluteZero' | 'ScorchingWasteland' | 'Void';

export type ThrottleLevel = 0 | 25 | 50 | 75 | 100 | 120; // 120 = OVERDRIVE

export interface PlayerStats {
  health: number; // 0-100
  maxHealth: number;
  stamina: number; // 0-100
  hunger: number; // 0-100
  thirst: number; // 0-100
  bodyTemperature: number; // 37 C standard
  toxicity: number; // 0-100
  sanity: number; // 0-100
  oxygen: number; // 0-100%
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'Resource' | 'Food' | 'Water' | 'Ammo' | 'Weapon' | 'Medical' | 'Material' | 'Upgrade';
  weight: number; // in kg
  quantity: number;
  maxStack: number;
  description: string;
  icon: string;
}

export interface CarriageData {
  id: string;
  name: string;
  type: CarriageType;
  maxHealth: number;
  currentHealth: number;
  baseWeight: number; // tons
  powerConsumption: number; // Watts
  powerProduction: number; // Watts
  armorRating: number; // 0-100%
  installedUpgrades: string[];
  weaponSlots: number;
  armorSlots: number;
  utilitySlots: number;
  positionIndex: number;
}

export interface TrainStats {
  currentSpeed: number; // km/h
  targetSpeed: number;
  maxSpeed: number;
  throttle: ThrottleLevel;
  state: TrainState;
  currentFuel: number;
  fuel?: number; // Alias directly linked to currentFuel for HUD indicators
  maxFuel: number;
  fuelConsumptionRate: number; // L/min
  totalWeight: number; // tons
  powerGeneration: number; // Watts
  powerConsumption: number; // Watts
  circuitBreakerTripped: boolean;
  distanceTraveled: number; // km
  nextStationDistance: number; // km
}

export interface TurretState {
  id: string;
  name: string;
  type: 'Gatling' | 'Flame' | 'UV';
  level: number;
  damage: number;
  range: number;
  fireRate: number; // shots per sec
  powerConsumption: number;
  ammoType: string;
  currentAmmo: number;
  maxAmmo: number;
  heat: number; // 0-100
  isOverheated: boolean;
  targetCarriageId: string;
  isMounted: boolean; // Manual control by player
  yaw: number;
  pitch: number;
}

export interface EnemyEntity {
  id: string;
  type: 'Chaser' | 'HullBreaker' | 'Phantom';
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  speed: number;
  targetCarriageIndex: number;
  isAttached: boolean;
  attackTimer: number;
  damagePerHit: number;
}

export interface StationData {
  id: string;
  name: string;
  type: 'Ruin' | 'Military' | 'PowerStation' | 'EntityHive';
  totalDuration: number; // seconds
  remainingTime: number; // seconds
  hasWarned120: boolean;
  hasWarned30: boolean;
  lootContainers: {
    id: string;
    name: string;
    looted: boolean;
    items: { item: InventoryItem; quantity: number }[];
  }[];
}

export interface UpgradeOption {
  id: string;
  name: string;
  targetType: CarriageType | 'All';
  slotType: 'Weapon' | 'Armor' | 'Utility' | 'Power';
  description: string;
  cost: { itemId: string; name: string; quantity: number }[];
  weightDelta: number; // tons
  powerDelta: number; // Watts
  healthDelta?: number;
  armorDelta?: number;
  damageDelta?: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: 'Survival' | 'Ammunition' | 'Repair' | 'Components';
  inputs: { itemId: string; name: string; quantity: number }[];
  output: InventoryItem;
  craftTimeSeconds: number;
  requiredWorkshopLevel: number;
}

export interface HUDNotification {
  id: string;
  title: string;
  details?: string;
  items?: { name: string; quantity: number; icon?: string }[];
  type: 'loot' | 'station' | 'weather' | 'craft' | 'warning';
  timestamp: number;
}

export interface WeatherTimelineItem {
  weather: 'clear' | 'rain' | 'blizzard';
  startsInSeconds: number;
  durationSeconds: number;
}

export type TrackHazardType = 'RustedRails' | 'TrackDebris' | 'IcyFracture';

export interface TrackHazard {
  id: string;
  type: TrackHazardType;
  name: string;
  distanceMeters: number;
  totalDistanceMeters: number;
  maxSafeSpeed: number; // km/h
  severity: 'Caution' | 'Danger' | 'Critical';
  damageAmount: number;
}
