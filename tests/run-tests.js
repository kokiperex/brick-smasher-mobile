"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const AudioManager = require("../js/audio-manager.js");
const Ball = require("../js/ball.js");
const Brick = require("../js/brick.js");
const CollisionSystem = require("../js/collision-system.js");
const EffectCatalog = require("../js/effect-catalog.js");
const EffectManager = require("../js/effect-manager.js");
const FallingItem = require("../js/falling-item.js");
const FallingObjectSystem = require("../js/falling-object-system.js");
const NeonBreakerGame = require("../js/game.js");
const GameLoop = require("../js/game-loop.js");
const InputManager = require("../js/input-manager.js");
const LevelManager = require("../js/level-manager.js");
const Paddle = require("../js/paddle.js");
const Projectile = require("../js/projectile.js");
const StorageManager = require("../js/storage-manager.js");
const VibrationManager = require("../js/vibration-manager.js");
const {
  BLOCK_TYPES,
  LEVELS,
  calculateDifficulty,
  countBlocks,
  patternFingerprint,
} = require("../js/levels.js");

const tests = [];
const projectRoot = path.resolve(__dirname, "..");

function test(name, callback) {
  tests.push({ name, callback });
}

test("LevelManager carga exactamente los 40 niveles definitivos", () => {
  const manager = new LevelManager(LEVELS, Brick, 360);
  assert.equal(manager.total, 40);
  assert.equal(manager.current.name, LEVELS[0].name);
  assert.equal(manager.index, 0);
});

test("LevelManager crea todos los bloques definidos y conserva sus metadatos", () => {
  const manager = new LevelManager(LEVELS, Brick, 360, BLOCK_TYPES);

  for (let index = 0; index < LEVELS.length; index += 1) {
    const bricks = manager.createBricks();
    assert.equal(bricks.length, manager.current.stats.occupiedBlocks);
    assert.ok(bricks.every((brick) => brick instanceof Brick && brick.alive));
    assert.equal(
      bricks.filter((brick) => brick.breakable).length,
      countBlocks(manager.current),
    );
    assert.ok(
      bricks
        .filter((brick) => !brick.breakable)
        .every((brick) => brick.hitPoints === 0),
    );
    if (index < LEVELS.length - 1) {
      assert.equal(manager.next(), true);
    }
  }

  assert.equal(manager.isLast, true);
  assert.equal(manager.next(), false);
});

test("todos los niveles tienen bloques rompibles y geometrías sin duplicados", () => {
  const patterns = new Set(LEVELS.map(patternFingerprint));
  assert.equal(patterns.size, LEVELS.length);
  for (const level of LEVELS) {
    assert.ok(countBlocks(level) > 0, `${level.name} debe contener bloques rompibles`);
    assert.match(level.pattern.join(""), /^[0123XEMGSB]+$/);
  }
});

test("las velocidades son progresivas y todos los parámetros son válidos", () => {
  for (let index = 0; index < LEVELS.length; index += 1) {
    const level = LEVELS[index];
    assert.ok(Number.isFinite(level.ballSpeed));
    assert.ok(level.ballSpeed >= 180 && level.ballSpeed <= 520);
    assert.ok(level.paddleWidth >= 60 && level.paddleWidth <= 120);
    assert.ok(level.prizeChance >= 0 && level.prizeChance <= 1);
    assert.ok(level.penaltyChance >= 0 && level.penaltyChance <= 1);
    if (index > 0) {
      assert.ok(level.ballSpeed > LEVELS[index - 1].ballSpeed);
    }
  }
});

test("difficultyScore coincide con la fórmula y se muestra por nivel", () => {
  console.log("\nDifficulty score por nivel:");
  for (const level of LEVELS) {
    assert.equal(level.difficultyScore, calculateDifficulty(level));
    assert.ok(Number.isFinite(level.difficultyScore));
    console.log(
      `  Nivel ${String(level.id).padStart(2, "0")}: ${level.difficultyScore.toFixed(1)}`,
    );
  }
});

test("la curva no retrocede claramente frente a cinco niveles antes", () => {
  const maximumAllowedRegression = 5;
  for (let index = 5; index < LEVELS.length; index += 1) {
    assert.ok(
      LEVELS[index].difficultyScore
        >= LEVELS[index - 5].difficultyScore - maximumAllowedRegression,
      `Nivel ${index + 1} (${LEVELS[index].difficultyScore}) es demasiado fácil frente `
        + `al nivel ${index - 4} (${LEVELS[index - 5].difficultyScore})`,
    );
  }
});

test("el nivel 40 tiene el difficultyScore más alto", () => {
  const last = LEVELS.at(-1);
  const previousMaximum = Math.max(...LEVELS.slice(0, -1).map((level) => level.difficultyScore));
  assert.equal(last.id, 40);
  assert.ok(last.difficultyScore > previousMaximum);
});

