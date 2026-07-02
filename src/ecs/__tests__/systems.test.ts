import { describe, it, expect, vi } from 'vitest';
import { defineComponent } from '../component';
import { createWorld } from '../world';

describe('systems', () => {
  const Position = defineComponent('Position', { x: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0 });

  it('should register system with addSystem', () => {
    const world = createWorld();
    const system = vi.fn();
    world.addSystem(system);
    world.step(0.1);
    expect(system).toHaveBeenCalledTimes(1);
  });

  it('should execute systems in registration order', () => {
    const world = createWorld();
    const order: number[] = [];
    world.addSystem(() => order.push(1));
    world.addSystem(() => order.push(2));
    world.addSystem(() => order.push(3));
    world.step(0);
    expect(order).toEqual([1, 2, 3]);
  });

  it('should pass world and dt to system', () => {
    const world = createWorld();
    const system = vi.fn();
    world.addSystem(system);
    world.step(0.016);
    expect(system).toHaveBeenCalledWith(world, 0.016);
  });

  it('should not call removed system', () => {
    const world = createWorld();
    const system = vi.fn();
    world.addSystem(system);
    world.step(0);
    expect(system).toHaveBeenCalledTimes(1);
    world.removeSystem(system);
    world.step(0);
    expect(system).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when removing non-registered system', () => {
    const world = createWorld();
    const system = () => {};
    expect(() => world.removeSystem(system)).not.toThrow();
  });

  it('should remove system from specific phase only', () => {
    const world = createWorld({ phases: ['a', 'b'] });
    const system = vi.fn();
    world.addSystem(system, 'a');
    world.addSystem(system, 'b');
    world.removeSystem(system, 'a');
    world.step(0);
    expect(system).toHaveBeenCalledTimes(1); // only 'b' still has it
  });

  it('should allow system to query and get mutable refs', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 5 }));

    world.addSystem((w) => {
      for (const id of w.query(Position)) {
        const pos = w.get(id, Position)!;
        pos.x += 10;
      }
    });

    world.step(0);
    expect(world.get(e, Position)!.x).toBe(15);
  });

  it('should defer insert during step', () => {
    const world = createWorld();
    const e = world.instantiate();

    world.addSystem((w) => {
      w.insert(e, Position({ x: 99 }));
    });

    world.step(0);
    expect(world.get(e, Position)).toEqual({ x: 99 });
  });

  it('should defer despawn during step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());

    world.addSystem((w) => {
      w.despawn(e);
    });

    world.step(0);
    expect(world.has(e, Position)).toBe(false);
  });

  it('should not affect current step when adding/removing system', () => {
    const world = createWorld();
    const laterSystem = vi.fn();

    world.addSystem((w) => {
      w.addSystem(laterSystem);
    });

    world.step(0);
    expect(laterSystem).not.toHaveBeenCalled();
    world.step(0);
    expect(laterSystem).toHaveBeenCalledTimes(1);
  });
});

describe('system execution order edge cases', () => {
  it('should execute multiple systems in order', () => {
    const world = createWorld();
    const Position = defineComponent('Position', { x: 0 });
    const e = world.instantiate(Position({ x: 0 }));

    world.addSystem((w) => {
      w.get(e, Position)!.x += 1;
    });
    world.addSystem((w) => {
      w.get(e, Position)!.x *= 2;
    });

    world.step(0);
    expect(world.get(e, Position)!.x).toBe(2);

    world.step(0);
    expect(world.get(e, Position)!.x).toBe(6);
  });
});

