(function exposeEffectManager(root) {
  "use strict";

  class EffectManager {
    constructor() {
      this.effects = new Map();
    }

    activate(id, durationSeconds, {
      incompatible = [],
      exclusiveGroup = null,
      onStart,
      onRenew,
      onExpire,
    } = {}) {
      if (typeof id !== "string" || id.length === 0) {
        throw new TypeError("El efecto requiere un identificador.");
      }
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new RangeError("La duración del efecto debe ser positiva.");
      }

      for (const incompatibleId of incompatible) {
        this.cancel(incompatibleId);
      }

      const existing = this.effects.get(id);
      if (existing) {
        existing.remaining = durationSeconds;
        existing.exclusiveGroup = exclusiveGroup;
        existing.onExpire = typeof onExpire === "function" ? onExpire : existing.onExpire;
        if (typeof onRenew === "function") {
          onRenew(id);
        }
        return "renewed";
      }

      if (exclusiveGroup) {
        for (const [activeId, activeEffect] of this.effects) {
          if (activeEffect.exclusiveGroup === exclusiveGroup) {
            this.cancel(activeId);
          }
        }
      }

      this.effects.set(id, {
        remaining: durationSeconds,
        exclusiveGroup,
        onExpire: typeof onExpire === "function" ? onExpire : null,
      });
      if (typeof onStart === "function") {
        onStart(id);
      }
      return "started";
    }

    update(deltaSeconds) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
        throw new RangeError("El delta de efectos debe ser un número no negativo.");
      }

      for (const [id, effect] of this.effects) {
        effect.remaining -= deltaSeconds;
        if (effect.remaining <= 0) {
          this.effects.delete(id);
          effect.onExpire?.(id);
        }
      }
    }

    isActive(id) {
      return this.effects.has(id);
    }

    remaining(id) {
      return Math.max(0, this.effects.get(id)?.remaining ?? 0);
    }

    activeEffects() {
      return Array.from(this.effects, ([id, effect]) => ({
        id,
        remaining: Math.max(0, effect.remaining),
        exclusiveGroup: effect.exclusiveGroup,
      }));
    }

    cancel(id) {
      const effect = this.effects.get(id);
      if (!effect) {
        return false;
      }
      this.effects.delete(id);
      effect.onExpire?.(id);
      return true;
    }

    clear() {
      for (const id of Array.from(this.effects.keys())) {
        this.cancel(id);
      }
    }
  }

  root.EffectManager = EffectManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = EffectManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