test("CollisionSystem detecta contacto círculo-rectángulo y ausencia de contacto", () => {
  const collisions = new CollisionSystem();
  const rect = { x: 100, y: 100, width: 50, height: 20 };
  const collision = collisions.circleRect({ x: 96, y: 110, radius: 6 }, rect);
  assert.ok(collision);
  assert.equal(collision.normalX, -1);
  assert.equal(collision.normalY, 0);
  assert.equal(collisions.circleRect({ x: 30, y: 30, radius: 5 }, rect), null);
});

test("CollisionSystem resuelve paredes sin dejar la bola fuera del mundo", () => {
  const collisions = new CollisionSystem();
  const ball = { x: -2, y: 2, radius: 7, vx: -100, vy: -200 };
  assert.equal(collisions.resolveWalls(ball, 360), true);
  assert.equal(ball.x, 7);
  assert.equal(ball.y, 7);
  assert.equal(ball.vx, 100);
  assert.equal(ball.vy, 200);
});

test("CollisionSystem refleja el bloque sobre el eje de contacto", () => {
  const collisions = new CollisionSystem();
  const ball = { x: 96, y: 110, radius: 6, vx: 120, vy: -40 };
  const brick = new Brick(100, 100, 50, 20, "#fff");
  assert.equal(collisions.resolveBrick(ball, brick), true);
  assert.equal(ball.vx, -120);
  assert.equal(ball.vy, -40);
  assert.ok(Number.isFinite(ball.vx) && Number.isFinite(ball.vy));
});

test("CollisionSystem no vuelve a reflejar una bola que se aleja", () => {
  const collisions = new CollisionSystem();
  const ball = { x: 96, y: 110, radius: 6, vx: -120, vy: 0 };
  const brick = new Brick(100, 100, 50, 20, "#fff");
  assert.equal(collisions.resolveBrick(ball, brick), false);
  assert.equal(ball.vx, -120);
  assert.equal(ball.vy, 0);
});

test("CollisionSystem impide trayectorias horizontales tras un impacto de esquina", () => {
  const collisions = new CollisionSystem();
  const ball = { x: 96, y: 96, radius: 6, vx: 0, vy: 260 };
  const brick = new Brick(100, 100, 50, 20, "#fff");
  assert.equal(collisions.resolveBrick(ball, brick), true);
  const speed = Math.hypot(ball.vx, ball.vy);
  assert.ok(Math.abs(ball.vy) >= speed * 0.18 - 0.000001);
});

test("CollisionSystem solo rebota en la cara superior de la plataforma", () => {
  const collisions = new CollisionSystem();
  const paddle = new Paddle(360, 600);
  const underneath = {
    x: paddle.x + paddle.width / 2,
    y: paddle.y + 8,
    radius: 7,
    vx: 0,
    vy: 220,
    speed: 260,
  };
  assert.equal(collisions.resolvePaddle(underneath, paddle), false);
  assert.equal(underneath.vy, 220);
});

test("CollisionSystem calcula el rebote según el punto de impacto", () => {
  const collisions = new CollisionSystem();
  const left = collisions.paddleBounce(260, -1);
  const center = collisions.paddleBounce(260, 0);
  const right = collisions.paddleBounce(260, 1);
  assert.ok(left.vx < 0);
  assert.ok(right.vx > 0);
  assert.ok(Math.abs(center.vx) < 0.000001);
  assert.ok(left.vy < 0 && center.vy < 0 && right.vy < 0);
});

test("la bola se lanza con velocidad válida hacia arriba", () => {
  const ball = new Ball();
  const launched = ball.launch();
  assert.equal(launched, true);
  assert.equal(ball.attached, false);
  assert.ok(Number.isFinite(ball.vx));
  assert.ok(Number.isFinite(ball.vy));
  assert.ok(ball.vy < 0);
  assert.ok(Math.abs(Math.hypot(ball.vx, ball.vy) - ball.speed) < 0.000001);
});

test("los bloques resistentes reciben daño real y el jefe cambia de fase", () => {
  const reinforced = new Brick(0, 0, 30, 20, "#fff", {
    type: "reinforced",
    hitPoints: 2,
  });
  assert.deepEqual(reinforced.takeDamage(), {
    hit: true,
    destroyed: false,
    phaseChanged: false,
  });
  assert.equal(reinforced.hitPoints, 1);
  assert.equal(reinforced.alive, true);
  assert.equal(reinforced.takeDamage().destroyed, true);
  assert.equal(reinforced.alive, false);

  const boss = new Brick(0, 0, 30, 20, "#fff", {
    type: "boss",
    hitPoints: 12,
  });
  for (let index = 0; index < 5; index += 1) {
    boss.takeDamage();
  }
  assert.equal(boss.alive, true);
  assert.equal(boss.hitPoints, 7);
  assert.equal(boss.phase, 2);
});

