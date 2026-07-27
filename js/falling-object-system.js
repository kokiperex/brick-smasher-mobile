(function exposeFallingObjectSystem(root) {
  "use strict";

  class FallingObjectSystem {
    constructor({
      ItemType = root.FallingItem,
      catalog = root.EffectCatalog,
      random = Math.random,
    } = {}) {
      this.ItemType = ItemType;
      this.catalog = catalog;
      this.random = random;
      this.items = [];
    }

    spawn(effectId, x, y) {
      const item = new this.ItemType(effectId, x, y, this.catalog);
      this.items.push(item);
      return item;
    }

    spawnRandom(x, y, type = null) {
      const effectId = this.catalog.randomId(this.random, type);
      return effectId ? this.spawn(effectId, x, y) : null;
    }

    update(deltaSeconds, paddle, worldHeight, onCollect) {
      for (const item of this.items) {
        if (!item.alive) {
          continue;
        }
        item.update(deltaSeconds);
        if (item.intersects(paddle)) {
          item.alive = false;
          onCollect(item.effectId);
        } else if (item.y > worldHeight) {
          item.alive = false;
        }
      }
      this.items = this.items.filter((item) => item.alive);
    }

    splitBalls(balls, BallType, maxBalls = 5) {
      if (balls.length === 0 || balls.length >= maxBalls) {
        return balls;
      }

      const sources = balls.filter((ball) => !ball.attached);
      const usableSources = sources.length > 0 ? sources : [balls[0]];
      const initialCount = balls.length;

      for (const source of usableSources) {
        for (const angle of [-20, 20]) {
          if (balls.length >= maxBalls) {
            break;
          }
          balls.push(source.cloneWithAngle(BallType, angle));
        }
        if (balls.length >= maxBalls) {
          break;
        }
      }

      if (balls.length === initialCount && balls.length < maxBalls) {
        balls.push(balls[0].cloneWithAngle(BallType, 20));
      }
      return balls;
    }

    clear() {
      this.items = [];
    }
  }

  root.FallingObjectSystem = FallingObjectSystem;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FallingObjectSystem;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
