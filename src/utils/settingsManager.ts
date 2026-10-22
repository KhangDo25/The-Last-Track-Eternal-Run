import { Language } from '../i18n/translations';

export interface ControlSettings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  interact: string;
  sprint: string;
  horn: string;
  pause: string;
}

export interface GameSettings {
  masterVolume: number; // 0-100
  musicVolume: number; // 0-100
  sfxVolume: number; // 0-100
  pixelArtScaling: 'pixelated' | 'smooth';
  screenShake: boolean;
  crtFilter: boolean;
  fullscreen: boolean;
  language: Language;
  controls: ControlSettings;
}

const SETTINGS_STORAGE_KEY = 'last_track_settings_v1';

export const DEFAULT_CONTROLS: ControlSettings = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  interact: 'KeyE',
  sprint: 'ShiftLeft',
  horn: 'KeyH',
  pause: 'Escape',
};

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  musicVolume: 75,
  sfxVolume: 90,
  pixelArtScaling: 'pixelated',
  screenShake: true,
  crtFilter: false,
  fullscreen: false,
  language: 'vi',
  controls: DEFAULT_CONTROLS,
};

export class SettingsManager {
  private static cachedSettings: GameSettings | null = null;
  private static listeners: ((settings: GameSettings) => void)[] = [];

  public static getSettings(): GameSettings {
    if (this.cachedSettings) return this.cachedSettings;

    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const result: GameSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          controls: {
            ...DEFAULT_CONTROLS,
            ...(parsed.controls || {}),
          },
        };
        this.cachedSettings = result;
        return result;
      }
    } catch (err) {
      console.warn('[SettingsManager] Failed reading settings from localStorage', err);
    }

    const fallback: GameSettings = { ...DEFAULT_SETTINGS };
    this.cachedSettings = fallback;
    return fallback;
  }

  public static saveSettings(settings: Partial<GameSettings>): GameSettings {
    const current = this.getSettings();
    const updated: GameSettings = {
      ...current,
      ...settings,
      controls: {
        ...current.controls,
        ...(settings.controls || {}),
      },
    };

    this.cachedSettings = updated;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('[SettingsManager] Failed writing settings to localStorage', err);
      }
    }

    // Notify active listeners
    this.listeners.forEach((fn) => {
      try {
        fn(updated);
      } catch (e) {
        console.warn('[SettingsManager] Listener error', e);
      }
    });

    return updated;
  }

  public static subscribe(fn: (settings: GameSettings) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public static resetToDefaults(): GameSettings {
    return this.saveSettings(DEFAULT_SETTINGS);
  }
}