test("los bloques móviles se desplazan y los regenerativos tienen límite", () => {
  const moving = new Brick(40, 40, 30, 20, "#fff", {
    type: "moving",
    movementPhase: 0,
  });
  moving.update(1, 360);
  assert.notEqual(moving.x, moving.baseX);

  const regenerative = new Brick(0, 0, 30, 20, "#fff", {
    type: "regenerative",
    hitPoints: 2,
  });
  regenerative.takeDamage();
  regenerative.update(4.1);
  assert.equal(regenerative.hitPoints, 2);
  assert.equal(regenerative.regenerationsRemaining, 1);
  regenerative.takeDamage();
  regenerative.update(4.1);
  regenerative.takeDamage();
  regenerative.update(4.1);
  assert.equal(regenerative.hitPoints, 1);
  assert.equal(regenerative.regenerationsRemaining, 0);
});

test("los explosivos dañan vecinos y los sorpresa fuerzan una caída", () => {
  const explosive = new Brick(0, 0, 30, 20, "#fff", {
    type: "explosive",
    row: 0,
    column: 0,
  });
  const neighbor = new Brick(35, 0, 30, 20, "#fff", {
    type: "normal",
    row: 0,
    column: 1,
  });
  const surprise = new Brick(70, 0, 30, 20, "#fff", {
    type: "surprise",
    row: 0,
    column: 2,
  });
  const drops = [];
  const fakeGame = {
    bricks: [explosive, neighbor, surprise],
    score: 0,
    audioManager: { play: () => {} },
    vibrationManager: { pulse: () => {} },
    levelManager: {
      current: { prizeChance: 0, penaltyChance: 0 },
      hasRemainingBricks: () => true,
      total: 40,
      index: 0,
    },
    fallingObjectSystem: {
      spawnRandom: (x, y, type) => drops.push({ x, y, type }),
    },
    random: () => 0.25,
    updateHud: () => {},
    saveProgress: () => {},
    completeLevel: () => {},
  };
  fakeGame.destroyBrick = NeonBreakerGame.prototype.destroyBrick;
  NeonBreakerGame.prototype.destroyBrick.call(fakeGame, explosive);
  assert.equal(explosive.alive, false);
  assert.equal(neighbor.alive, false);
  assert.equal(fakeGame.score, 200);
  NeonBreakerGame.prototype.destroyBrick.call(fakeGame, surprise);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].type, "prize");
});

test("LevelManager detecta el fin cuando no quedan bloques vivos", () => {
  const manager = new LevelManager(LEVELS, Brick, 360);
  const bricks = manager.createBricks();
  bricks.forEach((brick) => {
    brick.alive = false;
  });
  assert.equal(manager.hasRemainingBricks(bricks), false);
});

test("EffectManager mantiene y expira un efecto en el tiempo indicado", () => {
  const effects = new EffectManager();
  let expirations = 0;
  effects.activate("prueba", 1, {
    onExpire: () => {
      expirations += 1;
    },
  });

  effects.update(0.4);
  assert.equal(effects.isActive("prueba"), true);
  assert.ok(Math.abs(effects.remaining("prueba") - 0.6) < 0.000001);
  assert.equal(expirations, 0);

  effects.update(0.61);
  assert.equal(effects.isActive("prueba"), false);
  assert.equal(effects.remaining("prueba"), 0);
  assert.equal(expirations, 1);
});

test("EffectManager rechaza duraciones inválidas", () => {
  const effects = new EffectManager();
  assert.throws(() => effects.activate("inválido", 0), RangeError);
  assert.throws(() => effects.update(-0.1), RangeError);
});

test("el catálogo contiene exactamente los cinco premios y cinco castigos solicitados", () => {
  const expectedIds = [
    "sticky",
    "wide",
    "multiball",
    "shooting",
    "slow",
    "small",
    "fast",
    "inverted",
    "darkness",
    "slippery",
  ];
  assert.deepEqual(EffectCatalog.EFFECTS.map((effect) => effect.id), expectedIds);
  assert.equal(EffectCatalog.EFFECTS.filter((effect) => effect.type === "prize").length, 5);
  assert.equal(EffectCatalog.EFFECTS.filter((effect) => effect.type === "penalty").length, 5);
});

