(function exposeOrientationManager(root) {
  "use strict";

  class OrientationManager {
    constructor({ game, element, eventRoot = root } = {}) {
      this.game = game;
      this.element = element;
      this.eventRoot = eventRoot;
      this.document = eventRoot.document;
      this.pausedByOrientation = false;
      this.handleChange = this.handleChange.bind(this);
      this.eventRoot.addEventListener?.("resize", this.handleChange);
      this.eventRoot.addEventListener?.("orientationchange", this.handleChange);
      this.update();
    }

    static isMobile(eventRoot = root) {
      const navigatorObject = eventRoot.navigator || {};
      const userAgent = navigatorObject.userAgent || "";
      const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i;
      if (navigatorObject.userAgentData?.mobile === true || mobileUserAgent.test(userAgent)) {
        return true;
      }
      return navigatorObject.maxTouchPoints > 0
        && eventRoot.matchMedia?.("(pointer: coarse)")?.matches === true;
    }

    isBlocked() {
      return OrientationManager.isMobile(this.eventRoot)
        && this.eventRoot.innerWidth > this.eventRoot.innerHeight;
    }

    update() {
      const blocked = this.isBlocked();
      this.document?.documentElement?.classList.toggle("mobile-landscape-blocked", blocked);
      if (this.element) {
        this.element.hidden = !blocked;
        this.element.setAttribute("aria-hidden", String(!blocked));
      }

      if (blocked) {
        if (this.game && (this.game.state === "playing" || this.game.state === "ready")) {
          this.game.pause();
          this.pausedByOrientation = true;
        }
      } else if (this.pausedByOrientation && this.game?.state === "paused") {
        this.pausedByOrientation = false;
        this.game.resume();
      }
      return blocked;
    }

    handleChange() {
      return this.update();
    }

    destroy() {
      this.eventRoot.removeEventListener?.("resize", this.handleChange);
      this.eventRoot.removeEventListener?.("orientationchange", this.handleChange);
      this.document?.documentElement?.classList.remove("mobile-landscape-blocked");
      if (this.element) {
        this.element.hidden = true;
        this.element.setAttribute("aria-hidden", "true");
      }
    }
  }

  root.OrientationManager = OrientationManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = OrientationManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
