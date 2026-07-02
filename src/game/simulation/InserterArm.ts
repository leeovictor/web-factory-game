import type { Grid } from '../core/Grid.ts'
import type { BuildingInstance, InserterState } from '../entities/Building.ts'
import { eventBus } from '../../eventBus.ts'
import { T_SWING } from '../../constants.ts'
import type { Direction, Item } from '../../types.ts'

export function updateInserter(b: BuildingInstance, grid: Grid, dt: number): void {
  const s = b.inserter as InserterState
  const source = grid.buildingAhead(b.x, b.y, b.direction)
  const dest = grid.buildingAhead(b.x, b.y, opposite(b.direction))

  switch (s.mode) {
    case 'waiting_for_cargo': {
      const item = takeFrom(source)
      if (item) {
        s.holding = item
        s.mode = 'transporting'
        s.phase = 0
        eventBus.emit('production-event', { kind: 'inserter-pick', buildingId: b.id })
      }
      break
    }
    case 'transporting': {
      s.phase += dt / T_SWING
      if (s.phase >= 1) {
        s.phase = 1
        if (placeTo(dest, b.direction, s.holding!)) {
          s.holding = null
          s.mode = 'returning'
          s.phase = 0
          eventBus.emit('production-event', { kind: 'inserter-place', buildingId: b.id })
        } else {
          s.mode = 'product_overflow'
        }
      }
      break
    }
    case 'returning': {
      s.phase += dt / T_SWING
      if (s.phase >= 1) {
        s.phase = 1
        s.mode = 'waiting_for_cargo'
      }
      break
    }
    case 'product_overflow': {
      if (placeTo(dest, b.direction, s.holding!)) {
        s.holding = null
        s.mode = 'returning'
        s.phase = 0
        eventBus.emit('production-event', { kind: 'inserter-place', buildingId: b.id })
      }
      break
    }
  }
}

function takeFrom(b: BuildingInstance | undefined): Item | null {
  if (!b) return null
  if (b.kind === 'belt' && b.belt && b.belt.item !== null) {
    const item = b.belt.item
    b.belt.item = null
    return item
  }
  if (b.kind === 'furnace' && b.furnace && b.furnace.output !== null) {
    const item = b.furnace.output
    b.furnace.output = null
    return item
  }
  return null
}

function placeTo(b: BuildingInstance | undefined, inserterDir: Direction, item: Item): boolean {
  if (!b) return false
  if (b.kind === 'belt' && b.belt && b.belt.item === null) {
    b.belt.item = item
    item.onTile = { x: b.x, y: b.y }
    item.pos = 0
    item.prevPos = 0
    item.inputDir = inserterDir
    return true
  }
  if (b.kind === 'furnace' && b.furnace && b.furnace.input === null && item.type === 'iron_ore') {
    b.furnace.input = item
    return true
  }
  if (b.kind === 'storage' && b.storage) {
    b.storage.counts[item.type] += 1
    return true
  }
  return false
}

function opposite(d: Direction): Direction {
  switch (d) {
    case 'N': return 'S'
    case 'E': return 'W'
    case 'S': return 'N'
    case 'W': return 'E'
  }
}