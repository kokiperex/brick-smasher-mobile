(function startApplication() {
  "use strict";

  function registerOfflineSupport() {
    const isLocalhost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      window.location.hostname,
    );
    if (!("serviceWorker" in navigator) || (
      window.location.protocol !== "https:" && !isLocalhost
    )) {
      // Los navegadores no permiten service workers cuando se abre desde file://.
      return;
    }

    const currentScriptUrl = document.currentScript?.src
      || new URL("./js/main.js", window.location.href).href;
    const workerUrl = new URL("../service-worker.js", currentScriptUrl);
    const scopeUrl = new URL("./", workerUrl);

    window.addEventListener("load", () => {
      navigator.serviceWorker.register(workerUrl.href, {
        scope: scopeUrl.href,
        updateViaCache: "none",
      }).catch(() => {
        // La partida sigue funcionando aunque el navegador no permita PWA.
      });
    }, { once: true });
  }

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
    overlayPanel: document.getElementById("overlayPanel"),
    overlayEyebrow: document.getElementById("overlayEyebrow"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayMessage: document.getElementById("overlayMessage"),
    overlayButton: document.getElementById("overlayButton"),
    restartLevelButton: document.getElementById("restartLevelButton"),
    chooseLevelButton: document.getElementById("chooseLevelButton"),
    backToPauseButton: document.getElementById("backToPauseButton"),
    levelSelector: document.getElementById("levelSelector"),
    levelSelectorStatus: document.getElementById("levelSelectorStatus"),
    levelGrid: document.getElementById("levelGrid"),
    launchHint: document.getElementById("launchHint"),
    effectsPanel: document.getElementById("effectsPanel"),
    effectAnnouncements: document.getElementById("effectAnnouncements"),
    fireButton: document.getElementById("fireButton"),
    debugPanel: document.getElementById("debugPanel"),
    debugButtons: document.getElementById("debugButtons"),
    debugStatus: document.getElementById("debugStatus"),
    orientationLock: document.getElementById("mobileOrientationLock"),
  };

  window.neonBreaker?.destroy?.();
  window.neonBreaker = new window.NeonBreakerGame(elements);
  window.neonBreakerOrientation?.destroy?.();
  window.neonBreakerOrientation = new window.OrientationManager({
    game: window.neonBreaker,
    element: elements.orientationLock,
  });
  registerOfflineSupport();
})();