test("el catálogo selecciona premios y castigos por separado", () => {
  const prize = EffectCatalog.get(EffectCatalog.randomId(() => 0, "prize"));
  const penalty = EffectCatalog.get(EffectCatalog.randomId(() => 0, "penalty"));
  assert.equal(prize.type, "prize");
  assert.equal(penalty.type, "penalty");
});

test("todos los efectos del catálogo pueden generarse como objetos individuales", () => {
  const objects = new FallingObjectSystem({
    ItemType: FallingItem,
    catalog: EffectCatalog,
  });
  for (const [index, definition] of EffectCatalog.EFFECTS.entries()) {
    const item = objects.spawn(definition.id, 20 + index * 5, 40);
    assert.equal(item.effectId, definition.id);
    assert.equal(item.definition, definition);
  }
  assert.equal(objects.items.length, EffectCatalog.EFFECTS.length);
});

test("la renovación reinicia la duración sin duplicar el inicio", () => {
  const effects = new EffectManager();
  let starts = 0;
  let renewals = 0;
  const handlers = {
    onStart: () => {
      starts += 1;
    },
    onRenew: () => {
      renewals += 1;
    },
  };

  assert.equal(effects.activate("sticky", 12, handlers), "started");
  effects.update(7);
  assert.equal(effects.activate("sticky", 12, handlers), "renewed");
  assert.equal(starts, 1);
  assert.equal(renewals, 1);
  assert.equal(effects.remaining("sticky"), 12);
  assert.equal(effects.activeEffects().length, 1);
});

test("plataforma grande y pequeña se cancelan mutuamente", () => {
  const effects = new EffectManager();
  let wideExpired = 0;
  effects.activate("wide", 12, {
    onExpire: () => {
      wideExpired += 1;
    },
  });
  effects.activate("small", 10, { incompatible: ["wide"] });
  assert.equal(effects.isActive("wide"), false);
  assert.equal(effects.isActive("small"), true);
  assert.equal(wideExpired, 1);
});

test("bola lenta y aceleración se cancelan mutuamente", () => {
  const effects = new EffectManager();
  effects.activate("slow", 10);
  effects.activate("fast", 8, { incompatible: ["slow"] });
  assert.equal(effects.isActive("slow"), false);
  assert.equal(effects.isActive("fast"), true);
  effects.activate("slow", 10, { incompatible: ["fast"] });
  assert.equal(effects.isActive("fast"), false);
  assert.equal(effects.isActive("slow"), true);
});

test("los castigos se sustituyen y nunca se acumulan en una combinación imposible", () => {
  const effects = new EffectManager();
  for (const id of ["small", "fast", "inverted", "darkness", "slippery"]) {
    const definition = EffectCatalog.get(id);
    effects.activate(id, definition.duration, {
      incompatible: definition.incompatible,
      exclusiveGroup: definition.exclusiveGroup,
    });
    const activePenalties = effects.activeEffects().filter(
      (effect) => EffectCatalog.get(effect.id)?.type === "penalty",
    );
    assert.equal(activePenalties.length, 1);
    assert.equal(activePenalties[0].id, id);
  }
});

test("la limpieza expira todos los efectos una sola vez", () => {
  const effects = new EffectManager();
  const expired = [];
  for (const id of ["sticky", "wide", "shooting", "darkness"]) {
    effects.activate(id, 10, {
      onExpire: (expiredId) => expired.push(expiredId),
    });
  }
  effects.clear();
  assert.equal(effects.activeEffects().length, 0);
  assert.deepEqual(expired.sort(), ["darkness", "shooting", "sticky", "wide"]);
});

test("los objetos se recogen con la plataforma y se eliminan fuera de pantalla", () => {
  const paddle = new Paddle(360, 600);
  const collected = [];
  const objects = new FallingObjectSystem({
    ItemType: FallingItem,
    catalog: EffectCatalog,
  });
  objects.spawn("sticky", paddle.x + paddle.width / 2, paddle.y + 5);
  objects.update(0, paddle, 600, (id) => collected.push(id));
  assert.deepEqual(collected, ["sticky"]);
  assert.equal(objects.items.length, 0);

  objects.spawn("small", 20, 610);
  objects.update(1, paddle, 600, () => {});
  assert.equal(objects.items.length, 0);
});

test("multibola divide una bola en tres y respeta el máximo de cinco", () => {
  const source = new Ball();
  source.attached = false;
  source.x = 180;
  source.y = 300;
  source.vx = 90;
  source.vy = -240;
  source.setSpeed(260);
  const balls = [source];
  const objects = new FallingObjectSystem({
    ItemType: FallingItem,
    catalog: EffectCatalog,
  });

  objects.splitBalls(balls, Ball, 5);
  assert.equal(balls.length, 3);
  assert.ok(balls.every((ball) => Number.isFinite(ball.vx) && Number.isFinite(ball.vy)));
  assert.ok(balls.every((ball) => Math.abs(Math.hypot(ball.vx, ball.vy) - 260) < 0.000001));
  assert.notEqual(balls[1].vx, balls[2].vx);

  objects.splitBalls(balls, Ball, 5);
  objects.splitBalls(balls, Ball, 5);
  assert.equal(balls.length, 5);
});

