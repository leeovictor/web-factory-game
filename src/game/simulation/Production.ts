import type { Grid } from '../core/Grid.ts'
import type { BuildingInstance, MinerState, FurnaceState } from '../entities/Building.ts'
import { createItem } from '../entities/Item.ts'
import { eventBus } from '../../eventBus.ts'
import { MINER_INTERVAL, FURNACE_TIME } from '../../constants.ts'
import { opposite } from '../core/Direction.ts'

export function updateMiner(b: BuildingInstance, grid: Grid, dt: number): void {
  const state = b.miner as MinerState
  if (state.internal === null) {
    state.cooldown -= dt
    if (state.cooldown <= 0) {
      state.internal = createItem('iron_ore', { x: b.x, y: b.y }, opposite(b.direction))
      state.cooldown += MINER_INTERVAL
    }
  }
  if (state.internal !== null) {
    const out = grid.buildingAhead(b.x, b.y, b.direction)
    if (out && out.kind === 'belt' && out.belt && out.belt.item === null) {
      const item = state.internal
      out.belt.item = item
      item.onTile = { x: out.x, y: out.y }
      item.pos = 0
      item.prevPos = 0
      item.inputDir = opposite(b.direction)
      state.internal = null
      eventBus.emit('production-event', { kind: 'miner-eject', buildingId: b.id })
    } else if (out && out.kind === 'furnace' && out.furnace && out.furnace.input === null) {
      out.furnace.input = state.internal
      state.internal = null
      eventBus.emit('production-event', { kind: 'miner-eject', buildingId: b.id })
    } else if (out && out.kind === 'storage' && out.storage) {
      out.storage.counts[state.internal.type] += 1
      state.internal = null
      eventBus.emit('production-event', { kind: 'miner-eject', buildingId: b.id })
    }
  }
}

export function updateFurnace(b: BuildingInstance, dt: number): void {
  const state = b.furnace as FurnaceState
  if (state.processing !== null && state.timer <= 0 && state.output === null) {
    const item = state.processing
    item.type = 'iron_bar'
    state.output = item
    state.processing = null
    eventBus.emit('production-event', { kind: 'furnace-output', buildingId: b.id })
  }
  if (state.processing !== null) {
    state.timer -= dt
  }
  if (state.processing === null && state.input !== null) {
    state.processing = state.input
    state.input = null
    state.timer = FURNACE_TIME
  }
}
