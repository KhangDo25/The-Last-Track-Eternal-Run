import {
  ChapterId,
  FullSaveData,
  SaveSlotMetadata,
  SaveType,
} from '../types/game';
import { GameEngine } from './gameEngine';
import { CHAPTER_CONFIGS } from './storyData';

const DB_NAME = 'LastTrackDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'save_slots';

export const CAMPAIGN_SLOTS: { id: string; label: string; defaultName: string; isAuto?: boolean }[] = [
  { id: 'slot_auto', label: 'Auto-Save Checkpoint', defaultName: 'Safe Checkpoint Archive', isAuto: true },
  { id: 'slot_1', label: 'Campaign Slot 1', defaultName: 'Slot 1: The Iron Line' },
  { id: 'slot_2', label: 'Campaign Slot 2', defaultName: 'Slot 2: Frozen Frontier' },
  { id: 'slot_3', label: 'Campaign Slot 3', defaultName: 'Slot 3: Terminal Zero Hope' },
];

export class SaveManager {
  private static dbPromise: Promise<IDBDatabase | null> | null = null;

  /**
   * Initialize or open the IndexedDB instance with fallback to localStorage
   */
  public static async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            console.warn('[SaveManager] IndexedDB open error, falling back to localStorage', request.error);
            resolve(null);
          };
        } catch (err) {
          console.warn('[SaveManager] IndexedDB exception, falling back to localStorage', err);
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Format elapsed playtime into HH:MM:SS
   */
  public static formatPlaytime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Build complete save payload from current engine state
   */
  public static buildSavePayload(
    slotId: string,
    engine: GameEngine,
    saveType: SaveType = 'manual'
  ): FullSaveData {
    const chapterId: ChapterId = engine.currentChapter || 'Prologue';
    const chapterConfig = CHAPTER_CONFIGS[chapterId] || CHAPTER_CONFIGS['Prologue'];
    const currentLoc = chapterConfig.location;
    const chTitle = chapterConfig.title;

    // Summarize active mission
    let mTitle = 'The Last Departure';
    let mObj = 'Survive and reach safety';
    let mProg = 'In Progress';
    if (engine.prologue && engine.prologue.isActive) {
      mTitle = 'Prologue: Scavenge & Repair Shunter #04';
      mObj = `Fuel: ${engine.prologue.fuelCollected}/${engine.prologue.fuelTarget} · Scrap: ${engine.prologue.scrapCollected}/${engine.prologue.scrapTarget}`;
      mProg = `${Math.round(((engine.prologue.fuelCollected + engine.prologue.scrapCollected) / (engine.prologue.fuelTarget + engine.prologue.scrapTarget)) * 100)}%`;
    } else if (chapterConfig.missions && chapterConfig.missions.length > 0) {
      const activeMission = chapterConfig.missions.find((m) => !m.completed) || chapterConfig.missions[0];
      mTitle = activeMission.title;
      mObj = activeMission.objective;
      mProg = activeMission.targetCount > 0 ? `${activeMission.currentCount}/${activeMission.targetCount}` : 'Active';
    }

    // Tally resources
    const getQty = (id: string) => {
      const inv = engine.inventory.find((i) => i.id === id)?.quantity || 0;
      const st = engine.storage.find((i) => i.id === id)?.quantity || 0;
      return inv + st;
    };

    const slotInfo = CAMPAIGN_SLOTS.find((s) => s.id === slotId);

    const payload: FullSaveData = {
      version: 2,
      slotId,
      slotName: slotInfo ? slotInfo.label : `Save Slot ${slotId}`,
      savedAt: Date.now(),
      playtimeSeconds: Math.floor(engine.playtimeSeconds || 0),
      saveType,
      gameState: engine.gameState,
      chapter: chapterId,
      chapterTitle: chTitle,
      location: currentLoc,
      trainStats: { ...engine.trainStats },
      playerStats: { ...engine.playerStats },
      carriages: JSON.parse(JSON.stringify(engine.carriages)),
      inventory: JSON.parse(JSON.stringify(engine.inventory)),
      storage: JSON.parse(JSON.stringify(engine.storage)),
      turret: { ...engine.turret },
      currentWeather: engine.currentWeather,
      prologue: JSON.parse(JSON.stringify(engine.prologue)),
      completedObjectives: [...(engine.completedObjectives || [])],
      storyDecisions: { ...(engine.storyDecisions || {}) },
      resources: {
        scrap: getQty('scrap'),
        steel: getQty('steel'),
        water: getQty('water'),
        food: getQty('food'),
        ammo: getQty('ammo_762'),
        chemical: getQty('chemical'),
        electronics: getQty('electronics'),
      },
      companions: JSON.parse(JSON.stringify(engine.companions || [])),
      audioLogs: JSON.parse(JSON.stringify(engine.audioLogs || [])),
    };

    return payload;
  }

  /**
   * Save game state to IndexedDB with fallback to localStorage
   */
  public static async saveSlot(
    slotId: string,
    engine: GameEngine,
    saveType: SaveType = 'manual'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = this.buildSavePayload(slotId, engine, saveType);
      const jsonStr = JSON.stringify(payload);

      // 1. IndexedDB primary storage
      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(payload);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      // 2. LocalStorage mirror for resilience across dev reloads & backup
      try {
        localStorage.setItem(`last_track_slot_${slotId}`, jsonStr);
        // Also update legacy single slot key for backward compatibility
        if (slotId === 'slot_1' || slotId === 'slot_auto') {
          localStorage.setItem('last_track_save_v1', jsonStr);
        }
      } catch (lsErr) {
        console.warn('[SaveManager] localStorage mirror write warning', lsErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[SaveManager] Failed to save slot:', err);
      return { success: false, error: err?.message || 'Unknown save error' };
    }
  }

  /**
   * Load game state from a specific slot into the engine
   */
  public static async loadSlot(
    slotId: string,
    engine: GameEngine
  ): Promise<{ success: boolean; error?: string; data?: FullSaveData }> {
    try {
      let rawData: any = null;

      // 1. Try IndexedDB
      const db = await this.getDB();
      if (db) {
        rawData = await new Promise<any>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(slotId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      // 2. Fallback to localStorage if not found in IndexedDB
      if (!rawData) {
        const lsRaw = localStorage.getItem(`last_track_slot_${slotId}`);
        if (lsRaw) {
          try {
            rawData = JSON.parse(lsRaw);
          } catch (e: any) {
            // Save is corrupted in JSON parsing!
            return {
              success: false,
              error: `Corrupted save file detected in ${slotId}: ${e?.message}`,
              data: {
                version: 0,
                slotId,
                slotName: slotId,
                savedAt: Date.now(),
                playtimeSeconds: 0,
                saveType: 'manual',
                gameState: 'Playing',
                chapter: 'Prologue',
                chapterTitle: 'Corrupted Data',
                location: 'Unreadable Sector',
                trainStats: engine.trainStats,
                playerStats: engine.playerStats,
                carriages: [],
                inventory: [],
                storage: [],
                turret: engine.turret,
                currentWeather: 'blizzard',
                prologue: engine.prologue,
                completedObjectives: [],
                storyDecisions: {},
                resources: { scrap: 0, steel: 0, water: 0, food: 0, ammo: 0, chemical: 0, electronics: 0 },
                isCorrupted: true,
                corruptedReason: 'Malformed JSON payload',
                rawBackup: lsRaw,
              },
            };
          }
        }
      }

      if (!rawData) {
        return { success: false, error: `Save slot "${slotId}" is empty.` };
      }

      // 3. Validation: Verify essential structured state properties
      if (!rawData.trainStats || !Array.isArray(rawData.carriages) || !rawData.playerStats) {
        return {
          success: false,
          error: 'Save slot contains corrupted or missing state records. Data preserved without deletion.',
          data: {
            ...rawData,
            isCorrupted: true,
            corruptedReason: 'Missing trainStats, playerStats, or carriages array',
          },
        };
      }

      // 4. Restore state faithfully to GameEngine
      const data = rawData as FullSaveData;

      if (data.trainStats) {
        engine.trainStats = { ...engine.trainStats, ...data.trainStats };
        // Recalculate fuel property getter
        Object.defineProperty(engine.trainStats, 'fuel', {
          get: () => engine.trainStats.currentFuel,
          set: (val: number) => {
            engine.trainStats.currentFuel = val;
          },
          enumerable: true,
          configurable: true,
        });
      }

      if (data.playerStats) engine.playerStats = { ...engine.playerStats, ...data.playerStats };
      if (data.carriages && data.carriages.length > 0) engine.carriages = data.carriages;
      if (data.inventory) engine.inventory = data.inventory;
      if (data.storage) engine.storage = data.storage;
      if (data.turret) engine.turret = { ...engine.turret, ...data.turret };
      if (data.currentWeather) engine.currentWeather = data.currentWeather;
      if (data.prologue) engine.prologue = data.prologue;
      if (data.completedObjectives) engine.completedObjectives = data.completedObjectives;
      if (data.storyDecisions) engine.storyDecisions = data.storyDecisions;
      if (data.playtimeSeconds !== undefined) engine.playtimeSeconds = data.playtimeSeconds;
      if (data.chapter) engine.currentChapter = data.chapter;
      if (data.companions && data.companions.length > 0) engine.companions = data.companions;
      if (data.audioLogs && data.audioLogs.length > 0) engine.audioLogs = data.audioLogs;

      engine.gameState = 'Playing';
      engine.recalculateTrainStats();

      return { success: true, data };
    } catch (err: any) {
      console.error('[SaveManager] Exception loading slot:', err);
      return { success: false, error: err?.message || 'Failed to load save' };
    }
  }

  /**
   * Get metadata summary of all 4 slots (Slot 1, 2, 3 and Auto-Save)
   */
  public static async getAllSlotsMetadata(): Promise<(SaveSlotMetadata | null)[]> {
    const results: (SaveSlotMetadata | null)[] = [];

    for (const slotDef of CAMPAIGN_SLOTS) {
      const meta = await this.getSlotMetadata(slotDef.id);
      results.push(meta);
    }

    return results;
  }

  /**
   * Get metadata for a single slot without loading full payload into memory
   */
  public static async getSlotMetadata(slotId: string): Promise<SaveSlotMetadata | null> {
    try {
      let rawData: any = null;

      // 1. IndexedDB
      const db = await this.getDB();
      if (db) {
        rawData = await new Promise<any>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(slotId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      // 2. LocalStorage fallback
      if (!rawData) {
        const lsRaw = localStorage.getItem(`last_track_slot_${slotId}`);
        if (lsRaw) {
          try {
            rawData = JSON.parse(lsRaw);
          } catch {
            return {
              slotId,
              slotName: slotId,
              version: 0,
              savedAt: Date.now(),
              playtimeSeconds: 0,
              chapter: 'Prologue',
              chapterTitle: 'Corrupted File',
              location: 'Corrupted Record',
              missionTitle: 'Unreadable Data',
              missionObjective: 'Corrupted JSON on disk',
              missionProgress: 'Error',
              distanceKm: 0,
              carriagesCount: 0,
              fuel: 0,
              trainHealth: 0,
              maxTrainHealth: 100,
              saveType: 'manual',
              isCorrupted: true,
              corruptedReason: 'Malformed JSON payload on disk',
            };
          }
        }
      }

      // Legacy single save fallback for slot_1 if empty
      if (!rawData && slotId === 'slot_1') {
        const legacy = localStorage.getItem('last_track_save_v1');
        if (legacy) {
          try {
            rawData = JSON.parse(legacy);
            rawData.slotId = 'slot_1';
          } catch {
            // ignore
          }
        }
      }

      if (!rawData) return null;

      // Check corrupted state
      if (!rawData.trainStats || !Array.isArray(rawData.carriages)) {
        return {
          slotId,
          slotName: rawData.slotName || slotId,
          version: rawData.version || 1,
          savedAt: rawData.savedAt || Date.now(),
          playtimeSeconds: rawData.playtimeSeconds || 0,
          chapter: rawData.chapter || 'Prologue',
          chapterTitle: rawData.chapterTitle || 'Damaged Archive',
          location: rawData.location || 'Unknown',
          missionTitle: 'Corrupted Data Preserved',
          missionObjective: 'Missing critical structures',
          missionProgress: '0%',
          distanceKm: rawData.trainStats?.distanceTraveled || 0,
          carriagesCount: 0,
          fuel: 0,
          trainHealth: 0,
          maxTrainHealth: 100,
          saveType: rawData.saveType || 'manual',
          isCorrupted: true,
          corruptedReason: 'Incomplete or damaged save structure',
        };
      }

      // Calculate health
      const totalHp = rawData.carriages.reduce((acc: number, c: any) => acc + (c.currentHealth || 0), 0);
      const maxHp = rawData.carriages.reduce((acc: number, c: any) => acc + (c.maxHealth || 100), 0);

      const chId: ChapterId = rawData.chapter || 'Prologue';
      const chConf = CHAPTER_CONFIGS[chId] || CHAPTER_CONFIGS['Prologue'];

      let mTitle = 'The Last Departure';
      let mObj = 'Survival Run';
      let mProg = 'Active';
      if (rawData.prologue && rawData.prologue.isActive) {
        mTitle = 'Prologue: Shunter Repair & Evacuation';
        mObj = `Fuel ${rawData.prologue.fuelCollected || 0}/${rawData.prologue.fuelTarget || 1} · Scrap ${rawData.prologue.scrapCollected || 0}/${rawData.prologue.scrapTarget || 15}`;
        mProg = `${Math.round((((rawData.prologue.fuelCollected || 0) + (rawData.prologue.scrapCollected || 0)) / ((rawData.prologue.fuelTarget || 1) + (rawData.prologue.scrapTarget || 15))) * 100)}%`;
      }

      return {
        slotId,
        slotName: rawData.slotName || (CAMPAIGN_SLOTS.find((s) => s.id === slotId)?.label ?? `Slot ${slotId}`),
        version: rawData.version || 2,
        savedAt: rawData.savedAt || Date.now(),
        playtimeSeconds: rawData.playtimeSeconds || 0,
        chapter: chId,
        chapterTitle: rawData.chapterTitle || chConf.title,
        location: rawData.location || chConf.location,
        missionTitle: mTitle,
        missionObjective: mObj,
        missionProgress: mProg,
        distanceKm: rawData.trainStats?.distanceTraveled || 0,
        carriagesCount: rawData.carriages?.length || 2,
        fuel: Math.round(rawData.trainStats?.currentFuel || 0),
        trainHealth: totalHp,
        maxTrainHealth: maxHp,
        saveType: rawData.saveType || 'manual',
        isCorrupted: false,
      };
    } catch (e: any) {
      console.warn('[SaveManager] Exception reading slot metadata:', e);
      return null;
    }
  }

  /**
   * Find the latest valid save across all slots for Continue Game
   */
  public static async getLatestValidSave(): Promise<SaveSlotMetadata | null> {
    const slots = await this.getAllSlotsMetadata();
    const validSaves = slots.filter((s): s is SaveSlotMetadata => s !== null && !s.isCorrupted);

    if (validSaves.length === 0) return null;

    validSaves.sort((a, b) => b.savedAt - a.savedAt);
    return validSaves[0];
  }

  /**
   * Delete a save slot with protection
   */
  public static async deleteSlot(slotId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(slotId);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      localStorage.removeItem(`last_track_slot_${slotId}`);
      if (slotId === 'slot_1') {
        localStorage.removeItem('last_track_save_v1');
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export save slot data as formatted JSON string
   */
  public static async exportSlotJSON(slotId: string): Promise<string | null> {
    const db = await this.getDB();
    let data: any = null;
    if (db) {
      data = await new Promise<any>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(slotId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    }

    if (!data) {
      const ls = localStorage.getItem(`last_track_slot_${slotId}`);
      if (ls) data = JSON.parse(ls);
    }

    return data ? JSON.stringify(data, null, 2) : null;
  }
}