test("multibola respeta límites menores y separa las bolas pegadas", () => {
  const paddle = new Paddle(360, 600);
  const source = new Ball();
  source.attachTo(paddle);
  const balls = [source];
  const objects = new FallingObjectSystem({
    ItemType: FallingItem,
    catalog: EffectCatalog,
  });
  objects.splitBalls(balls, Ball, 3);
  balls.forEach((ball) => ball.follow(paddle));
  assert.equal(balls.length, 3);
  assert.equal(new Set(balls.map((ball) => ball.x)).size, 3);
  objects.splitBalls(balls, Ball, 3);
  assert.equal(balls.length, 3);
});

test("los cambios de velocidad se aplican de forma segura a varias bolas", () => {
  const balls = [new Ball(), new Ball(), new Ball()];
  balls.forEach((ball, index) => {
    ball.attached = false;
    ball.vx = 80 + index * 20;
    ball.vy = -220;
    ball.setSpeed(250);
  });
  balls.forEach((ball) => ball.setSpeed(180));
  assert.ok(balls.every((ball) => Math.abs(Math.hypot(ball.vx, ball.vy) - 180) < 0.000001));
  balls.forEach((ball) => ball.setSpeed(338));
  assert.ok(balls.every((ball) => Math.abs(Math.hypot(ball.vx, ball.vy) - 338) < 0.000001));
});

test("los proyectiles avanzan, colisionan y salen del mundo correctamente", () => {
  const projectile = new Projectile(120, 200);
  const brick = new Brick(110, 170, 30, 20, "#fff");
  projectile.update(0.03);
  assert.equal(projectile.intersects(brick), true);
  projectile.update(1);
  assert.equal(projectile.alive, false);
});

test("los controles invertidos reflejan la coordenada horizontal", () => {
  assert.equal(InputManager.mapHorizontal(80, 360, false), 80);
  assert.equal(InputManager.mapHorizontal(80, 360, true), 280);
  assert.equal(InputManager.relativeDelta(20, 0.5, false), 40);
  assert.equal(InputManager.relativeDelta(20, 0.5, true), -40);
  assert.equal(InputManager.relativeDelta(20, 0, false), 0);
});

test("el control relativo mueve por desplazamiento sin saltar al tocar", () => {
  const listeners = new Map();
  const canvas = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: () => {},
  };
  const directMoves = [];
  const relativeMoves = [];
  const input = new InputManager({
    canvas,
    getView: () => ({ scale: 0.5, offsetX: 0, offsetY: 0 }),
    worldWidth: 360,
    worldHeight: 600,
    onMove: (point) => directMoves.push(point.x),
    onRelativeMove: (delta) => relativeMoves.push(delta),
    onPress: () => {},
    mode: "relative",
  });
  const event = (overrides) => ({
    pointerId: 1,
    pointerType: "touch",
    clientX: 100,
    clientY: 300,
    preventDefault: () => {},
    ...overrides,
  });

  listeners.get("pointerdown")(event({}));
  assert.deepEqual(directMoves, []);
  listeners.get("pointermove")(event({ clientX: 115 }));
  assert.deepEqual(relativeMoves, [30]);
  listeners.get("pointerup")(event({ clientX: 115 }));
  listeners.get("pointermove")(event({ clientX: 125 }));
  assert.deepEqual(relativeMoves, [30]);

  input.setMode("direct");
  listeners.get("pointerdown")(event({ clientX: 90 }));
  assert.deepEqual(directMoves, [180]);
  assert.throws(() => input.setMode("desconocido"), RangeError);
});

test("InputManager recupera el control al perder la captura del puntero", () => {
  const listeners = new Map();
  const rootListeners = new Map();
  const captures = new Set();
  let presses = 0;
  const canvas = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: (pointerId) => captures.add(pointerId),
    hasPointerCapture: (pointerId) => captures.has(pointerId),
    releasePointerCapture: (pointerId) => captures.delete(pointerId),
  };
  new InputManager({
    canvas,
    getView: () => ({ scale: 1, offsetX: 0, offsetY: 0 }),
    worldWidth: 360,
    worldHeight: 600,
    onMove: () => {},
    onPress: () => {
      presses += 1;
    },
    mode: "relative",
    eventRoot: {
      addEventListener: (name, callback) => rootListeners.set(name, callback),
      removeEventListener: () => {},
    },
  });
  const event = (pointerId) => ({
    pointerId,
    pointerType: "touch",
    clientX: 100,
    clientY: 300,
    preventDefault: () => {},
  });
  listeners.get("pointerdown")(event(1));
  listeners.get("lostpointercapture")(event(1));
  listeners.get("pointerdown")(event(2));
  assert.equal(presses, 2);
});

