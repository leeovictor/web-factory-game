export type Direction = 'N' | 'E' | 'S' | 'W'

export const DIRS: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
}

export function opposite(d: Direction): Direction {
  switch (d) {
    case 'N': return 'S'
    case 'E': return 'W'
    case 'S': return 'N'
    case 'W': return 'E'
  }
}

export function rotateCW(d: Direction): Direction {
  switch (d) {
    case 'N': return 'E'
    case 'E': return 'S'
    case 'S': return 'W'
    case 'W': return 'N'
  }
}

export function isPerpendicular(d1: Direction, d2: Direction): boolean {
  const h = (d: Direction) => d === 'E' || d === 'W'
  return h(d1) !== h(d2)
}
