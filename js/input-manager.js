(function exposeInputManager(root) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class InputManager {
    static mapHorizontal(x, worldWidth, inverted) {
      return inverted ? worldWidth - x : x;
    }

    static relativeDelta(deltaX, scale, inverted) {
      const worldDelta = scale > 0 ? deltaX / scale : 0;
      return inverted ? -worldDelta : worldDelta;
    }

    constructor({
      canvas,
      getView,
      worldWidth,
      worldHeight,
      onMove,
      onRelativeMove = () => {},
      onPress,
      mode = "direct",
      eventRoot = root,
    }) {
      this.canvas = canvas;
      this.getView = getView;
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.onMove = onMove;
      this.onRelativeMove = onRelativeMove;
      this.onPress = onPress;
      this.eventRoot = eventRoot;
      this.inverted = false;
      this.mode = "direct";
      this.activePointerId = null;
      this.lastClientX = 0;
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerEnd = this.handlePointerEnd.bind(this);
      this.handleContextMenu = this.handleContextMenu.bind(this);
      this.cancelActivePointer = this.cancelActivePointer.bind(this);
      this.setMode(mode);
      this.bind();
    }

    bind() {
      this.canvas.addEventListener("pointermove", this.handlePointerMove);
      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("pointerup", this.handlePointerEnd);
      this.canvas.addEventListener("pointercancel", this.handlePointerEnd);
      this.canvas.addEventListener("lostpointercapture", this.handlePointerEnd);
      this.canvas.addEventListener("contextmenu", this.handleContextMenu);
      this.eventRoot.addEventListener?.("blur", this.cancelActivePointer);
      this.eventRoot.addEventListener?.("orientationchange", this.cancelActivePointer);
    }

    pointerToWorld(clientX, clientY) {
      const bounds = this.canvas.getBoundingClientRect();
      const view = this.getView();
      if (
        !Number.isFinite(view.scale)
        || view.scale <= 0
        || !Number.isFinite(clientX)
        || !Number.isFinite(clientY)
      ) {
        return null;
      }
      const point = {
        x: clamp((clientX - bounds.left - view.offsetX) / view.scale, 0, this.worldWidth),
        y: clamp((clientY - bounds.top - view.offsetY) / view.scale, 0, this.worldHeight),
      };
      point.x = InputManager.mapHorizontal(point.x, this.worldWidth, this.inverted);
      return point;
    }

    handlePointerMove(event) {
      if (event.pointerType === "touch") {
        event.preventDefault();
      }
      if (this.mode === "relative") {
        if (event.pointerId !== this.activePointerId) {
          return;
        }
        const view = this.getView();
        if (!Number.isFinite(view.scale) || view.scale <= 0) {
          this.cancelActivePointer();
          return;
        }
        const delta = InputManager.relativeDelta(
          event.clientX - this.lastClientX,
          view.scale,
          this.inverted,
        );
        this.lastClientX = event.clientX;
        this.onRelativeMove(delta, event);
        return;
      }
      const point = this.pointerToWorld(event.clientX, event.clientY);
      if (point) {
        this.onMove(point, event);
      }
    }

    handlePointerDown(event) {
      event.preventDefault();
      if (this.activePointerId !== null && this.activePointerId !== event.pointerId) {
        return;
      }
      const point = this.pointerToWorld(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      this.activePointerId = event.pointerId;
      this.lastClientX = event.clientX;
      this.canvas.setPointerCapture?.(event.pointerId);
      if (this.mode === "direct") {
        this.onMove(point, event);
      }
      this.onPress(point, event);
    }

    handlePointerEnd(event) {
      if (event.pointerId === this.activePointerId) {
        if (this.canvas.hasPointerCapture?.(event.pointerId)) {
          this.canvas.releasePointerCapture?.(event.pointerId);
        }
        this.activePointerId = null;
      }
    }

    handleContextMenu(event) {
      event.preventDefault();
    }

    cancelActivePointer() {
      const pointerId = this.activePointerId;
      if (pointerId !== null && this.canvas.hasPointerCapture?.(pointerId)) {
        this.canvas.releasePointerCapture?.(pointerId);
      }
      this.activePointerId = null;
      this.lastClientX = 0;
    }

    setMode(mode) {
      if (mode !== "direct" && mode !== "relative") {
        throw new RangeError(`Modo de control desconocido: ${mode}`);
      }
      this.mode = mode;
      this.cancelActivePointer();
      return this.mode;
    }

    setInverted(enabled) {
      this.inverted = Boolean(enabled);
    }

    destroy() {
      this.cancelActivePointer();
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointerup", this.handlePointerEnd);
      this.canvas.removeEventListener("pointercancel", this.handlePointerEnd);
      this.canvas.removeEventListener("lostpointercapture", this.handlePointerEnd);
      this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
      this.eventRoot.removeEventListener?.("blur", this.cancelActivePointer);
      this.eventRoot.removeEventListener?.("orientationchange", this.cancelActivePointer);
    }
  }

  root.InputManager = InputManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = InputManager;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
