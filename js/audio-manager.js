(function exposeAudioManager(root) {
  "use strict";

  const CUES = Object.freeze({
    ui: Object.freeze({ frequency: 520, duration: 0.05, type: "sine", volume: 0.035 }),
    launch: Object.freeze({ frequency: 620, duration: 0.07, type: "triangle", volume: 0.045 }),
    bounce: Object.freeze({ frequency: 300, duration: 0.035, type: "sine", volume: 0.025 }),
    brick: Object.freeze({ frequency: 440, duration: 0.055, type: "square", volume: 0.03 }),
    prize: Object.freeze({ frequency: 780, duration: 0.11, type: "triangle", volume: 0.045 }),
    penalty: Object.freeze({ frequency: 150, duration: 0.14, type: "sawtooth", volume: 0.04 }),
    fire: Object.freeze({ frequency: 920, duration: 0.045, type: "square", volume: 0.025 }),
    life: Object.freeze({ frequency: 110, duration: 0.28, type: "sawtooth", volume: 0.05 }),
    complete: Object.freeze({ frequency: 880, duration: 0.32, type: "triangle", volume: 0.05 }),
  });

  class AudioManager {
    constructor({
      enabled = false,
      contextFactory = null,
    } = {}) {
      this.enabled = Boolean(enabled);
      this.contextFactory = contextFactory;
      this.context = null;
      this.activeNodes = new Set();
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      return this.enabled;
    }

    unlock() {
      if (!this.enabled) {
        return null;
      }
      if (!this.context) {
        try {
          const AudioContextType = root.AudioContext || root.webkitAudioContext;
          this.context = this.contextFactory
            ? this.contextFactory()
            : (AudioContextType ? new AudioContextType() : null);
        } catch {
          this.context = null;
        }
      }
      if (this.context?.state === "suspended") {
        this.settleSafely(this.context.resume?.());
      }
      return this.context;
    }

    settleSafely(result) {
      if (result && typeof result.catch === "function") {
        result.catch(() => false);
      }
    }

    play(cueName) {
      const cue = CUES[cueName];
      const context = this.context;
      let cleanup = null;
      if (!this.enabled || !context || !cue) {
        return false;
      }

      try {
        const startedAt = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = cue.type;
        oscillator.frequency.setValueAtTime(cue.frequency, startedAt);
        gain.gain.setValueAtTime(cue.volume, startedAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + cue.duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const activeNode = {
          oscillator,
          gain,
          cleanup: null,
        };
        cleanup = () => {
          if (!this.activeNodes.delete(activeNode)) {
            return;
          }
          try {
            oscillator.disconnect?.();
          } catch {
            // El nodo ya puede estar desconectado por el navegador.
          }
          try {
            gain.disconnect?.();
          } catch {
            // El nodo ya puede estar desconectado por el navegador.
          }
        };
        activeNode.cleanup = cleanup;
        this.activeNodes.add(activeNode);
        oscillator.onended = cleanup;
        oscillator.start(startedAt);
        oscillator.stop(startedAt + cue.duration);
        return true;
      } catch {
        cleanup?.();
        return false;
      }
    }

    destroy() {
      for (const activeNode of [...this.activeNodes]) {
        activeNode.cleanup();
      }
      const context = this.context;
      this.context = null;
      try {
        this.settleSafely(context?.close?.());
      } catch {
        // Algunos navegadores rechazan el cierre de un contexto incompleto.
      }
    }
  }

  const api = AudioManager;
  api.CUES = CUES;
  root.AudioManager = AudioManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
