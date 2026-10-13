/**
 * Storage & State Persistence Layer
 * Wraps localStorage with automatic in-memory fallback for private browsing mode,
 * quota exhaustion, or restricted environments.
 * Enforces schema validation for user preferences and cube scan drafts.
 */

export const STORAGE_KEYS = {
  LANG: 'cube_solver_lang',
  SPEED: 'cube_solver_speed',
  FLASH: 'cube_solver_flash',
  DRAFT: 'cube_solver_draft',
};

export const VALID_LANGUAGES = Object.freeze(['ms', 'en']);
export const DEFAULT_LANGUAGE = 'ms';
export const DEFAULT_SPEED = 600;
export const DEFAULT_FLASH = false;

export const CUBE_FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);
export const VALID_COLORS = Object.freeze(['white', 'red', 'green', 'yellow', 'orange', 'blue']);

/**
 * Validates whether a value is a valid CubeState schema.
 * Must be an object with U, R, F, D, L, B arrays of length 9 containing valid colors.
 *
 * @param {unknown} draft
 * @returns {boolean}
 */
export function isValidCubeDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return false;
  }

  for (const face of CUBE_FACES) {
    const stickers = draft[face];
    if (!Array.isArray(stickers) || stickers.length !== 9) {
      return false;
    }
    for (const color of stickers) {
      if (typeof color !== 'string' || !VALID_COLORS.includes(color.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * StorageManager wraps localStorage with fail-safe fallback to an in-memory Map
 * when running in private browsing mode, restricted iframes, or headless environments.
 */
export class StorageManager {
  /**
   * @param {Storage} [customStorage] Optional custom storage instance for testing
   */
  constructor(customStorage = null) {
    this.memoryStore = new Map();
    this.useMemoryFallback = false;
    this.storage = customStorage;

    if (!this.storage) {
      this.storage = this._detectStorage();
    }
  }

  /**
   * Detects if localStorage is genuinely accessible and writable.
   * @private
   * @returns {Storage | null}
   */
  _detectStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__storage_test_' + Math.random().toString(36).slice(2);
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        this.useMemoryFallback = false;
        return window.localStorage;
      }
    } catch (_err) {
      // SecurityError or QuotaExceededError in private browsing
    }
    this.useMemoryFallback = true;
    return null;
  }

  /**
   * Checks whether persistent localStorage is available (vs in-memory fallback).
   * @returns {boolean}
   */
  isPersistent() {
    return !this.useMemoryFallback && this.storage !== null;
  }

  /**
   * Safe getter with in-memory fallback
   * @param {string} key
   * @returns {string | null}
   */
  getItem(key) {
    if (this.useMemoryFallback || !this.storage) {
      return this.memoryStore.has(key) ? this.memoryStore.get(key) : null;
    }
    try {
      return this.storage.getItem(key);
    } catch (_err) {
      this.useMemoryFallback = true;
      return this.memoryStore.has(key) ? this.memoryStore.get(key) : null;
    }
  }

  /**
   * Safe setter with in-memory fallback
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  setItem(key, value) {
    const stringVal = String(value);
    // Always keep memoryStore in sync as hot backup
    this.memoryStore.set(key, stringVal);

    if (this.useMemoryFallback || !this.storage) {
      return true;
    }

    try {
      this.storage.setItem(key, stringVal);
      return true;
    } catch (_err) {
      // In private browsing mode or quota exceeded
      this.useMemoryFallback = true;
      return true;
    }
  }

  /**
   * Safe remover
   * @param {string} key
   */
  removeItem(key) {
    this.memoryStore.delete(key);
    if (!this.useMemoryFallback && this.storage) {
      try {
        this.storage.removeItem(key);
      } catch (_err) {
        this.useMemoryFallback = true;
      }
    }
  }

  /**
   * Clear all stored items
   */
  clear() {
    this.memoryStore.clear();
    if (!this.useMemoryFallback && this.storage) {
      try {
        this.storage.clear();
      } catch (_err) {
        this.useMemoryFallback = true;
      }
    }
  }

  // ==========================================
  // SCHEMA-ENFORCED ACCESSORS
  // ==========================================

  /**
   * Gets language preference ('ms' | 'en').
   * Enforces schema; defaults to 'ms'.
   * @returns {'ms' | 'en'}
   */
  getLanguage() {
    const raw = this.getItem(STORAGE_KEYS.LANG);
    if (raw && VALID_LANGUAGES.includes(raw.toLowerCase())) {
      return raw.toLowerCase();
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * Sets language preference.
   * Only accepts 'ms' or 'en'.
   * @param {string} lang
   * @returns {boolean} True if successfully validated and stored
   */
  setLanguage(lang) {
    if (typeof lang !== 'string') return false;
    const normalized = lang.toLowerCase();
    if (!VALID_LANGUAGES.includes(normalized)) {
      return false;
    }
    return this.setItem(STORAGE_KEYS.LANG, normalized);
  }

  /**
   * Gets solution playback speed in ms.
   * Clamped between 100ms and 5000ms. Defaults to 600ms.
   * @returns {number}
   */
  getSpeed() {
    const raw = this.getItem(STORAGE_KEYS.SPEED);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 5000) {
        return Math.round(parsed);
      }
    }
    return DEFAULT_SPEED;
  }

  /**
   * Sets solution playback speed in ms.
   * @param {number} speed
   * @returns {boolean}
   */
  setSpeed(speed) {
    const num = Number(speed);
    if (!Number.isFinite(num) || num < 100 || num > 5000) {
      return false;
    }
    return this.setItem(STORAGE_KEYS.SPEED, String(Math.round(num)));
  }

  /**
   * Gets torch/flash state preference. Defaults to false.
   * @returns {boolean}
   */
  getFlash() {
    const raw = this.getItem(STORAGE_KEYS.FLASH);
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return DEFAULT_FLASH;
  }

  /**
   * Sets torch/flash state preference.
   * @param {boolean} enabled
   * @returns {boolean}
   */
  setFlash(enabled) {
    return this.setItem(STORAGE_KEYS.FLASH, Boolean(enabled) ? 'true' : 'false');
  }

  getTorchState() {
    return this.getFlash();
  }

  setTorchState(enabled) {
    return this.setFlash(enabled);
  }

  /**
   * Gets saved cube scan draft.
   * Validates schema: if draft is corrupted or invalid, cleans storage and returns null.
   * @returns {Record<string, string[]> | null}
   */
  getDraft() {
    const raw = this.getItem(STORAGE_KEYS.DRAFT);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (isValidCubeDraft(parsed)) {
        return parsed;
      }
      // Corrupt draft schema detected — purge invalid data
      this.clearDraft();
      return null;
    } catch (_err) {
      this.clearDraft();
      return null;
    }
  }

  /**
   * Saves cube scan draft.
   * Validates schema before persisting.
   * @param {Record<string, string[]> | null} draft
   * @returns {boolean}
   */
  setDraft(draft) {
    if (draft === null) {
      this.clearDraft();
      return true;
    }

    if (!isValidCubeDraft(draft)) {
      return false;
    }

    return this.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
  }

  /**
   * Clears saved cube scan draft.
   */
  clearDraft() {
    this.removeItem(STORAGE_KEYS.DRAFT);
  }
}

// Default singleton instance for engine use
export const storage = new StorageManager();
