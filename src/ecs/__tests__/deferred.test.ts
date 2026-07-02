import { describe, it, expect } from 'vitest';
import { defineComponent } from '../component';
import { createWorld } from '../world';

describe('deferred operations', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });

  it('should apply multiple inserts on same entity during step (last wins)', () => {
    const world = createWorld();
    const e = world.instantiate();

    world.addSystem((w) => {
      w.insert(e, Position({ x: 1 }));
      w.insert(e, Position({ x: 2 }));
      w.insert(e, Position({ x: 3 }));
    });

    world.step(0);
    expect(world.get(e, Position)!.x).toBe(3);
  });

  it('should ignore insert after despawn on same entity during step', () => {
    const world = createWorld();
    const e = world.instantiate();

    world.addSystem((w) => {
      w.despawn(e);
      w.insert(e, Position({ x: 1 }));
    });

    world.step(0);
    expect(world.get(e, Position)).toBeUndefined();
    expect(world.has(e, Position)).toBe(false);
  });

  it('should remove component after insert+remove during step', () => {
    const world = createWorld();
    const e = world.instantiate();

    world.addSystem((w) => {
      w.insert(e, Position({ x: 1 }));
      w.remove(e, Position);
    });

    world.step(0);
    expect(world.has(e, Position)).toBe(false);
  });

  it('should see pre-defer state in query during step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());

    let countDuringStep = 0;
    world.addSystem((w) => {
      w.remove(e, Position);
      countDuringStep = Array.from(w.query(Position)).length;
    });

    world.step(0);
    expect(countDuringStep).toBe(1); // saw it before flush
    expect(Array.from(world.query(Position)).length).toBe(0); // after flush
  });

  it('should work fine with step having no pending ops', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    world.step(0);
    expect(world.has(e, Position)).toBe(true);
    expect(world.get(e, Position)).toEqual({ x: 0, y: 0 });
  });

  it('should handle insert+remove+insert same component during step', () => {
    const world = createWorld();
    const e = world.instantiate();

    world.addSystem((w) => {
      w.insert(e, Position({ x: 1 }));
      w.remove(e, Position);
      w.insert(e, Position({ x: 5 }));
    });

    world.step(0);
    expect(world.get(e, Position)).toEqual({ x: 5, y: 0 });
  });
});

describe('edge cases', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });

  it('should handle duplicate payloads in instantiate (last wins)', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }), Position({ x: 2 }));
    expect(world.get(e, Position)!.x).toBe(2);
  });

  it('should handle empty entity correctly', () => {
    const world = createWorld();
    const e = world.instantiate();
    expect(Array.from(world.query())).toContain(e);
    expect(Array.from(world.query(Position)).length).toBe(0);
  });

  it('should handle query with tokens that no entity has', () => {
    const Velocity = defineComponent('Velocity', { vx: 0 });
    const world = createWorld();
    world.instantiate(Position());
    expect(Array.from(world.query(Position, Velocity)).length).toBe(0);
  });
});
