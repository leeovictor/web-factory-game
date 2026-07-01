import type { Direction } from './game/core/Direction.ts'

export type { Direction }

export type ItemType = 'iron_ore' | 'iron_bar'
export type TileKind = 'empty' | 'ore'
export type BuildingKind = 'miner' | 'belt' | 'furnace' | 'storage' | 'inserter'

export interface Building {
  id: string
  kind: BuildingKind
  x: number
  y: number
  width: number
  height: number
  direction: Direction
}

export interface Item {
  id: string
  type: ItemType
  onTile: { x: number; y: number }
  pos: number
  prevPos: number
  inputDir: Direction
  carrying?: boolean
}
