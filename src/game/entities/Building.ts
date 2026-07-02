import type { Building, BuildingKind, Direction, Item, ItemType } from '../../types.ts'

export type MinerState = { internal: Item | null; cooldown: number }
export type BeltState = { item: Item | null; inputDirOverride?: Direction }
export type FurnaceState = { input: Item | null; processing: Item | null; timer: number; output: Item | null }
export type StorageState = { counts: Record<ItemType, number> }
export type InserterMode = 'waiting_for_cargo' | 'transporting' | 'returning' | 'product_overflow'
export type InserterState = { phase: number; holding: Item | null; mode: InserterMode }

export interface BuildingInstance extends Building {
  miner?: MinerState
  belt?: BeltState
  furnace?: FurnaceState
  storage?: StorageState
  inserter?: InserterState
}

let nextId = 1

export function createBuilding(
  kind: BuildingKind,
  x: number,
  y: number,
  direction: Direction,
  id?: string
): BuildingInstance {
  const base: BuildingInstance = {
    id: id ?? `${nextId++}`,
    kind,
    x,
    y,
    width: kind === 'furnace' || kind === 'storage' ? 2 : 1,
    height: kind === 'furnace' || kind === 'storage' ? 2 : 1,
    direction,
  }

  switch (kind) {
    case 'miner':
      base.miner = { internal: null, cooldown: 0 }
      break
    case 'belt':
      base.belt = { item: null }
      break
    case 'furnace':
      base.furnace = { input: null, processing: null, timer: 0, output: null }
      break
    case 'storage':
      base.storage = { counts: { iron_ore: 0, iron_bar: 0 } }
      break
    case 'inserter':
      base.inserter = { phase: 0, holding: null, mode: 'waiting_for_cargo' }
      break
  }

  return base
}