describe('phases', () => {
  const Position = defineComponent('Position', { x: 0 });

  it('should execute phases in declared order', () => {
    const world = createWorld({ phases: ['first', 'second'] });
    const order: string[] = [];

    world.addSystem(() => order.push('first'), 'first');
    world.addSystem(() => order.push('second'), 'second');

    world.step(0);
    expect(order).toEqual(['first', 'second']);
  });

  it('should execute systems within a phase in registration order', () => {
    const world = createWorld({ phases: ['update'] });
    const order: number[] = [];

    world.addSystem(() => order.push(1), 'update');
    world.addSystem(() => order.push(2), 'update');
    world.addSystem(() => order.push(3), 'update');

    world.step(0);
    expect(order).toEqual([1, 2, 3]);
  });

  it('should flush between phases, making changes visible to next phase', () => {
    const world = createWorld({ phases: ['a', 'b'] });
    const e = world.instantiate();

    world.addSystem((w) => {
      w.insert(e, Position({ x: 5 }));
    }, 'a');

    let seenInB = false;
    world.addSystem((w) => {
      seenInB = w.has(e, Position);
    }, 'b');

    world.step(0);
    expect(seenInB).toBe(true);
    expect(world.get(e, Position)!.x).toBe(5);
  });

  it('should NOT flush within same phase', () => {
    const world = createWorld({ phases: ['a'] });
    const e = world.instantiate();

    let seenInSamePhase = true;
    world.addSystem((w) => {
      w.insert(e, Position({ x: 5 }));
    }, 'a');
    world.addSystem((w) => {
      seenInSamePhase = w.has(e, Position);
    }, 'a');

    world.step(0);
    expect(seenInSamePhase).toBe(false);
  });

  it('world.flush() should make changes visible within same phase', () => {
    const world = createWorld({ phases: ['a'] });
    const e = world.instantiate();

    let seenAfterFlush = false;
    world.addSystem((w) => {
      w.insert(e, Position({ x: 5 }));
      w.flush();
    }, 'a');
    world.addSystem((w) => {
      seenAfterFlush = w.has(e, Position);
    }, 'a');

    world.step(0);
    expect(seenAfterFlush).toBe(true);
    expect(world.get(e, Position)!.x).toBe(5);
  });

  it('should handle addSystem without phase going to first declared phase', () => {
    const world = createWorld({ phases: ['first', 'second'] });
    const spy = vi.fn();

    world.addSystem(spy); // no phase → goes to 'first'

    let ranInFirst = false;
    let ranInSecond = false;
    world.addSystem(() => { ranInFirst = true; }, 'first');
    world.addSystem(() => { ranInSecond = true; }, 'second');

    world.step(0);
    expect(spy).toHaveBeenCalled();
    expect(ranInFirst).toBe(true);
    expect(ranInSecond).toBe(true);
  });

  it('should add phase dynamically at end', () => {
    const world = createWorld({ phases: ['a'] });
    const order: string[] = [];

    world.addSystem(() => order.push('a'), 'a');
    world.addPhase('b');
    world.addSystem(() => order.push('b'), 'b');

    world.step(0);
    expect(order).toEqual(['a', 'b']);
  });

  it('should add phase dynamically at specific index', () => {
    const world = createWorld({ phases: ['a', 'c'] });
    const order: string[] = [];

    world.addPhase('b', 1); // insert between a and c
    world.addSystem(() => order.push('a'), 'a');
    world.addSystem(() => order.push('b'), 'b');
    world.addSystem(() => order.push('c'), 'c');

    world.step(0);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('setPhaseOrder should reorder phases', () => {
    const world = createWorld({ phases: ['a', 'b', 'c'] });
    const order: string[] = [];

    world.addSystem(() => order.push('a'), 'a');
    world.addSystem(() => order.push('b'), 'b');
    world.addSystem(() => order.push('c'), 'c');

    world.setPhaseOrder(['c', 'a', 'b']);
    world.step(0);
    expect(order).toEqual(['c', 'a', 'b']);
  });

  it('setPhaseOrder should throw on non-existent phase', () => {
    const world = createWorld({ phases: ['a'] });
    expect(() => world.setPhaseOrder(['a', 'bogus'])).toThrow();
  });

  it('flush outside step should be a no-op', () => {
    const world = createWorld();
    expect(() => world.flush()).not.toThrow();
  });

  it('createWorld with empty phases should still work', () => {
    const world = createWorld({ phases: [] });
    const system = vi.fn();
    world.addSystem(system);
    world.step(0);
    expect(system).toHaveBeenCalledTimes(1);
  });

  it('should populate phaseTimings after step', () => {
    const world = createWorld({ phases: ['a', 'b'] });
    world.addSystem(() => {}, 'a');
    world.addSystem(() => {}, 'b');
    world.step(0);
    expect(world.phaseTimings).toHaveProperty('a');
    expect(world.phaseTimings).toHaveProperty('b');
    expect(typeof world.phaseTimings.a).toBe('number');
    expect(typeof world.phaseTimings.b).toBe('number');
  });
});
