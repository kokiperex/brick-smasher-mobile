(function exposeStorageManager(root) {
  "use strict";

  const PROGRESS_VERSION = 1;

  const clampInteger = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
  };

  class StorageManager {
    constructor(storage) {
      if (arguments.length > 0) {
        this.storage = storage;
      } else {
        try {
          this.storage = root.localStorage || null;
        } catch {
          this.storage = null;
        }
      }
      this.prefix = "neon-breaker:";
    }

    read(key, fallback = null) {
      if (!this.storage) {
        return fallback;
      }
      try {
        const value = this.storage.getItem(`${this.prefix}${key}`);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    }

    write(key, value) {
      if (!this.storage) {
        return false;
      }
      try {
        this.storage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    remove(key) {
      if (!this.storage) {
        return false;
      }
      try {
        this.storage.removeItem(`${this.prefix}${key}`);
        return true;
      } catch {
        return false;
      }
    }

    normalizeProgress(value, totalLevels = 40) {
      const source = value && typeof value === "object" ? value : {};
      const maximumLevel = Math.max(1, Math.trunc(totalLevels) || 40);
      const maxUnlockedLevel = clampInteger(
        source.maxUnlockedLevel,
        1,
        maximumLevel,
        1,
      );
      let lastGame = null;
      if (source.lastGame && typeof source.lastGame === "object") {
        lastGame = {
          levelIndex: clampInteger(
            source.lastGame.levelIndex,
            0,
            maxUnlockedLevel - 1,
            0,
          ),
          score: clampInteger(source.lastGame.score, 0, 999999999, 0),
          lives: clampInteger(source.lastGame.lives, 1, 3, 3),
        };
      }
      return {
        version: PROGRESS_VERSION,
        maxUnlockedLevel,
        highScore: clampInteger(source.highScore, 0, 999999999, 0),
        lastGame,
      };
    }

    readProgress(totalLevels = 40) {
      return this.normalizeProgress(this.read("progress", null), totalLevels);
    }

    writeProgress(progress, totalLevels = 40) {
      const normalized = this.normalizeProgress(progress, totalLevels);
      return this.write("progress", normalized);
    }
  }

  root.StorageManager = StorageManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = StorageManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
