(function exposeVibrationManager(root) {
  "use strict";

  class VibrationManager {
    constructor({
      enabled = true,
      navigatorObject = root.navigator,
    } = {}) {
      this.navigatorObject = navigatorObject || null;
      this.available = typeof this.navigatorObject?.vibrate === "function";
      this.enabled = Boolean(enabled) && this.available;
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled) && this.available;
      return this.enabled;
    }

    pulse(pattern = 10) {
      if (!this.enabled || !this.available) {
        return false;
      }
      return this.navigatorObject.vibrate(pattern);
    }
  }

  root.VibrationManager = VibrationManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = VibrationManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