test("InputManager rechaza coordenadas durante una escala transitoria inválida", () => {
  const canvas = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const input = new InputManager({
    canvas,
    getView: () => ({ scale: 0, offsetX: 0, offsetY: 0 }),
    worldWidth: 360,
    worldHeight: 600,
    onMove: () => {},
    onPress: () => {},
    eventRoot: {},
  });
  assert.equal(input.pointerToWorld(0, 0), null);
});

test("los controles de teclado mueven y lanzan sin desplazar la página", () => {
  const prevented = [];
  let launches = 0;
  const fakeGame = {
    settingsPanel: { hidden: true },
    keyboardDirection: { left: false, right: false },
    audioManager: { unlock: () => {} },
    launchAttachedBalls: () => {
      launches += 1;
    },
  };
  const event = (key) => ({
    key,
    preventDefault: () => prevented.push(key),
  });
  NeonBreakerGame.prototype.handleKeyDown.call(fakeGame, event("ArrowLeft"));
  assert.equal(fakeGame.keyboardDirection.left, true);
  NeonBreakerGame.prototype.handleKeyUp.call(fakeGame, event("ArrowLeft"));
  assert.equal(fakeGame.keyboardDirection.left, false);
  NeonBreakerGame.prototype.handleKeyDown.call(fakeGame, event(" "));
  assert.equal(launches, 1);
  assert.deepEqual(prevented, ["ArrowLeft", " "]);
});

test("los diálogos y avisos de efectos tienen semántica accesible estable", () => {
  const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(
    html,
    /id="screenOverlay"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/,
  );
  assert.match(
    html,
    /id="effectAnnouncements"[\s\S]*?role="status"[\s\S]*?aria-live="polite"/,
  );
  assert.doesNotMatch(
    html,
    /id="effectsPanel"[^>]*aria-live/,
  );
});

test("index.html conserva todas sus dependencias locales ejecutables", () => {
  const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const localAssets = [
    ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g),
  ]
    .map((match) => match[1].split("?")[0])
    .filter((source) => !source.startsWith("data:"));

  assert.ok(localAssets.length > 0);
  for (const source of localAssets) {
    assert.equal(
      fs.existsSync(path.join(projectRoot, source)),
      true,
      `Falta la dependencia local ${source}`,
    );
  }
});

test("la interfaz protege el tamaño de texto y el panel debug en retrato", () => {
  const css = fs.readFileSync(path.join(projectRoot, "css/styles.css"), "utf8");
  assert.match(css, /\.effects-panel[\s\S]*?font-size:\s*clamp\(0\.75rem/);
  assert.match(css, /\.fire-button[\s\S]*?font-size:\s*0\.75rem/);
  assert.match(
    css,
    /@media \(max-width:\s*760px\) and \(orientation:\s*portrait\)/,
  );
});

test("AudioManager solo crea audio tras desbloqueo y reproduce señales originales", () => {
  const events = [];
  let oscillator = null;
  const context = {
    currentTime: 2,
    destination: {},
    state: "suspended",
    resume: () => events.push("resume"),
    close: () => events.push("close"),
    createOscillator: () => {
      oscillator = {
        frequency: { setValueAtTime: (value) => events.push(["frequency", value]) },
        connect: () => events.push("oscillator-connect"),
        disconnect: () => events.push("oscillator-disconnect"),
        start: () => events.push("start"),
        stop: () => events.push("stop"),
      };
      return oscillator;
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => events.push("gain-connect"),
      disconnect: () => events.push("gain-disconnect"),
    }),
  };
  const audio = new AudioManager({
    enabled: true,
    contextFactory: () => context,
  });
  assert.equal(audio.context, null);
  assert.equal(audio.play("brick"), false);
  assert.equal(audio.unlock(), context);
  assert.ok(events.includes("resume"));
  assert.equal(audio.play("brick"), true);
  assert.ok(events.includes("start") && events.includes("stop"));
  assert.equal(audio.activeNodes.size, 1);
  oscillator.onended();
  assert.equal(audio.activeNodes.size, 0);
  assert.ok(events.includes("oscillator-disconnect"));
  assert.ok(events.includes("gain-disconnect"));
  audio.setEnabled(false);
  assert.equal(audio.play("brick"), false);
  audio.destroy();
  assert.equal(audio.context, null);
  assert.ok(events.includes("close"));
});

