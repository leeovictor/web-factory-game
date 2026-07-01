import type { Item, Direction } from '../../types.ts'

let nextId = 1

export function createItem(type: 'iron_ore' | 'iron_bar', onTile: { x: number; y: number }, inputDir: Direction): Item {
  return {
    id: `${nextId++}`,
    type,
    onTile: { ...onTile },
    pos: 0,
    prevPos: 0,
    inputDir,
  }
}
