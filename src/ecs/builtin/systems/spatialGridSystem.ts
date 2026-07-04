import type { World, Entity } from '../../types';
import { Transform } from '../components/transform';
import { SpriteRenderer } from '../components/spriteRenderer';
import type { SpriteVariant } from '../components/spriteRenderer';
import { Static } from '../components/static';
import { SpatialGrid, getCellKey } from '../resources/spatialGrid';

function getEntityHalfExtents(sr: {
  sprite: SpriteVariant;
  radius: number;
  width: number;
  height: number;
  image: HTMLImageElement | null;
}): [number, number] {
  switch (sr.sprite) {
    case 'circle':
      return [sr.radius, sr.radius];
    case 'rect':
    case 'capsule':
      return [sr.width / 2, sr.height / 2];
    case 'sprite':
      if (sr.image) {
        return [sr.image.naturalWidth / 2, sr.image.naturalHeight / 2];
      }
      return [0, 0];
  }
}

export function createSpatialGridSystem() {
  return (world: World) => {
    const grid = world.getResource(SpatialGrid);

    if (!grid.cells) {
      grid.cells = new Map<number, Entity[]>();
    }

    for (const cell of grid.cells.values()) {
      cell.length = 0;
    }

    const touched: number[] = [];
    const touchedSet = new Set<number>();

    for (const [entity, t, sr] of world.queryComponents(Transform, SpriteRenderer).without(Static)) {
      const [halfW, halfH] = getEntityHalfExtents(sr);

      const minCellX = Math.floor((t.x - halfW) / grid.cellSize);
      const maxCellX = Math.floor((t.x + halfW) / grid.cellSize);
      const minCellY = Math.floor((t.y - halfH) / grid.cellSize);
      const maxCellY = Math.floor((t.y + halfH) / grid.cellSize);

      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cx = minCellX; cx <= maxCellX; cx++) {
          const key = getCellKey(cx, cy);
          let cell = grid.cells.get(key);
          if (!cell) {
            cell = [];
            grid.cells.set(key, cell);
          }
          cell.push(entity);
          if (!touchedSet.has(key)) {
            touchedSet.add(key);
            touched.push(key);
          }
        }
      }
    }

    for (const key of grid.cells.keys()) {
      if (!touchedSet.has(key)) {
        grid.cells.delete(key);
      }
    }

    if (grid.needsStaticRebuild) {
      if (!grid.staticCells) {
        grid.staticCells = new Map<number, Entity[]>();
      }

      for (const cell of grid.staticCells.values()) {
        cell.length = 0;
      }

      const staticTouched: number[] = [];
      const staticTouchedSet = new Set<number>();

      for (const [entity, t, sr] of world.queryComponents(Transform, SpriteRenderer).withTag(Static)) {
        const [halfW, halfH] = getEntityHalfExtents(sr);

        const minCellX = Math.floor((t.x - halfW) / grid.cellSize);
        const maxCellX = Math.floor((t.x + halfW) / grid.cellSize);
        const minCellY = Math.floor((t.y - halfH) / grid.cellSize);
        const maxCellY = Math.floor((t.y + halfH) / grid.cellSize);

        for (let cy = minCellY; cy <= maxCellY; cy++) {
          for (let cx = minCellX; cx <= maxCellX; cx++) {
            const key = getCellKey(cx, cy);
            let cell = grid.staticCells!.get(key);
            if (!cell) {
              cell = [];
              grid.staticCells!.set(key, cell);
            }
            cell.push(entity);
            if (!staticTouchedSet.has(key)) {
              staticTouchedSet.add(key);
              staticTouched.push(key);
            }
          }
        }
      }

      for (const key of grid.staticCells!.keys()) {
        if (!staticTouchedSet.has(key)) {
          grid.staticCells!.delete(key);
        }
      }

      grid.needsStaticRebuild = false;
    }
  };
}
