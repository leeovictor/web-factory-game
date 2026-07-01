import type { Building, BuildingKind, Direction, Item, ItemType } from '../../types.ts'

export type MinerState = { internal: Item | null; cooldown: number }
export type BeltState = { item: Item | null }
export type FurnaceState = { input: Item | null; processing: Item | null; timer: number; output: Item | null }
export type StorageState = { count: number; itemTypes: Set<ItemType> }
export type InserterState = { arm: 'front' | 'back'; phase: number; holding: Item | null }

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
      base.storage = { count: 0, itemTypes: new Set() }
      break
    case 'inserter':
      base.inserter = { arm: 'front', phase: 0, holding: null }
      break
  }

  return base
}
