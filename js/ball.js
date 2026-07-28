(function exposeBall(root) {
  "use strict";

  class Ball {
    constructor() {
      this.radius = 9;
      this.speed = 260;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.attached = true;
      this.attachmentOffset = 0;
    }

    attachTo(paddle, impactRatio = 0) {
      this.attached = true;
      this.vx = 0;
      this.vy = 0;
      this.attachmentOffset = Math.max(-0.85, Math.min(0.85, impactRatio));
      this.x = paddle.x + paddle.width / 2 + this.attachmentOffset * paddle.width * 0.4;
      this.y = paddle.y - this.radius - 2;
    }

    follow(paddle) {
      if (this.attached) {
        this.x = paddle.x + paddle.width / 2 + this.attachmentOffset * paddle.width * 0.4;
        this.y = paddle.y - this.radius - 2;
      }
    }

    launch() {
      if (!this.attached) {
        return false;
      }
      const direction = this.attachmentOffset === 0
        ? (Math.random() < 0.5 ? -1 : 1)
        : Math.sign(this.attachmentOffset);
      const angle = direction * (22 * Math.PI) / 180;
      this.vx = Math.sin(angle) * this.speed;
      this.vy = -Math.cos(angle) * this.speed;
      this.attached = false;
      return true;
    }

    setSpeed(nextSpeed) {
      const safeSpeed = Math.max(180, Math.min(520, nextSpeed));
      const currentSpeed = Math.hypot(this.vx, this.vy);
      this.speed = safeSpeed;
      if (!this.attached && currentSpeed > 0.0001) {
        const scale = safeSpeed / currentSpeed;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    cloneWithAngle(BallType, angleDegrees) {
      const clone = new BallType();
      clone.radius = this.radius;
      clone.speed = this.speed;
      clone.x = this.x;
      clone.y = this.y;
      clone.attached = this.attached;
      clone.attachmentOffset = this.attached
        ? Math.max(-0.75, Math.min(0.75, angleDegrees / 35))
        : -this.attachmentOffset;

      if (this.attached) {
        clone.vx = 0;
        clone.vy = 0;
        return clone;
      }

      const angle = (angleDegrees * Math.PI) / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      clone.vx = this.vx * cosine - this.vy * sine;
      clone.vy = this.vx * sine + this.vy * cosine;
      clone.setSpeed(this.speed);
      return clone;
    }
  }

  root.NeonBall = Ball;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Ball;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
