import type { World } from '../../types';
import { Transform } from '../components/transform';
import { Collider } from '../components/collider';
import { defineResource } from '../../resource';

export interface CollisionPair {
  entityA: number;
  entityB: number;
  normalX: number;
  normalY: number;
  penetration: number;
}

export const CollisionPairs = defineResource('CollisionPairs', {
  pairs: [] as CollisionPair[],
});

function testCircleCircle(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): { normalX: number; normalY: number; penetration: number } | null {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const sumR = ar + br;
  if (distSq >= sumR * sumR) return null;
  const dist = Math.sqrt(distSq);
  if (dist === 0) return { normalX: 1, normalY: 0, penetration: sumR };
  const invDist = 1 / dist;
  return {
    normalX: dx * invDist,
    normalY: dy * invDist,
    penetration: sumR - dist,
  };
}

function testRectRect(
  ax: number, ay: number, ahw: number, ahh: number,
  bx: number, by: number, bhw: number, bhh: number,
): { normalX: number; normalY: number; penetration: number } | null {
  const dx = bx - ax;
  const dy = by - ay;
  const overlapX = (ahw + bhw) - Math.abs(dx);
  const overlapY = (ahh + bhh) - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return null;
  if (overlapX < overlapY) {
    return { normalX: dx > 0 ? 1 : -1, normalY: 0, penetration: overlapX };
  }
  return { normalX: 0, normalY: dy > 0 ? 1 : -1, penetration: overlapY };
}

function testCircleRect(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rhw: number, rhh: number,
): { normalX: number; normalY: number; penetration: number } | null {
  const closestX = Math.max(rx - rhw, Math.min(cx, rx + rhw));
  const closestY = Math.max(ry - rhh, Math.min(cy, ry + rhh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= cr * cr) return null;

  const dist = Math.sqrt(distSq);

  if (dist === 0) {
    const dxRight = (rx + rhw) - cx;
    const dxLeft = cx - (rx - rhw);
    const dyBottom = (ry + rhh) - cy;
    const dyTop = cy - (ry - rhh);

    const minDx = Math.min(dxRight, dxLeft);
    const minDy = Math.min(dyBottom, dyTop);

    if (minDx < minDy) {
      return {
        normalX: dxRight < dxLeft ? 1 : -1,
        normalY: 0,
        penetration: minDx + cr,
      };
    }
    return {
      normalX: 0,
      normalY: dyBottom < dyTop ? 1 : -1,
      penetration: minDy + cr,
    };
  }

  const invDist = 1 / dist;
  return {
    normalX: dx * invDist,
    normalY: dy * invDist,
    penetration: cr - dist,
  };
}

const CELL_SIZE = 200;
const INV_CELL_SIZE = 1 / CELL_SIZE;
const HALF = 0.5;

function cellKey(cx: number, cy: number): number {
  return cx * 1000000 + cy;
}

function getHalfExtents(c: { shape: string; radius: number; width: number; height: number }): [number, number] {
  if (c.shape === 'circle') return [c.radius, c.radius];
  return [c.width * HALF, c.height * HALF];
}

function pairKey(a: number, b: number): number {
  return a < b ? a * 100000 + b : b * 100000 + a;
}

export function createCollisionSystem() {
  return (world: World) => {
    const collisionPairs = world.getResource(CollisionPairs);
    collisionPairs.pairs.length = 0;

    const entities: {
      entity: number;
      x: number;
      y: number;
      shape: string;
      radius: number;
      width: number;
      height: number;
    }[] = [];

    for (const [entity, t, c] of world.queryComponents(Transform, Collider)) {
      entities.push({
        entity,
        x: t.x + c.offsetX,
        y: t.y + c.offsetY,
        shape: c.shape,
        radius: c.radius,
        width: c.width,
        height: c.height,
      });
    }

    const grid = new Map<number, number[]>();
    const touched: number[] = [];
    const touchedSet = new Set<number>();

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const [halfW, halfH] = getHalfExtents(e);
      const minCX = Math.floor((e.x - halfW) * INV_CELL_SIZE);
      const maxCX = Math.floor((e.x + halfW) * INV_CELL_SIZE);
      const minCY = Math.floor((e.y - halfH) * INV_CELL_SIZE);
      const maxCY = Math.floor((e.y + halfH) * INV_CELL_SIZE);

      for (let cy = minCY; cy <= maxCY; cy++) {
        for (let cx = minCX; cx <= maxCX; cx++) {
          const key = cellKey(cx, cy);
          let cell = grid.get(key);
          if (!cell) {
            cell = [];
            grid.set(key, cell);
          }
          cell.push(i);
          if (!touchedSet.has(key)) {
            touchedSet.add(key);
            touched.push(key);
          }
        }
      }
    }

    const tested = new Set<number>();

    for (const key of touched) {
      const cell = grid.get(key)!;
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          const idxA = cell[i];
          const idxB = cell[j];
          const pk = pairKey(idxA, idxB);
          if (tested.has(pk)) continue;
          tested.add(pk);

          const a = entities[idxA];
          const b = entities[idxB];
          let result: { normalX: number; normalY: number; penetration: number } | null;

          if (a.shape === 'circle' && b.shape === 'circle') {
            result = testCircleCircle(a.x, a.y, a.radius, b.x, b.y, b.radius);
          } else if (a.shape === 'rect' && b.shape === 'rect') {
            result = testRectRect(
              a.x, a.y, a.width * HALF, a.height * HALF,
              b.x, b.y, b.width * HALF, b.height * HALF,
            );
          } else if (a.shape === 'circle' && b.shape === 'rect') {
            result = testCircleRect(a.x, a.y, a.radius, b.x, b.y, b.width * HALF, b.height * HALF);
            if (result) {
              result.normalX = -result.normalX;
              result.normalY = -result.normalY;
            }
          } else {
            result = testCircleRect(b.x, b.y, b.radius, a.x, a.y, a.width * HALF, a.height * HALF);
          }

          if (result) {
            collisionPairs.pairs.push({
              entityA: a.entity,
              entityB: b.entity,
              normalX: result.normalX,
              normalY: result.normalY,
              penetration: result.penetration,
            });
          }
        }
      }
    }
  };
}
