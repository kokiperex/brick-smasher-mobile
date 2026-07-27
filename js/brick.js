(function exposeBrick(root) {
  "use strict";

  class Brick {
    constructor(x, y, width, height, color, options = {}) {
      this.x = x;
      this.y = y;
      this.baseX = x;
      this.baseY = y;
      this.width = width;
      this.height = height;
      this.color = color;
      this.alive = true;
      this.type = options.type || "normal";
      this.breakable = options.breakable !== false;
      this.hitPoints = options.hitPoints ?? 1;
      this.maxHitPoints = this.hitPoints;
      this.row = options.row ?? 0;
      this.column = options.column ?? 0;
      this.movementTime = options.movementPhase ?? 0;
      this.movementAmplitude = this.type === "moving" ? 8 : 0;
      this.movementSpeed = this.type === "moving" ? 1.35 : 0;
      this.regenerationDelay = this.type === "regenerative" ? 4 : 0;
      this.regenerationTimer = 0;
      this.regenerationsRemaining = this.type === "regenerative" ? 2 : 0;
      this.phase = this.type === "boss" ? 1 : 0;
    }

    takeDamage(amount = 1) {
      if (!this.alive || !this.breakable || amount <= 0) {
        return { hit: false, destroyed: false, phaseChanged: false };
      }

      const previousPhase = this.phase;
      this.hitPoints = Math.max(0, this.hitPoints - amount);
      this.regenerationTimer = this.regenerationDelay;
      if (this.type === "boss") {
        const remainingRatio = this.hitPoints / this.maxHitPoints;
        this.phase = remainingRatio > 2 / 3 ? 1 : (remainingRatio > 1 / 3 ? 2 : 3);
      }
      if (this.hitPoints === 0) {
        this.alive = false;
      }

      return {
        hit: true,
        destroyed: !this.alive,
        phaseChanged: this.phase !== previousPhase,
      };
    }

    update(deltaSeconds, worldWidth = 360) {
      if (!this.alive) {
        return false;
      }

      let changed = false;
      if (this.type === "moving") {
        this.movementTime += deltaSeconds * this.movementSpeed;
        const nextX = Math.max(
          0,
          Math.min(
            worldWidth - this.width,
            this.baseX + Math.sin(this.movementTime) * this.movementAmplitude,
          ),
        );
        changed = Math.abs(nextX - this.x) > 0.0001;
        this.x = nextX;
      }

      if (
        this.type === "regenerative"
        && this.hitPoints > 0
        && this.hitPoints < this.maxHitPoints
        && this.regenerationsRemaining > 0
      ) {
        this.regenerationTimer -= deltaSeconds;
        if (this.regenerationTimer <= 0) {
          this.hitPoints += 1;
          this.regenerationsRemaining -= 1;
          this.regenerationTimer = this.regenerationDelay;
          changed = true;
        }
      }
      return changed;
    }
  }

  root.NeonBrick = Brick;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Brick;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
