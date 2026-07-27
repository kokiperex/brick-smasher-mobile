(function exposePaddle(root) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class Paddle {
    constructor(worldWidth, worldHeight) {
      this.width = 86;
      this.baseWidth = 86;
      this.height = 14;
      this.x = (worldWidth - this.width) / 2;
      this.y = worldHeight - 48;
      this.targetX = this.x;
      this.worldWidth = worldWidth;
      this.slippery = false;
      this.velocity = 0;
    }

    setCenter(centerX) {
      this.targetX = clamp(centerX - this.width / 2, 0, this.worldWidth - this.width);
    }

    moveBy(deltaX) {
      this.targetX = clamp(this.targetX + deltaX, 0, this.worldWidth - this.width);
    }

    update(deltaSeconds) {
      if (this.slippery) {
        const acceleration = (this.targetX - this.x) * 55;
        this.velocity += acceleration * deltaSeconds;
        this.velocity *= Math.exp(-3 * deltaSeconds);
        this.x += this.velocity * deltaSeconds;
      } else {
        const responsiveness = 1 - Math.exp(-22 * deltaSeconds);
        this.x += (this.targetX - this.x) * responsiveness;
        this.velocity = 0;
      }
      this.x = clamp(this.x, 0, this.worldWidth - this.width);
      if (this.x === 0 || this.x === this.worldWidth - this.width) {
        this.velocity = 0;
      }
    }

    reset() {
      this.x = (this.worldWidth - this.width) / 2;
      this.targetX = this.x;
      this.velocity = 0;
    }

    setWidth(width) {
      const center = this.x + this.width / 2;
      const targetCenter = this.targetX + this.width / 2;
      this.width = width;
      this.x = clamp(center - width / 2, 0, this.worldWidth - width);
      this.targetX = clamp(targetCenter - width / 2, 0, this.worldWidth - width);
    }

    setSlippery(enabled) {
      this.slippery = Boolean(enabled);
      if (!this.slippery) {
        this.velocity = 0;
      }
    }

    restoreDefaults() {
      this.setWidth(this.baseWidth);
      this.setSlippery(false);
    }
  }

  root.NeonPaddle = Paddle;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Paddle;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
