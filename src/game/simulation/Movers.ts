import type { Grid } from '../core/Grid.ts'
import type { BuildingInstance } from '../entities/Building.ts'
import type { Item } from '../../types.ts'
import { opposite } from '../core/Direction.ts'
import { BELT_SPEED } from '../../constants.ts'

interface TransferPlan {
  from: BuildingInstance
  to: BuildingInstance
  item: Item
  newPos: number
}

export function tickMovers(buildings: BuildingInstance[], grid: Grid, dt: number): void {
  const plan = planTransfers(buildings, grid, dt)
  const transferred = applyTransfers(plan)
  advanceItems(buildings, dt, transferred)
}

function planTransfers(buildings: BuildingInstance[], grid: Grid, dt: number): TransferPlan[] {
  const plans: TransferPlan[] = []
  for (const b of buildings) {
    if (b.kind !== 'belt' || !b.belt?.item) continue
    const item = b.belt.item
    const nextPos = item.pos + BELT_SPEED * dt
    if (nextPos < 1) continue
    const next = grid.buildingAhead(b.x, b.y, b.direction)
    if (next && next.kind === 'belt' && next.belt?.item === null) {
      plans.push({ from: b, to: next, item, newPos: nextPos - 1 })
    }
  }
  return plans
}

function applyTransfers(plans: TransferPlan[]): Set<string> {
  const transferred = new Set<string>()
  for (const plan of plans) {
    const { from, to, item, newPos } = plan
    from.belt!.item = null
    to.belt!.item = item
    item.onTile = { x: to.x, y: to.y }
    item.pos = newPos
    item.prevPos = 0
    item.inputDir = opposite(from.direction)
    transferred.add(item.id)
  }
  return transferred
}

function advanceItems(buildings: BuildingInstance[], dt: number, transferred: Set<string>): void {
  for (const b of buildings) {
    if (b.kind !== 'belt' || !b.belt?.item) continue
    const item = b.belt.item
    if (transferred.has(item.id)) continue
    item.pos += BELT_SPEED * dt
    if (item.pos > 1) item.pos = 1
  }
}