test("AudioManager absorbe rechazos al reanudar y cerrar el contexto", () => {
  let handledRejections = 0;
  const rejectedOperation = {
    catch: (handler) => {
      handledRejections += 1;
      handler(new Error("rechazo esperado"));
    },
  };
  const audio = new AudioManager({
    enabled: true,
    contextFactory: () => ({
      state: "suspended",
      resume: () => rejectedOperation,
      close: () => rejectedOperation,
    }),
  });

  audio.unlock();
  audio.destroy();
  assert.equal(handledRejections, 2);
});

test("VibrationManager respeta disponibilidad y preferencia", () => {
  const patterns = [];
  const vibration = new VibrationManager({
    enabled: true,
    navigatorObject: {
      vibrate: (pattern) => {
        patterns.push(pattern);
        return true;
      },
    },
  });
  assert.equal(vibration.available, true);
  assert.equal(vibration.pulse([10, 20, 10]), true);
  assert.deepEqual(patterns, [[10, 20, 10]]);
  vibration.setEnabled(false);
  assert.equal(vibration.pulse(10), false);

  const unavailable = new VibrationManager({ navigatorObject: {} });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.setEnabled(true), false);
});

test("StorageManager conserva las preferencias móviles", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const manager = new StorageManager(storage);
  assert.equal(manager.write("controlMode", "relative"), true);
  assert.equal(manager.write("soundEnabled", false), true);
  assert.equal(manager.read("controlMode"), "relative");
  assert.equal(manager.read("soundEnabled"), false);
  assert.equal(manager.remove("soundEnabled"), true);
  assert.equal(manager.read("soundEnabled", true), true);
});

test("StorageManager valida y conserva el progreso de la campaña", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const manager = new StorageManager(storage);
  assert.equal(manager.writeProgress({
    maxUnlockedLevel: 8,
    highScore: 12300,
    lastGame: { levelIndex: 7, score: 8400, lives: 2 },
  }, 40), true);
  assert.deepEqual(manager.readProgress(40), {
    version: 1,
    maxUnlockedLevel: 8,
    highScore: 12300,
    lastGame: { levelIndex: 7, score: 8400, lives: 2 },
  });

  manager.write("progress", {
    maxUnlockedLevel: 999,
    highScore: -4,
    lastGame: { levelIndex: 999, score: -1, lives: 99 },
  });
  assert.deepEqual(manager.readProgress(40), {
    version: 1,
    maxUnlockedLevel: 40,
    highScore: 0,
    lastGame: { levelIndex: 39, score: 0, lives: 3 },
  });
});

