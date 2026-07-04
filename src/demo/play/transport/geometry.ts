export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function packetWorldPos(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  pos: number
): { x: number; y: number } {
  return { x: lerp(fromX, toX, pos), y: lerp(fromY, toY, pos) };
}