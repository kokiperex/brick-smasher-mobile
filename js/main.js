(function startApplication() {
  "use strict";

  const elements = {
    canvas: document.getElementById("gameCanvas"),
    hud: document.querySelector(".hud"),
    stage: document.getElementById("gameStage"),
    score: document.getElementById("scoreValue"),
    level: document.getElementById("levelValue"),
    lives: document.getElementById("livesValue"),
    pauseButton: document.getElementById("pauseButton"),
    settingsButton: document.getElementById("settingsButton"),
    settingsPanel: document.getElementById("settingsPanel"),
    controlModeButton: document.getElementById("controlModeButton"),
    controlModeHelp: document.getElementById("controlModeHelp"),
    soundButton: document.getElementById("soundButton"),
    vibrationButton: document.getElementById("vibrationButton"),
    closeSettingsButton: document.getElementById("closeSettingsButton"),
    overlay: document.getElementById("screenOverlay"),
    overlayEyebrow: document.getElementById("overlayEyebrow"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayMessage: document.getElementById("overlayMessage"),
    overlayButton: document.getElementById("overlayButton"),
    launchHint: document.getElementById("launchHint"),
    effectsPanel: document.getElementById("effectsPanel"),
    effectAnnouncements: document.getElementById("effectAnnouncements"),
    fireButton: document.getElementById("fireButton"),
    debugPanel: document.getElementById("debugPanel"),
    debugButtons: document.getElementById("debugButtons"),
    debugStatus: document.getElementById("debugStatus"),
  };

  window.neonBreaker?.destroy?.();
  window.neonBreaker = new window.NeonBreakerGame(elements);
})();