test("StorageManager no bloquea el inicio cuando localStorage lanza SecurityError", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("SecurityError");
    },
  });
  try {
    const manager = new StorageManager();
    assert.equal(manager.storage, null);
    assert.equal(manager.read("progress", "fallback"), "fallback");
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("la plataforma restaura su tamaño y la resbaladiza conserva inercia", () => {
  const normal = new Paddle(360, 600);
  const slippery = new Paddle(360, 600);
  normal.setCenter(300);
  slippery.setCenter(300);
  slippery.setSlippery(true);
  normal.update(0.1);
  slippery.update(0.1);
  assert.ok(normal.x > slippery.x);
  assert.ok(slippery.velocity > 0);

  normal.setWidth(122);
  assert.equal(normal.width, 122);
  normal.restoreDefaults();
  assert.equal(normal.width, normal.baseWidth);
  assert.equal(normal.slippery, false);

  normal.moveBy(1000);
  assert.equal(normal.targetX, normal.worldWidth - normal.width);
  normal.moveBy(-1000);
  assert.equal(normal.targetX, 0);
});

test("cada efecto temporal del catálogo tiene una estrategia explícita", () => {
  const fakeGame = {
    clearingEffects: false,
    state: "playing",
    paddle: {
      baseWidth: 84,
      setWidth: () => {},
      setSlippery: () => {},
    },
    fireButton: { hidden: true, disabled: true },
    projectiles: [],
    inputManager: { setInverted: () => {} },
    launchAttachedBalls: () => {},
    setBallSpeedMultiplier: () => {},
  };

  for (const definition of EffectCatalog.EFFECTS) {
    assert.ok(definition.behavior?.kind, `${definition.id} necesita behavior.kind`);
    if (definition.behavior.kind === "multiball") {
      continue;
    }
    const handlers = NeonBreakerGame.prototype.effectHandlers.call(
      fakeGame,
      definition,
    );
    assert.equal(typeof handlers.apply, "function");
    assert.equal(typeof handlers.expire, "function");
  }

  assert.throws(
    () => NeonBreakerGame.prototype.effectHandlers.call(fakeGame, {
      id: "sin-estrategia",
      behavior: { kind: "desconocida" },
    }),
    /no tiene estrategia válida/,
  );
});

test("la destrucción del juego es completa e idempotente", () => {
  const calls = [];
  const fakeGame = {
    destroyed: false,
    clearingEffects: false,
    gameLoop: { stop: () => calls.push("loop") },
    unbindInterfaceEvents: () => calls.push("listeners"),
    inputManager: { destroy: () => calls.push("input") },
    effectManager: { clear: () => calls.push("effects") },
    fallingObjectSystem: { clear: () => calls.push("falling") },
    audioManager: { destroy: () => calls.push("audio") },
    debugButtons: { replaceChildren: () => calls.push("debug") },
    setSettingsIsolation: () => calls.push("settings"),
    setOverlayIsolation: () => calls.push("overlay"),
  };

  NeonBreakerGame.prototype.destroy.call(fakeGame);
  NeonBreakerGame.prototype.destroy.call(fakeGame);
  assert.deepEqual(calls, [
    "loop",
    "listeners",
    "input",
    "effects",
    "falling",
    "audio",
    "debug",
    "settings",
    "overlay",
  ]);
});

test("pausar detiene el render continuo y reanudar lo reactiva", () => {
  const calls = [];
  const fakeGame = {
    state: "ready",
    previousState: null,
    launchHint: { hidden: false },
    pauseButton: {
      setAttribute: (name, value) => calls.push([name, value]),
      firstElementChild: { textContent: "" },
    },
    showOverlay: () => calls.push("overlay"),
    hideOverlay: () => calls.push("hide"),
    saveProgress: () => calls.push("save"),
    updateLaunchHint: () => calls.push("hint"),
    gameLoop: {
      stop: () => calls.push("stop"),
      start: () => calls.push("start"),
    },
  };

  NeonBreakerGame.prototype.pause.call(fakeGame);
  assert.equal(fakeGame.state, "paused");
  assert.ok(calls.includes("stop"));
  NeonBreakerGame.prototype.resume.call(fakeGame);
  assert.equal(fakeGame.state, "ready");
  assert.ok(calls.includes("start"));
});

test("GameLoop separa actualizaciones fijas del render", () => {
  let scheduledFrame = null;
  let updates = 0;
  let renders = 0;
  const loop = new GameLoop({
    fixedStep: 0.01,
    update: () => {
      updates += 1;
    },
    render: () => {
      renders += 1;
    },
    requestFrame: (callback) => {
      scheduledFrame = callback;
      return 1;
    },
  });

  loop.start();
  scheduledFrame(1000);
  scheduledFrame(1025);
  loop.stop();

  assert.equal(updates, 2);
  assert.equal(renders, 2);
});

test("GameLoop calcula FPS en ventanas de tiempo acotadas", () => {
  let scheduledFrame = null;
  const loop = new GameLoop({
    update: () => {},
    render: () => {},
    requestFrame: (callback) => {
      scheduledFrame = callback;
      return 1;
    },
  });
  loop.start();
  scheduledFrame(1000);
  scheduledFrame(1260);
  scheduledFrame(1520);
  loop.stop();
  assert.ok(loop.fps > 0);
  assert.ok(Number.isFinite(loop.fps));
});

test("GameLoop cancela el frame pendiente y descarta callbacks obsoletos", () => {
  const callbacks = [];
  const cancelled = [];
  let renders = 0;
  const loop = new GameLoop({
    update: () => {},
    render: () => {
      renders += 1;
    },
    requestFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancelFrame: (frameId) => cancelled.push(frameId),
  });

  loop.start();
  const staleCallback = callbacks[0];
  loop.stop();
  loop.start();
  staleCallback(1000);
  assert.equal(renders, 0);
  assert.deepEqual(cancelled, [1]);
  callbacks[1](1016);
  assert.equal(renders, 1);
  loop.stop();
});

test("GameLoop no renderiza ni agenda otro frame si se detiene durante update", () => {
  let scheduledFrame = null;
  let scheduledCount = 0;
  let renders = 0;
  let loop = null;
  loop = new GameLoop({
    fixedStep: 0.01,
    update: () => loop.stop(),
    render: () => {
      renders += 1;
    },
    requestFrame: (callback) => {
      scheduledFrame = callback;
      scheduledCount += 1;
      return scheduledCount;
    },
    cancelFrame: () => {},
  });

  loop.start();
  scheduledFrame(1000);
  scheduledFrame(1020);
  assert.equal(renders, 1);
  assert.equal(scheduledCount, 2);
  assert.equal(loop.running, false);
});

let failures = 0;
for (const { name, callback } of tests) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`\n${failures} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} pruebas superadas.`);
}
