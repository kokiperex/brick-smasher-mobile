(function exposeLevelManager(root) {
  "use strict";

  class LevelManager {
    constructor(levels, BrickType, worldWidth, blockTypes) {
      if (!Array.isArray(levels) || levels.length === 0) {
        throw new Error("LevelManager requiere al menos un nivel.");
      }
      this.levels = levels;
      this.BrickType = BrickType;
      this.worldWidth = worldWidth;
      this.blockTypes = blockTypes || root.BrickSmasherLevels?.BLOCK_TYPES || {
        0: { id: "empty", hitPoints: 0, breakable: false },
        1: { id: "normal", hitPoints: 1, breakable: true },
      };
      this.index = 0;
    }

    get current() {
      return this.levels[this.index];
    }

    get total() {
      return this.levels.length;
    }

    get isLast() {
      return this.index === this.levels.length - 1;
    }

    reset() {
      this.index = 0;
      return this.current;
    }

    next() {
      if (this.isLast) {
        return false;
      }
      this.index += 1;
      return true;
    }

    goTo(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) {
        return false;
      }
      this.index = index;
      return true;
    }

    createBricks() {
      const level = this.current;
      const columns = Math.max(...level.pattern.map((row) => row.length));
      const gap = 5;
      const sideMargin = 16;
      const brickWidth = (this.worldWidth - sideMargin * 2 - gap * (columns - 1)) / columns;
      const brickHeight = 22;
      const top = 62;
      const bricks = [];

      level.pattern.forEach((row, rowIndex) => {
        Array.from(row).forEach((cell, columnIndex) => {
          const definition = this.blockTypes[cell];
          if (!definition || cell === "0") {
            return;
          }
          bricks.push(
            new this.BrickType(
              sideMargin + columnIndex * (brickWidth + gap),
              top + rowIndex * (brickHeight + gap),
              brickWidth,
              brickHeight,
              level.colors[rowIndex % level.colors.length],
              {
                type: definition.id,
                breakable: definition.breakable,
                hitPoints: definition.hitPoints,
                row: rowIndex,
                column: columnIndex,
                movementPhase: rowIndex * 0.72,
              },
            ),
          );
        });
      });

      return bricks;
    }

    hasRemainingBricks(bricks) {
      return bricks.some((brick) => brick.alive && brick.breakable);
    }
  }

  root.LevelManager = LevelManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = LevelManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
