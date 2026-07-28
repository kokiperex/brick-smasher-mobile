(function exposeGame(root) {
  "use strict";

  const WORLD_WIDTH = 360;
  const WORLD_HEIGHT = 600;
  const MAX_BALLS = 5;

  class NeonBreakerGame {
    constructor(elements) {
      this.canvas = elements.canvas;
      this.context = this.canvas.getContext("2d", { alpha: false });
      this.hud = elements.hud;
      this.stage = elements.stage;
      this.scoreElement = elements.score;
      this.levelElement = elements.level;
      this.livesElement = elements.lives;
      this.pauseButton = elements.pauseButton;
      this.settingsButton = elements.settingsButton;
      this.settingsPanel = elements.settingsPanel;
      this.controlModeButton = elements.controlModeButton;
      this.controlModeHelp = elements.controlModeHelp;
      this.soundButton = elements.soundButton;
      this.vibrationButton = elements.vibrationButton;
      this.closeSettingsButton = elements.closeSettingsButton;
      this.overlay = elements.overlay;
      this.overlayPanel = elements.overlayPanel;
      this.overlayEyebrow = elements.overlayEyebrow;
      this.overlayTitle = elements.overlayTitle;
      this.overlayMessage = elements.overlayMessage;
      this.overlayButton = elements.overlayButton;
      this.restartLevelButton = elements.restartLevelButton;
      this.chooseLevelButton = elements.chooseLevelButton;
      this.backToPauseButton = elements.backToPauseButton;
      this.levelSelector = elements.levelSelector;
      this.levelSelectorStatus = elements.levelSelectorStatus;
      this.levelGrid = elements.levelGrid;
      this.launchHint = elements.launchHint;
      this.effectsPanel = elements.effectsPanel;
      this.effectAnnouncements = elements.effectAnnouncements;
      this.fireButton = elements.fireButton;
      this.debugPanel = elements.debugPanel;
      this.debugButtons = elements.debugButtons;
      this.debugStatus = elements.debugStatus;

      this.state = "start";
      this.previousState = "ready";
      this.score = 0;
      this.lives = 3;
      this.bricks = [];
      this.balls = [];
      this.projectiles = [];
      this.baseBallSpeed = 260;
      this.ballSpeedMultiplier = 1;
      this.shotCooldown = 0;
      this.clearingEffects = false;
      this.effectHudSignature = "";
      this.debugHudSignature = "";
      this.view = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };
      this.random = Math.random;
      this.settingsReturnState = null;
      this.levelSelectorReturnState = null;
      this.keyboardDirection = { left: false, right: false };
      this.destroyed = false;

      this.storageManager = new root.StorageManager();
      const storedControlMode = this.storageManager.read("controlMode", null);
      const prefersRelativeControl = root.matchMedia?.("(pointer: coarse)")?.matches === true;
      this.controlMode = ["direct", "relative"].includes(storedControlMode)
        ? storedControlMode
        : (prefersRelativeControl ? "relative" : "direct");
      this.paddle = new root.NeonPaddle(WORLD_WIDTH, WORLD_HEIGHT);
      this.collisionSystem = new root.CollisionSystem();
      this.levelManager = new root.LevelManager(
        root.BrickSmasherLevels.LEVELS,
        root.NeonBrick,
        WORLD_WIDTH,
      );
      this.progress = this.storageManager.readProgress(this.levelManager.total);
      this.effectManager = new root.EffectManager();
      this.fallingObjectSystem = new root.FallingObjectSystem();
      this.audioManager = new root.AudioManager({
        enabled: this.storageManager.read("soundEnabled", true) !== false,
      });
      this.vibrationManager = new root.VibrationManager({
        enabled: this.storageManager.read("vibrationEnabled", true) !== false,
      });
      this.backgroundLayer = this.createBackgroundLayer();

      this.resize = this.resize.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.interfaceHandlers = this.createInterfaceHandlers();
      this.bindInterfaceEvents();
      this.inputManager = new root.InputManager({
        canvas: this.canvas,
        getView: () => this.view,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        onMove: (point) => this.paddle.setCenter(point.x),
        onRelativeMove: (deltaX) => this.paddle.moveBy(deltaX),
        onPress: () => {
          this.audioManager.unlock();
          this.launchAttachedBalls();
        },
        mode: this.controlMode,
      });
      this.gameLoop = new root.GameLoop({
        fixedStep: 1 / 60,
        update: (deltaSeconds) => this.update(deltaSeconds),
        render: () => this.render(),
      });

      this.configureDebugPanel();
      this.resize();
      this.updateHud();
      this.updateEffectsHud(true);
      this.syncSettingsUi();
      this.pauseButton.disabled = true;
      this.setOverlayIsolation(true);
      if (this.progress.lastGame) {
        this.overlayMessage.textContent = (
          `Continúa desde el nivel ${this.progress.lastGame.levelIndex + 1} `
          + `con ${this.progress.lastGame.score.toString().padStart(6, "0")} puntos.`
        );
        this.overlayButton.textContent = "CONTINUAR";
      }
    }

    get levelIndex() {
      return this.levelManager.index;
    }

    createInterfaceHandlers() {
      return {
        overlayClick: () => {
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.handleOverlayAction();
        },
        pauseClick: () => {
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.togglePause();
        },
        restartLevelClick: () => {
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.restartCurrentLevel();
        },
        chooseLevelClick: () => {
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.showLevelSelector();
        },
        backToPauseClick: () => {
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.returnFromLevelSelector();
        },
        levelGridClick: (event) => {
          const button = event.target.closest("button[data-level-index]");
          if (!button || !this.levelGrid.contains(button)) {
            return;
          }
          this.audioManager.unlock();
          this.audioManager.play("ui");
          this.selectLevel(Number(button.dataset.levelIndex));
        },
        settingsClick: () => this.openSettings(),
        closeSettingsClick: () => this.closeSettings(),
        controlModeClick: () => this.toggleControlMode(),
        soundClick: () => this.toggleSound(),
        vibrationClick: () => this.toggleVibration(),
        fireClick: (event) => {
          event.preventDefault();
          this.fireProjectiles();
        },
        blur: () => {
          this.keyboardDirection.left = false;
          this.keyboardDirection.right = false;
          if (this.state === "playing" || this.state === "ready") {
            this.pause();
          }
        },
        visibilityChange: () => {
          if (root.document.hidden) {
            this.keyboardDirection.left = false;
            this.keyboardDirection.right = false;
          }
          if (
            root.document.hidden
            && (this.state === "playing" || this.state === "ready")
          ) {
            this.pause();
          }
        },
      };
    }

    bindInterfaceEvents() {
      const handlers = this.interfaceHandlers;
      this.overlayButton.addEventListener("click", handlers.overlayClick);
      this.restartLevelButton.addEventListener("click", handlers.restartLevelClick);
      this.chooseLevelButton.addEventListener("click", handlers.chooseLevelClick);
      this.backToPauseButton.addEventListener("click", handlers.backToPauseClick);
      this.levelGrid.addEventListener("click", handlers.levelGridClick);
      this.pauseButton.addEventListener("click", handlers.pauseClick);
      this.settingsButton.addEventListener("click", handlers.settingsClick);
      this.closeSettingsButton.addEventListener("click", handlers.closeSettingsClick);
      this.controlModeButton.addEventListener("click", handlers.controlModeClick);
      this.soundButton.addEventListener("click", handlers.soundClick);
      this.vibrationButton.addEventListener("click", handlers.vibrationClick);
      this.fireButton.addEventListener("click", handlers.fireClick);
      root.addEventListener("resize", this.resize);
      root.addEventListener("blur", handlers.blur);
      root.document.addEventListener("visibilitychange", handlers.visibilityChange);
      root.document.addEventListener("keydown", this.handleKeyDown);
      root.document.addEventListener("keyup", this.handleKeyUp);
    }

    unbindInterfaceEvents() {
      const handlers = this.interfaceHandlers;
      this.overlayButton.removeEventListener("click", handlers.overlayClick);
      this.restartLevelButton.removeEventListener("click", handlers.restartLevelClick);
      this.chooseLevelButton.removeEventListener("click", handlers.chooseLevelClick);
      this.backToPauseButton.removeEventListener("click", handlers.backToPauseClick);
      this.levelGrid.removeEventListener("click", handlers.levelGridClick);
      this.pauseButton.removeEventListener("click", handlers.pauseClick);
      this.settingsButton.removeEventListener("click", handlers.settingsClick);
      this.closeSettingsButton.removeEventListener("click", handlers.closeSettingsClick);
      this.controlModeButton.removeEventListener("click", handlers.controlModeClick);
      this.soundButton.removeEventListener("click", handlers.soundClick);
      this.vibrationButton.removeEventListener("click", handlers.vibrationClick);
      this.fireButton.removeEventListener("click", handlers.fireClick);
      root.removeEventListener("resize", this.resize);
      root.removeEventListener("blur", handlers.blur);
      root.document.removeEventListener("visibilitychange", handlers.visibilityChange);
      root.document.removeEventListener("keydown", this.handleKeyDown);
      root.document.removeEventListener("keyup", this.handleKeyUp);
    }

    destroy() {
      if (this.destroyed) {
        return;
      }
      this.destroyed = true;
      this.gameLoop.stop();
      this.unbindInterfaceEvents();
      this.inputManager.destroy();
      this.clearingEffects = true;
      this.effectManager.clear();
      this.clearingEffects = false;
      this.fallingObjectSystem.clear();
      this.audioManager.destroy();
      this.debugButtons.replaceChildren();
      this.setSettingsIsolation(false);
      this.setOverlayIsolation(false);
    }

    handleKeyDown(event) {
      if (this.settingsPanel && !this.settingsPanel.hidden) {
        if (event.key === "Escape") {
          event.preventDefault();
          this.closeSettings();
        } else if (event.key === "Tab") {
          this.trapSettingsFocus(event);
        }
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        this.keyboardDirection.left = true;
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        this.keyboardDirection.right = true;
      } else if (key === " " || key === "spacebar") {
        event.preventDefault();
        this.audioManager.unlock();
        this.launchAttachedBalls();
      }
    }

    handleKeyUp(event) {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        this.keyboardDirection.left = false;
      } else if (key === "arrowright" || key === "d") {
        this.keyboardDirection.right = false;
      }
    }

    trapSettingsFocus(event) {
      const focusable = [...this.settingsPanel.querySelectorAll(
        "button:not([disabled])",
      )];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && root.document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && root.document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    setOverlayIsolation(active) {
      const isolatedElements = [
        this.hud,
        this.canvas,
        this.effectsPanel,
        this.effectAnnouncements,
        this.fireButton,
        this.launchHint,
        this.debugPanel,
      ];
      for (const element of isolatedElements) {
        if (element) {
          element.inert = active;
        }
      }
    }

    setSettingsIsolation(active) {
      for (const element of [this.hud, this.stage, this.debugPanel]) {
        if (element) {
          element.inert = active;
        }
      }
    }

    openSettings() {
      this.audioManager.unlock();
      this.audioManager.play("ui");
      this.settingsReturnState = null;
      if (this.state === "playing" || this.state === "ready") {
        this.settingsReturnState = this.state;
        this.pause();
      }
      this.settingsPanel.hidden = false;
      this.setSettingsIsolation(true);
      this.settingsButton.setAttribute("aria-expanded", "true");
      this.syncSettingsUi();
      this.closeSettingsButton.focus({ preventScroll: true });
    }

    closeSettings() {
      if (this.settingsPanel.hidden) {
        return;
      }
      this.settingsPanel.hidden = true;
      this.setSettingsIsolation(false);
      this.settingsButton.setAttribute("aria-expanded", "false");
      if (this.settingsReturnState) {
        this.settingsReturnState = null;
        this.resume();
      }
      if (!this.settingsButton.inert) {
        this.settingsButton.focus({ preventScroll: true });
      }
    }

    toggleControlMode() {
      this.controlMode = this.controlMode === "direct" ? "relative" : "direct";
      this.inputManager.setMode(this.controlMode);
      this.storageManager.write("controlMode", this.controlMode);
      this.audioManager.play("ui");
      this.syncSettingsUi();
    }

    toggleSound() {
      const enabled = this.audioManager.setEnabled(!this.audioManager.enabled);
      this.storageManager.write("soundEnabled", enabled);
      if (enabled) {
        this.audioManager.unlock();
        this.audioManager.play("ui");
      }
      this.syncSettingsUi();
    }

    toggleVibration() {
      const enabled = this.vibrationManager.setEnabled(!this.vibrationManager.enabled);
      this.storageManager.write("vibrationEnabled", enabled);
      if (enabled) {
        this.vibrationManager.pulse(12);
      }
      this.syncSettingsUi();
    }

    syncSettingsUi() {
      const relative = this.controlMode === "relative";
      this.controlModeButton.textContent = relative
        ? "CONTROL: RELATIVO"
        : "CONTROL: DIRECTO";
      this.controlModeButton.setAttribute("aria-pressed", String(relative));
      this.controlModeHelp.textContent = relative
        ? "Desliza desde cualquier zona: la plataforma avanza la misma distancia."
        : "La plataforma sigue la posición horizontal del dedo.";

      this.soundButton.textContent = `SONIDO: ${this.audioManager.enabled ? "SÍ" : "NO"}`;
      this.soundButton.setAttribute("aria-pressed", String(this.audioManager.enabled));

      if (this.vibrationManager.available) {
        this.vibrationButton.disabled = false;
        this.vibrationButton.textContent = (
          `VIBRACIÓN: ${this.vibrationManager.enabled ? "SÍ" : "NO"}`
        );
        this.vibrationButton.setAttribute(
          "aria-pressed",
          String(this.vibrationManager.enabled),
        );
      } else {
        this.vibrationButton.disabled = true;
        this.vibrationButton.textContent = "VIBRACIÓN: NO DISP.";
        this.vibrationButton.setAttribute("aria-pressed", "false");
      }
    }

    configureDebugPanel() {
      const debugEnabled = typeof root.location !== "undefined"
        && new URLSearchParams(root.location.search).get("debug") === "1";
      if (!debugEnabled) {
        return;
      }

      document.body.classList.add("debug-mode");
      this.debugPanel.hidden = false;
      this.debugButtons.replaceChildren();

      for (const definition of root.EffectCatalog.EFFECTS) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-type", definition.type);
        button.setAttribute("aria-label", `Generar ${definition.name}`);
        button.textContent = `${definition.icon} ${definition.name}`;
        button.addEventListener("click", () => this.spawnDebugItem(definition.id));
        this.debugButtons.append(button);
      }

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "debug-utility";
      completeButton.setAttribute("aria-label", "Completar nivel en modo debug");
      completeButton.textContent = "✓ Completar nivel";
      completeButton.addEventListener("click", () => {
        if (this.state !== "playing" && this.state !== "ready") {
          this.startNewGame();
        }
        for (const brick of this.bricks) {
          brick.alive = false;
        }
        this.completeLevel();
      });
      this.debugButtons.append(completeButton);
    }

    spawnDebugItem(effectId) {
      if (this.state !== "playing" && this.state !== "ready") {
        this.startNewGame();
      }
      this.fallingObjectSystem.spawn(
        effectId,
        this.paddle.x + this.paddle.width / 2,
        this.paddle.y - 34,
      );
      this.updateEffectsHud(true);
    }

    resize() {
      this.inputManager?.cancelActivePointer();
      const bounds = this.stage.getBoundingClientRect();
      const dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      this.canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      const measuredScale = Math.min(
        bounds.width / WORLD_WIDTH,
        bounds.height / WORLD_HEIGHT,
      );
      const scale = Number.isFinite(measuredScale) && measuredScale > 0
        ? measuredScale
        : (this.view.scale > 0 ? this.view.scale : 1);

      this.view = {
        scale,
        offsetX: (bounds.width - WORLD_WIDTH * scale) / 2,
        offsetY: (bounds.height - WORLD_HEIGHT * scale) / 2,
        dpr,
      };
      if (this.gameLoop && !this.gameLoop.running) {
        this.render();
      }
    }

    handleOverlayAction() {
      if (this.state === "start") {
        this.startNewGame(true);
        return;
      }
      if (this.state === "gameOver") {
        this.restartGameOverLevel();
        return;
      }
      if (this.state === "finished") {
        this.startNewGame(false);
        return;
      }
      if (this.state === "levelComplete") {
        this.levelManager.next();
        this.loadLevel();
        return;
      }
      if (this.state === "paused") {
        this.resume();
      }
    }

    startNewGame(resumeSavedGame = false) {
      const savedGame = resumeSavedGame ? this.progress.lastGame : null;
      this.score = savedGame?.score ?? 0;
      this.lives = savedGame?.lives ?? 3;
      if (!savedGame || !this.levelManager.goTo(savedGame.levelIndex)) {
        this.levelManager.reset();
      }
      this.loadLevel();
    }

    loadLevel() {
      this.clearLevelEffects();
      const level = this.levelManager.current;
      this.baseBallSpeed = level.ballSpeed;
      this.ballSpeedMultiplier = 1;
      this.paddle.baseWidth = level.paddleWidth;
      this.paddle.restoreDefaults();
      this.paddle.reset();
      this.balls = [this.createBall(true)];
      this.bricks = this.levelManager.createBricks();
      this.state = "ready";
      this.gameLoop.resetClock();
      this.gameLoop.start();
      this.hideOverlay();
      this.pauseButton.disabled = false;
      this.pauseButton.setAttribute("aria-label", "Pausar partida");
      this.pauseButton.firstElementChild.textContent = "Ⅱ";
      this.updateLaunchHint();
      this.updateHud();
      this.updateEffectsHud(true);
      this.canvas.focus({ preventScroll: true });
      this.saveProgress();
    }

    saveProgress({ lastGame = undefined } = {}) {
      this.progress.highScore = Math.max(this.progress.highScore, this.score);
      this.progress.maxUnlockedLevel = Math.max(
        this.progress.maxUnlockedLevel,
        Math.min(this.levelManager.total, this.levelIndex + 1),
      );
      if (lastGame !== undefined) {
        this.progress.lastGame = lastGame;
      } else if (
        this.state === "ready"
        || this.state === "playing"
        || this.state === "paused"
      ) {
        this.progress.lastGame = {
          levelIndex: this.levelIndex,
          score: this.score,
          lives: this.lives,
        };
      }
      this.storageManager.writeProgress(this.progress, this.levelManager.total);
    }

    createBall(attached = false) {
      const ball = new root.NeonBall();
      ball.setSpeed(this.baseBallSpeed * this.ballSpeedMultiplier);
      if (attached) {
        ball.attachTo(this.paddle);
      }
      return ball;
    }

    launchAttachedBalls() {
      if (this.state !== "ready" && this.state !== "playing") {
        return false;
      }

      let launched = false;
      for (const ball of this.balls) {
        launched = ball.launch() || launched;
      }
      if (launched) {
        this.state = "playing";
        this.audioManager.play("launch");
      }
      this.updateLaunchHint();
      return launched;
    }

    updateLaunchHint() {
      const canLaunch = (this.state === "ready" || this.state === "playing")
        && this.balls.some((ball) => ball.attached);
      this.launchHint.hidden = !canLaunch;
    }

    togglePause() {
      if (this.state === "playing" || this.state === "ready") {
        this.pause();
      } else if (this.state === "paused") {
        this.resume();
      }
    }

    pause() {
      this.previousState = this.state;
      this.state = "paused";
      this.launchHint.hidden = true;
      this.pauseButton.setAttribute("aria-label", "Reanudar partida");
      this.pauseButton.firstElementChild.textContent = "▶";
      this.showPauseMenu();
      this.saveProgress();
      this.gameLoop.stop();
    }

    resume() {
      this.state = this.previousState;
      this.hideOverlay();
      this.updateLaunchHint();
      this.pauseButton.setAttribute("aria-label", "Pausar partida");
      this.pauseButton.firstElementChild.textContent = "Ⅱ";
      this.gameLoop.start();
    }

    restartCurrentLevel() {
      if (this.state !== "paused") {
        return false;
      }
      this.loadLevel();
      return true;
    }

    selectableLevelIndices() {
      const availableCount = Math.max(1, Math.min(
        this.levelManager.total,
        this.progress?.maxUnlockedLevel || 1,
      ));
      return Array.from({ length: availableCount }, (_, index) => index);
    }

    canSelectLevel(index) {
      return (this.state === "paused" || this.state === "gameOver")
        && Number.isInteger(index)
        && index >= 0
        && index < this.levelManager.total
        && index < (this.progress?.maxUnlockedLevel || 1);
    }

    selectLevel(index) {
      if (!this.canSelectLevel(index)) {
        return false;
      }
      if (!this.levelManager.goTo(index)) {
        return false;
      }
      this.score = 0;
      this.lives = 3;
      this.loadLevel();
      return true;
    }

    restartGameOverLevel() {
      if (this.state !== "gameOver") {
        return false;
      }
      this.score = 0;
      this.lives = 3;
      this.loadLevel();
      return true;
    }

    update(deltaSeconds) {
      if (this.state !== "playing" && this.state !== "ready") {
        return;
      }

      this.effectManager.update(deltaSeconds);
      this.shotCooldown = Math.max(0, this.shotCooldown - deltaSeconds);
      const keyboardAxis = Number(this.keyboardDirection.right)
        - Number(this.keyboardDirection.left);
      if (keyboardAxis !== 0) {
        const direction = this.inputManager.inverted ? -keyboardAxis : keyboardAxis;
        this.paddle.moveBy(direction * 280 * deltaSeconds);
      }
      this.paddle.update(deltaSeconds);
      this.updateBricks(deltaSeconds);
      for (const ball of this.balls) {
        ball.follow(this.paddle);
      }

      this.fallingObjectSystem.update(
        deltaSeconds,
        this.paddle,
        WORLD_HEIGHT,
        (effectId) => this.applyEffect(effectId),
      );
      this.updateProjectiles(deltaSeconds);

      if (this.state === "playing") {
        for (const ball of this.balls) {
          if (!ball.attached && !ball.lost) {
            this.updateBall(ball, deltaSeconds);
          }
          if (this.state !== "playing") {
            break;
          }
        }

        this.balls = this.balls.filter((ball) => !ball.lost);
        if (this.state === "playing" && this.balls.length === 0) {
          this.loseLife();
        }
      }

      this.updateLaunchHint();
      this.updateEffectsHud();
    }

    updateBricks(deltaSeconds) {
      for (const brick of this.bricks) {
        brick.update?.(deltaSeconds, WORLD_WIDTH);
      }
    }

    updateBall(ball, deltaSeconds) {
      const distance = Math.hypot(ball.vx, ball.vy) * deltaSeconds;
      const steps = Math.max(1, Math.ceil(distance / (ball.radius * 0.55)));
      const substep = deltaSeconds / steps;

      for (let index = 0; index < steps && this.state === "playing"; index += 1) {
        ball.x += ball.vx * substep;
        ball.y += ball.vy * substep;
        if (this.collisionSystem.resolveWalls(ball, WORLD_WIDTH)) {
          this.audioManager.play("bounce");
        }
        this.resolvePaddleCollision(ball);
        if (!ball.attached) {
          this.resolveBrickCollisions(ball);
          this.collisionSystem.ensureVerticalVelocity(ball);
        }

        if (ball.y - ball.radius > WORLD_HEIGHT) {
          ball.lost = true;
          break;
        }
      }
    }

    resolvePaddleCollision(ball) {
      if (ball.vy <= 0) {
        return;
      }
      const collision = this.collisionSystem.circleRect(ball, this.paddle);
      if (!collision || collision.normalY > -0.5 || ball.y > this.paddle.y) {
        return;
      }

      if (this.effectManager.isActive("sticky")) {
        const paddleCenter = this.paddle.x + this.paddle.width / 2;
        const impactRatio = (ball.x - paddleCenter) / (this.paddle.width / 2);
        ball.attachTo(this.paddle, impactRatio);
        this.audioManager.play("bounce");
        this.updateLaunchHint();
        return;
      }

      if (this.collisionSystem.resolvePaddle(ball, this.paddle)) {
        this.audioManager.play("bounce");
      }
    }

    resolveBrickCollisions(ball) {
      for (const brick of this.bricks) {
        if (!brick.alive || !this.collisionSystem.resolveBrick(ball, brick)) {
          continue;
        }
        this.destroyBrick(brick);
        break;
      }
    }

    destroyBrick(brick, { checkCompletion = true } = {}) {
      if (!brick.alive || !brick.breakable) {
        return false;
      }

      const damage = brick.takeDamage
        ? brick.takeDamage(1)
        : (() => {
          brick.alive = false;
          return { hit: true, destroyed: true, phaseChanged: false };
        })();
      if (!damage.hit) {
        return false;
      }
      this.audioManager.play("brick");
      this.vibrationManager.pulse(damage.destroyed ? 8 : 4);
      if (!damage.destroyed) {
        return "damaged";
      }

      this.score += 100;
      if (brick.type === "explosive") {
        for (const adjacentBrick of this.bricks) {
          if (
            adjacentBrick !== brick
            && adjacentBrick.alive
            && adjacentBrick.breakable
            && Math.abs(adjacentBrick.row - brick.row) <= 1
            && Math.abs(adjacentBrick.column - brick.column) <= 1
          ) {
            this.destroyBrick(adjacentBrick, { checkCompletion: false });
          }
        }
      }

      const level = this.levelManager.current;
      const dropRoll = this.random();
      if (brick.type === "surprise") {
        this.fallingObjectSystem.spawnRandom(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          dropRoll < 0.5 ? "prize" : "penalty",
        );
      } else if (dropRoll < level.prizeChance) {
        this.fallingObjectSystem.spawnRandom(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          "prize",
        );
      } else if (dropRoll < level.prizeChance + level.penaltyChance) {
        this.fallingObjectSystem.spawnRandom(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          "penalty",
        );
      }

      this.updateHud();
      this.saveProgress();
      if (checkCompletion && !this.levelManager.hasRemainingBricks(this.bricks)) {
        this.completeLevel();
      }
      return true;
    }

    updateProjectiles(deltaSeconds) {
      for (const projectile of this.projectiles) {
        projectile.update(deltaSeconds);
        if (!projectile.alive) {
          continue;
        }
        for (const brick of this.bricks) {
          if (!brick.alive || !projectile.intersects(brick)) {
            continue;
          }
          projectile.alive = false;
          this.destroyBrick(brick);
          break;
        }
        if (this.state !== "playing" && this.state !== "ready") {
          break;
        }
      }
      this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
    }

    fireProjectiles() {
      if (
        !this.effectManager.isActive("shooting")
        || (this.state !== "playing" && this.state !== "ready")
        || this.shotCooldown > 0
      ) {
        return false;
      }

      this.projectiles.push(
        new root.Projectile(this.paddle.x + 12, this.paddle.y),
        new root.Projectile(this.paddle.x + this.paddle.width - 12, this.paddle.y),
      );
      this.shotCooldown = 0.22;
      this.audioManager.play("fire");
      this.vibrationManager.pulse(6);
      return true;
    }

    applyEffect(effectId) {
      const definition = root.EffectCatalog.get(effectId);
      if (!definition) {
        return false;
      }
      this.audioManager.play(definition.type);
      this.vibrationManager.pulse(definition.type === "prize" ? 14 : [18, 24, 18]);

      if (definition.behavior.kind === "multiball") {
        const levelBallLimit = Math.min(
          MAX_BALLS,
          this.levelManager.current.maxBalls || MAX_BALLS,
        );
        this.fallingObjectSystem.splitBalls(this.balls, root.NeonBall, levelBallLimit);
        for (const ball of this.balls) {
          ball.follow(this.paddle);
        }
        this.updateLaunchHint();
        this.updateEffectsHud(true);
        this.announceEffect(`${definition.name} activada.`);
        return "instant";
      }

      const handlers = this.effectHandlers(definition);
      const result = this.effectManager.activate(effectId, definition.duration, {
        incompatible: definition.incompatible,
        exclusiveGroup: definition.exclusiveGroup,
        onStart: handlers.apply,
        onRenew: handlers.apply,
        onExpire: () => {
          handlers.expire();
          if (!this.clearingEffects) {
            this.announceEffect(`${definition.name} terminó.`);
          }
        },
      });
      this.updateEffectsHud(true);
      this.announceEffect(
        `${definition.name} ${result === "renewed" ? "renovada" : "activada"}.`,
      );
      return result;
    }

    effectHandlers(definition) {
      const behavior = definition?.behavior || {};
      const strategies = {
        sticky: () => ({
          apply: () => {},
          expire: () => {
            if (!this.clearingEffects && this.state === "playing") {
              this.launchAttachedBalls();
            }
          },
        }),
        "paddle-width": () => ({
          apply: () => this.paddle.setWidth(behavior.width),
          expire: () => this.paddle.setWidth(this.paddle.baseWidth),
        }),
        shooting: () => ({
          apply: () => {
            this.fireButton.hidden = false;
            this.fireButton.disabled = false;
          },
          expire: () => {
            this.fireButton.hidden = true;
            this.fireButton.disabled = true;
            this.projectiles = [];
          },
        }),
        "ball-speed": () => ({
          apply: () => this.setBallSpeedMultiplier(behavior.multiplier),
          expire: () => this.setBallSpeedMultiplier(1),
        }),
        "inverted-controls": () => ({
          apply: () => this.inputManager.setInverted(true),
          expire: () => this.inputManager.setInverted(false),
        }),
        darkness: () => ({ apply: () => {}, expire: () => {} }),
        "slippery-paddle": () => ({
          apply: () => this.paddle.setSlippery(true),
          expire: () => this.paddle.setSlippery(false),
        }),
      };
      const createHandlers = strategies[behavior.kind];
      if (!createHandlers) {
        throw new Error(
          `El efecto "${definition?.id || "desconocido"}" no tiene estrategia válida.`,
        );
      }
      return createHandlers();
    }

    announceEffect(message) {
      if (this.effectAnnouncements) {
        this.effectAnnouncements.textContent = message;
      }
    }

    setBallSpeedMultiplier(multiplier) {
      this.ballSpeedMultiplier = multiplier;
      for (const ball of this.balls) {
        ball.setSpeed(this.baseBallSpeed * multiplier);
      }
    }

    clearLevelEffects() {
      this.clearingEffects = true;
      this.effectManager.clear();
      this.clearingEffects = false;
      this.fallingObjectSystem.clear();
      this.projectiles = [];
      this.shotCooldown = 0;
      this.ballSpeedMultiplier = 1;
      this.paddle.restoreDefaults();
      this.inputManager?.setInverted(false);
      this.fireButton.hidden = true;
      this.fireButton.disabled = true;
      this.updateEffectsHud(true);
    }

    loseLife() {
      this.lives -= 1;
      this.audioManager.play("life");
      this.vibrationManager.pulse([35, 30, 35]);
      this.updateHud();
      if (this.lives <= 0) {
        this.clearLevelEffects();
        this.state = "gameOver";
        this.saveProgress({
          lastGame: {
            levelIndex: this.levelIndex,
            score: 0,
            lives: 3,
          },
        });
        this.pauseButton.disabled = true;
        this.launchHint.hidden = true;
        this.gameLoop.stop();
        this.showGameOverMenu();
        return;
      }

      this.paddle.reset();
      this.balls = [this.createBall(true)];
      this.state = "ready";
      this.updateLaunchHint();
      this.updateEffectsHud(true);
      this.saveProgress();
    }

    completeLevel() {
      this.clearLevelEffects();
      this.audioManager.play("complete");
      this.vibrationManager.pulse([20, 35, 20, 35, 30]);
      this.launchHint.hidden = true;
      this.pauseButton.disabled = true;
      this.gameLoop.stop();
      if (this.levelManager.isLast) {
        this.state = "finished";
        this.progress.maxUnlockedLevel = this.levelManager.total;
        this.saveProgress({ lastGame: null });
        this.showOverlay(
          "FASE 1 COMPLETADA",
          "¡BIEN HECHO!",
          `Superaste los ${this.levelManager.total} niveles con `
            + `${this.score.toString().padStart(6, "0")} puntos.`,
          "JUGAR DE NUEVO",
        );
        return;
      }

      this.state = "levelComplete";
      const nextLevelIndex = Math.min(this.levelManager.total - 1, this.levelIndex + 1);
      this.progress.maxUnlockedLevel = Math.max(
        this.progress.maxUnlockedLevel,
        nextLevelIndex + 1,
      );
      this.saveProgress({
        lastGame: {
          levelIndex: nextLevelIndex,
          score: this.score,
          lives: this.lives,
        },
      });
      this.showOverlay(
        `NIVEL ${this.levelIndex + 1}`,
        "COMPLETADO",
        `Puntuación: ${this.score.toString().padStart(6, "0")}`,
        "SIGUIENTE NIVEL",
      );
    }

    updateEffectsHud(force = false) {
      const active = this.effectManager.activeEffects()
        .map((effect) => ({
          ...effect,
          definition: root.EffectCatalog.get(effect.id),
        }))
        .filter((effect) => effect.definition);
      const signature = active
        .map((effect) => `${effect.id}:${Math.ceil(effect.remaining)}`)
        .join("|");

      if (force || signature !== this.effectHudSignature) {
        this.effectHudSignature = signature;
        this.effectsPanel.textContent = active
          .map((effect) => (
            `${effect.definition.icon} ${effect.definition.name} ${Math.ceil(effect.remaining)}s`
          ))
          .join(" · ");
        this.effectsPanel.hidden = active.length === 0;
      }

      if (this.debugStatus) {
        const debugSignature = (
          `${this.balls.length}:${this.fallingObjectSystem.items.length}:`
          + `${this.projectiles.length}:${Math.round(this.gameLoop.fps)}`
        );
        if (!force && debugSignature === this.debugHudSignature) {
          return;
        }
        this.debugHudSignature = debugSignature;
        this.debugStatus.textContent = (
          `Bolas: ${this.balls.length} · Objetos: ${this.fallingObjectSystem.items.length}`
          + ` · Proyectiles: ${this.projectiles.length}`
          + ` · FPS: ${Math.round(this.gameLoop.fps)}`
        );
      }
    }

    showOverlay(eyebrow, title, message, buttonText) {
      this.overlay.classList.remove("screen-overlay--pause");
      this.overlayPanel.classList.remove("panel--pause");
      this.overlayButton.hidden = false;
      this.restartLevelButton.hidden = true;
      this.chooseLevelButton.hidden = true;
      this.backToPauseButton.hidden = true;
      this.levelSelector.hidden = true;
      this.levelGrid.replaceChildren();
      this.overlayEyebrow.textContent = eyebrow;
      const isLongSingleWord = !title.includes(" ") && Array.from(title).length > 8;
      this.overlayTitle.classList.toggle("panel-title--compact", isLongSingleWord);
      this.overlayTitle.innerHTML = title.replace(" ", "<br>");
      this.overlayMessage.textContent = message;
      this.overlayButton.textContent = buttonText;
      this.overlay.hidden = false;
      this.setOverlayIsolation(true);
      this.overlayButton.focus({ preventScroll: true });
    }

    showPauseMenu() {
      const level = this.levelIndex + 1;
      const score = this.score.toString().padStart(6, "0");
      this.showOverlay(
        "PARTIDA EN PAUSA",
        "PAUSA",
        `Nivel ${level} · ${this.lives} vidas · ${score} puntos`,
        "CONTINUAR",
      );
      this.overlay.classList.add("screen-overlay--pause");
      this.overlayPanel.classList.add("panel--pause");
      this.restartLevelButton.hidden = false;
      this.chooseLevelButton.hidden = false;
    }

    showGameOverMenu() {
      this.showOverlay(
        "SIN VIDAS",
        "GAME OVER",
        `Puntuación final: ${this.score.toString().padStart(6, "0")}`,
        "CONTINUAR NIVEL",
      );
      this.chooseLevelButton.hidden = false;
    }

    showLevelSelector() {
      if (this.state !== "paused" && this.state !== "gameOver") {
        return false;
      }
      const available = this.selectableLevelIndices();
      this.levelSelectorReturnState = this.state;
      this.overlayEyebrow.textContent = this.state === "paused"
        ? "PARTIDA EN PAUSA"
        : "SIN VIDAS";
      this.overlayTitle.textContent = "ELEGIR NIVEL";
      this.overlayTitle.classList.add("panel-title--compact");
      this.overlayMessage.textContent = `Nivel actual: ${this.levelIndex + 1}`;
      this.overlayButton.hidden = true;
      this.restartLevelButton.hidden = true;
      this.chooseLevelButton.hidden = true;
      this.backToPauseButton.hidden = false;
      this.levelSelector.hidden = false;
      this.levelSelectorStatus.textContent = "Niveles disponibles";
      this.levelGrid.replaceChildren(...available.map((index) => {
        const button = root.document.createElement("button");
        button.type = "button";
        button.className = "level-select-button";
        if (index === this.levelIndex) {
          button.classList.add("level-select-button--current");
          button.setAttribute("aria-current", "true");
        }
        button.dataset.levelIndex = String(index);
        button.setAttribute("role", "listitem");
        button.setAttribute("aria-label", `Jugar nivel ${index + 1}`);
        button.textContent = `NIVEL ${index + 1}`;
        return button;
      }));
      this.levelGrid.querySelector("button")?.focus({ preventScroll: true });
      return true;
    }

    returnFromLevelSelector() {
      if (this.levelSelectorReturnState === "gameOver") {
        this.showGameOverMenu();
      } else {
        this.showPauseMenu();
      }
      this.levelSelectorReturnState = null;
    }

    hideOverlay() {
      this.overlay.hidden = true;
      this.overlay.classList.remove("screen-overlay--pause");
      this.overlayPanel.classList.remove("panel--pause");
      this.restartLevelButton.hidden = true;
      this.chooseLevelButton.hidden = true;
      this.backToPauseButton.hidden = true;
      this.levelSelector.hidden = true;
      this.levelGrid.replaceChildren();
      this.setOverlayIsolation(false);
    }

    updateHud() {
      this.scoreElement.textContent = this.score.toString().padStart(6, "0");
      this.levelElement.textContent = `${this.levelIndex + 1} / ${this.levelManager.total}`;
      this.livesElement.textContent = Array.from({ length: Math.max(this.lives, 0) }, () => "♥").join(" ");
      this.livesElement.setAttribute("aria-label", `${this.lives} vidas`);
    }

    render() {
      const context = this.context;
      const { dpr, scale, offsetX, offsetY } = this.view;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "#020916";
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);

      this.drawBackground(context);
      this.drawBricks(context);
      this.drawFallingItems(context);
      this.drawProjectiles(context);
      this.drawPaddle(context);
      if (this.effectManager.isActive("darkness")) {
        this.drawDarkness(context);
      }
      this.drawBalls(context);
    }

    drawBackground(context) {
      context.drawImage(this.backgroundLayer, 0, 0);
    }

    createBackgroundLayer() {
      const layer = root.document.createElement("canvas");
      layer.width = WORLD_WIDTH;
      layer.height = WORLD_HEIGHT;
      const context = layer.getContext("2d", { alpha: false });
      const gradient = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      gradient.addColorStop(0, "#0b2a52");
      gradient.addColorStop(0.48, "#071a37");
      gradient.addColorStop(1, "#030b1c");
      context.fillStyle = gradient;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      context.strokeStyle = "rgba(72, 187, 255, 0.055)";
      context.lineWidth = 1;
      for (let y = 0; y < WORLD_HEIGHT; y += 24) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(WORLD_WIDTH, y + 0.5);
        context.stroke();
      }

      const glow = context.createRadialGradient(180, 310, 10, 180, 310, 230);
      glow.addColorStop(0, "rgba(17, 95, 174, 0.17)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      return layer;
    }

    drawBricks(context) {
      const typeLabels = {
        reinforced: "2",
        armored: "3",
        indestructible: "X",
        explosive: "E",
        moving: "M",
        regenerative: "G",
        surprise: "?",
        boss: "B",
      };
      context.save();
      for (const brick of this.bricks) {
        if (!brick.alive) {
          continue;
        }
        context.fillStyle = brick.color;
        context.fillRect(brick.x, brick.y, brick.width, brick.height);
        context.fillStyle = "rgba(255,255,255,0.28)";
        context.fillRect(brick.x + 1, brick.y + 1, brick.width - 2, 3);
        context.fillStyle = "rgba(0,0,0,0.22)";
        context.fillRect(
          brick.x + 1,
          brick.y + brick.height - 4,
          brick.width - 2,
          3,
        );
        context.strokeStyle = "rgba(255,255,255,0.36)";
        if (brick.type === "boss") {
          context.strokeStyle = ["#ffffff", "#ffe25f", "#ff5c9a"][brick.phase - 1] || "#ffffff";
          context.lineWidth = 2;
        } else {
          context.lineWidth = 1;
        }
        context.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.width - 1, brick.height - 1);
        const label = typeLabels[brick.type];
        if (label) {
          const remaining = brick.maxHitPoints > 1 && brick.breakable
            ? `${label}${brick.hitPoints}`
            : label;
          context.fillStyle = "#ffffff";
          context.font = "bold 9px Courier New";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(
            remaining,
            brick.x + brick.width / 2,
            brick.y + brick.height / 2 + 1,
          );
        }
      }
      context.restore();
    }

    drawFallingItems(context) {
      for (const item of this.fallingObjectSystem.items) {
        const isPrize = item.definition.type === "prize";
        context.save();
        context.shadowColor = isPrize ? "#4fffd0" : "#ff4d83";
        context.shadowBlur = 10;
        context.fillStyle = isPrize ? "#0f8f84" : "#8d1747";
        context.beginPath();
        context.roundRect(item.x, item.y, item.width, item.height, 6);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = isPrize ? "#a8ffe8" : "#ffc0d5";
        context.strokeRect(item.x + 0.5, item.y + 0.5, item.width - 1, item.height - 1);
        context.fillStyle = "#ffffff";
        context.font = "bold 12px Courier New";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          `${isPrize ? "+" : "!"}${item.definition.icon}`,
          item.x + item.width / 2,
          item.y + item.height / 2 + 1,
        );
        context.restore();
      }
    }

    drawProjectiles(context) {
      context.save();
      context.fillStyle = "#ffe968";
      context.shadowColor = "#ff447f";
      context.shadowBlur = 9;
      for (const projectile of this.projectiles) {
        context.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
      }
      context.restore();
    }

    drawPaddle(context) {
      context.save();
      context.shadowColor = "#1ecfff";
      context.shadowBlur = 12;
      const gradient = context.createLinearGradient(
        this.paddle.x,
        this.paddle.y,
        this.paddle.x,
        this.paddle.y + this.paddle.height,
      );
      gradient.addColorStop(0, "#e8f7ff");
      gradient.addColorStop(0.35, "#65c8e7");
      gradient.addColorStop(1, "#185878");
      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 7);
      context.fill();
      context.shadowBlur = 4;
      context.fillStyle = "#ff397f";
      context.beginPath();
      context.arc(this.paddle.x + 9, this.paddle.y + 7, 5, 0, Math.PI * 2);
      context.arc(this.paddle.x + this.paddle.width - 9, this.paddle.y + 7, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    drawDarkness(context) {
      context.save();
      context.fillStyle = "rgba(0, 2, 12, 0.74)";
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      context.restore();
    }

    drawBalls(context) {
      for (const ball of this.balls) {
        context.save();
        context.shadowColor = "#8ef4ff";
        context.shadowBlur = 14;
        context.fillStyle = "#eaffff";
        context.beginPath();
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = "#68dff4";
        context.beginPath();
        context.arc(ball.x - 2, ball.y - 2, ball.radius * 0.42, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

  }

  root.NeonBreakerGame = NeonBreakerGame;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = NeonBreakerGame;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
