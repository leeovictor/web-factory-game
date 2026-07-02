import type { Grid } from '../core/Grid.ts'
import type { BuildingInstance } from '../entities/Building.ts'
import { tickMovers } from './Movers.ts'
import { updateMiner, updateFurnace } from './Production.ts'
import { updateInserter } from './InserterArm.ts'
import { eventBus } from '../../eventBus.ts'
import type { ItemType } from '../../types.ts'

export class Simulation {
  buildings: BuildingInstance[] = []
  private grid: Grid
  private lastStorageCounts: Record<ItemType, number> = { iron_ore: 0, iron_bar: 0 }
  private lastStorageEmitTime = 0
  private storageTimer: ReturnType<typeof setTimeout> | null = null

  constructor(grid: Grid) {
    this.grid = grid
  }

  getStats(): { entityCount: number; itemCount: number } {
    let itemCount = 0
    for (const b of this.buildings) {
      if (b.kind === 'belt' && b.belt?.item) itemCount++
      if (b.kind === 'miner' && b.miner?.internal) itemCount++
      if (b.kind === 'furnace') {
        if (b.furnace?.input) itemCount++
        if (b.furnace?.output) itemCount++
      }
      if (b.kind === 'inserter' && b.inserter?.holding) itemCount++
    }
    return { entityCount: this.buildings.length, itemCount }
  }

  tick(dt: number): void {
    for (const b of this.buildings) {
      if (b.kind === 'miner') updateMiner(b, this.grid, dt)
    }
    for (const b of this.buildings) {
      if (b.kind === 'furnace') updateFurnace(b, dt)
    }
    for (const b of this.buildings) {
      if (b.kind === 'inserter') updateInserter(b, this.grid, dt)
    }
    tickMovers(this.buildings, this.grid, dt)
    for (const b of this.buildings) {
      if (b.kind === 'belt' && b.belt?.item) {
        b.belt.item.prevPos = b.belt.item.pos
      }
    }
    this.emitStorageIfNeeded()
  }

  private aggregateStorage(): Record<ItemType, number> {
    let iron_ore = 0
    let iron_bar = 0
    for (const b of this.buildings) {
      if (b.kind === 'storage' && b.storage) {
        iron_ore += b.storage.counts.iron_ore
        iron_bar += b.storage.counts.iron_bar
      }
    }
    return { iron_ore, iron_bar }
  }

  private emitStorageIfNeeded(): void {
    const counts = this.aggregateStorage()
    const total = counts.iron_ore + counts.iron_bar
    const changed =
      counts.iron_ore !== this.lastStorageCounts.iron_ore ||
      counts.iron_bar !== this.lastStorageCounts.iron_bar

    if (!changed) return

    const now = performance.now()
    const elapsed = now - this.lastStorageEmitTime

    if (elapsed >= 200) {
      this.doEmit(counts, total)
    } else if (!this.storageTimer) {
      const delay = 200 - elapsed
      this.storageTimer = setTimeout(() => {
        this.storageTimer = null
        const fresh = this.aggregateStorage()
        const freshTotal = fresh.iron_ore + fresh.iron_bar
        this.doEmit(fresh, freshTotal)
      }, delay)
    }
  }

  private doEmit(counts: Record<ItemType, number>, total: number): void {
    this.lastStorageEmitTime = performance.now()
    this.lastStorageCounts = { ...counts }
    eventBus.emit('storage-by-type', counts)
    eventBus.emit('storage-count', total)
    if (this.storageTimer) {
      clearTimeout(this.storageTimer)
      this.storageTimer = null
    }
  }
}
