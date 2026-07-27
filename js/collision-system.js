(function exposeCollisionSystem(root) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const IMPACT_EPSILON = 0.0001;
  const MIN_VERTICAL_RATIO = 0.18;

  class CollisionSystem {
    circleRect(circle, rect) {
      const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
      const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
      const deltaX = circle.x - closestX;
      const deltaY = circle.y - closestY;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;

      if (distanceSquared > circle.radius * circle.radius) {
        return null;
      }

      if (distanceSquared > 0.000001) {
        const distance = Math.sqrt(distanceSquared);
        return {
          normalX: deltaX / distance,
          normalY: deltaY / distance,
          penetration: circle.radius - distance,
        };
      }

      const distances = [
        { value: circle.x - rect.x, normalX: -1, normalY: 0 },
        { value: rect.x + rect.width - circle.x, normalX: 1, normalY: 0 },
        { value: circle.y - rect.y, normalX: 0, normalY: -1 },
        { value: rect.y + rect.height - circle.y, normalX: 0, normalY: 1 },
      ];
      distances.sort((a, b) => a.value - b.value);

      return {
        normalX: distances[0].normalX,
        normalY: distances[0].normalY,
        penetration: circle.radius + distances[0].value,
      };
    }

    reflect(ball, normalX, normalY) {
      const projection = ball.vx * normalX + ball.vy * normalY;
      if (projection >= -IMPACT_EPSILON) {
        return false;
      }
      ball.vx -= 2 * projection * normalX;
      ball.vy -= 2 * projection * normalY;
      return true;
    }

    ensureVerticalVelocity(ball, preferredDirection = 0) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (!Number.isFinite(speed) || speed < 0.0001) {
        return false;
      }

      const minimumVertical = speed * MIN_VERTICAL_RATIO;
      if (Math.abs(ball.vy) >= minimumVertical) {
        return false;
      }

      const direction = Math.sign(preferredDirection)
        || Math.sign(ball.vy)
        || -1;
      ball.vy = direction * minimumVertical;
      ball.vx = Math.sign(ball.vx || 1) * Math.sqrt(
        Math.max(0, speed * speed - ball.vy * ball.vy),
      );
      return true;
    }

    paddleBounce(ballSpeed, impactRatio) {
      const safeSpeed = clamp(Number.isFinite(ballSpeed) ? ballSpeed : 260, 180, 520);
      const ratio = clamp(impactRatio, -1, 1);
      const maxAngle = (65 * Math.PI) / 180;
      const angle = ratio * maxAngle;

      return {
        vx: Math.sin(angle) * safeSpeed,
        vy: -Math.cos(angle) * safeSpeed,
      };
    }

    resolveWalls(ball, worldWidth) {
      let collided = false;
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
        collided = true;
      } else if (ball.x + ball.radius > worldWidth) {
        ball.x = worldWidth - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        collided = true;
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
        collided = true;
      }
      return collided;
    }

    resolvePaddle(ball, paddle) {
      if (ball.vy <= 0) {
        return false;
      }

      const collision = this.circleRect(ball, paddle);
      if (!collision || collision.normalY > -0.5 || ball.y > paddle.y) {
        return false;
      }
      ball.y = paddle.y - ball.radius - 0.1;
      const paddleCenter = paddle.x + paddle.width / 2;
      const impactRatio = (ball.x - paddleCenter) / (paddle.width / 2);
      const bounce = this.paddleBounce(ball.speed, impactRatio);
      ball.vx = bounce.vx;
      ball.vy = bounce.vy;
      this.ensureVerticalVelocity(ball, -1);
      return true;
    }

    resolveBrick(ball, brick) {
      const collision = this.circleRect(ball, brick);
      if (!collision) {
        return false;
      }

      ball.x += collision.normalX * (collision.penetration + 0.1);
      ball.y += collision.normalY * (collision.penetration + 0.1);
      if (!this.reflect(ball, collision.normalX, collision.normalY)) {
        return false;
      }
      this.ensureVerticalVelocity(ball, collision.normalY);
      return true;
    }
  }

  root.CollisionSystem = CollisionSystem;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = CollisionSystem;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
