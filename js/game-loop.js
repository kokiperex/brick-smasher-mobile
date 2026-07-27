(function exposeGameLoop(root) {
  "use strict";

  class GameLoop {
    constructor({
      update,
      render,
      fixedStep = 1 / 120,
      maxFrameSeconds = 0.05,
      requestFrame = root.requestAnimationFrame.bind(root),
      cancelFrame = root.cancelAnimationFrame?.bind(root) || (() => {}),
    }) {
      this.update = update;
      this.render = render;
      this.fixedStep = fixedStep;
      this.maxFrameSeconds = maxFrameSeconds;
      this.requestFrame = requestFrame;
      this.cancelFrame = cancelFrame;
      this.accumulator = 0;
      this.lastTimestamp = 0;
      this.fps = 0;
      this.fpsWindowStarted = 0;
      this.framesInWindow = 0;
      this.running = false;
      this.frameRequestId = null;
      this.generation = 0;
    }

    start() {
      if (this.running) {
        return false;
      }
      this.running = true;
      this.generation += 1;
      this.fpsWindowStarted = 0;
      this.framesInWindow = 0;
      this.scheduleFrame();
      return true;
    }

    stop() {
      if (!this.running && this.frameRequestId === null) {
        return false;
      }
      this.running = false;
      this.generation += 1;
      if (this.frameRequestId !== null) {
        this.cancelFrame(this.frameRequestId);
        this.frameRequestId = null;
      }
      this.resetClock();
      return true;
    }

    resetClock() {
      this.accumulator = 0;
      this.lastTimestamp = 0;
    }

    scheduleFrame() {
      const generation = this.generation;
      this.frameRequestId = this.requestFrame((timestamp) => {
        this.frame(timestamp, generation);
      });
    }

    frame(timestamp, generation) {
      if (!this.running || generation !== this.generation) {
        return;
      }
      this.frameRequestId = null;
      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      const frameSeconds = Math.min(
        (timestamp - this.lastTimestamp) / 1000,
        this.maxFrameSeconds,
      );
      this.lastTimestamp = timestamp;
      this.accumulator += frameSeconds;

      while (
        this.running
        && generation === this.generation
        && this.accumulator >= this.fixedStep
      ) {
        this.update(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }

      if (!this.running || generation !== this.generation) {
        return;
      }
      this.render();
      if (!this.fpsWindowStarted) {
        this.fpsWindowStarted = timestamp;
      }
      this.framesInWindow += 1;
      const fpsWindowElapsed = timestamp - this.fpsWindowStarted;
      if (fpsWindowElapsed >= 500) {
        this.fps = this.framesInWindow * 1000 / fpsWindowElapsed;
        this.fpsWindowStarted = timestamp;
        this.framesInWindow = 0;
      }
      this.scheduleFrame();
    }
  }

  root.GameLoop = GameLoop;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = GameLoop;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
