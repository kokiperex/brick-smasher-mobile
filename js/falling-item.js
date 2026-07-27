(function exposeFallingItem(root) {
  "use strict";

  class FallingItem {
    constructor(effectId, x, y, catalog = root.EffectCatalog) {
      const definition = catalog.get(effectId);
      if (!definition) {
        throw new Error(`Objeto desconocido: ${effectId}`);
      }
      this.effectId = effectId;
      this.definition = definition;
      this.width = 30;
      this.height = 22;
      this.x = x - this.width / 2;
      this.y = y - this.height / 2;
      this.speed = 105;
      this.alive = true;
    }

    update(deltaSeconds) {
      this.y += this.speed * deltaSeconds;
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

  root.FallingItem = FallingItem;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FallingItem;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
