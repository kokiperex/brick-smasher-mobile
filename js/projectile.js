(function exposeProjectile(root) {
  "use strict";

  class Projectile {
    constructor(x, y) {
      this.width = 4;
      this.height = 14;
      this.x = x - this.width / 2;
      this.y = y - this.height;
      this.speed = 430;
      this.alive = true;
    }

    update(deltaSeconds) {
      this.y -= this.speed * deltaSeconds;
      if (this.y + this.height < 0) {
        this.alive = false;
      }
    }

    intersects(rect) {
      return (
        this.x < rect.x + rect.width
        && this.x + this.width > rect.x
        && this.y < rect.y + rect.height
        && this.y + this.height > rect.y
      );
    }
  }

  root.Projectile = Projectile;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Projectile;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
