/* eslint-disable @typescript-eslint/no-unused-vars */
import type { World } from '../../types';
import { Transform } from '../components/transform';
import { Circle } from '../components/circle';
import { Rect } from '../components/rect';
import { Capsule } from '../components/capsule';
import { Sprite } from '../components/sprite';
import { CanvasCtx } from '../resources/canvas';

export function createRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const [_, t, c] of world.queryComponents(Transform, Circle)) {
      ctx.beginPath();
      if (t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
        if (t.rotation !== 0) ctx.rotate(t.rotation);
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      } else {
        ctx.arc(t.x, t.y, c.radius, 0, Math.PI * 2);
      }
      if (c.fill) {
        ctx.fillStyle = c.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.lineWidth;
        ctx.stroke();
      }
      if (t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1) {
        ctx.restore();
      }
    }

    for (const [_, t, r] of world.queryComponents(Transform, Rect)) {
      const hw = r.width / 2;
      const hh = r.height / 2;
      if (t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
        if (t.rotation !== 0) ctx.rotate(t.rotation);
        if (r.fill) {
          ctx.fillStyle = r.color;
          ctx.fillRect(-hw, -hh, r.width, r.height);
        } else {
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(-hw, -hh, r.width, r.height);
        }
        ctx.restore();
      } else {
        if (r.fill) {
          ctx.fillStyle = r.color;
          ctx.fillRect(t.x - hw, t.y - hh, r.width, r.height);
        } else {
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(t.x - hw, t.y - hh, r.width, r.height);
        }
      }
    }

    for (const [_, t, cap] of world.queryComponents(Transform, Capsule)) {
      const hw = cap.width / 2;
      const radius = hw;
      const rectHeight = cap.height - cap.width;
      const halfRect = rectHeight / 2;

      ctx.beginPath();
      if (t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
        if (t.rotation !== 0) ctx.rotate(t.rotation);
        ctx.moveTo(-hw, -halfRect);
        ctx.arc(0, -halfRect, radius, Math.PI, 0, false);
        ctx.lineTo(hw, halfRect);
        ctx.arc(0, halfRect, radius, 0, Math.PI, false);
        ctx.lineTo(-hw, -halfRect);
        ctx.closePath();
        if (cap.fill) {
          ctx.fillStyle = cap.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = cap.color;
          ctx.lineWidth = cap.lineWidth;
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.moveTo(t.x - hw, t.y - halfRect);
        ctx.arc(t.x, t.y - halfRect, radius, Math.PI, 0, false);
        ctx.lineTo(t.x + hw, t.y + halfRect);
        ctx.arc(t.x, t.y + halfRect, radius, 0, Math.PI, false);
        ctx.lineTo(t.x - hw, t.y - halfRect);
        ctx.closePath();
        if (cap.fill) {
          ctx.fillStyle = cap.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = cap.color;
          ctx.lineWidth = cap.lineWidth;
          ctx.stroke();
        }
      }
    }

    for (const [_, t, s] of world.queryComponents(Transform, Sprite)) {
      if (!s.image) continue;
      if (t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
        if (t.rotation !== 0) ctx.rotate(t.rotation);
        if (s.alpha !== 1) ctx.globalAlpha = s.alpha;
        ctx.drawImage(s.image, -s.image.naturalWidth / 2, -s.image.naturalHeight / 2);
        ctx.restore();
      } else {
        if (s.alpha !== 1) ctx.globalAlpha = s.alpha;
        ctx.drawImage(s.image, t.x - s.image.naturalWidth / 2, t.y - s.image.naturalHeight / 2);
        if (s.alpha !== 1) ctx.globalAlpha = 1;
      }
    }
  };
}
