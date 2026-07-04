import { describe, it, expect } from 'vitest';
import { defineComponent, defineTag } from '../component';
import { createWorld } from '../world';

describe('createWorld', () => {
  it('should return a world with all expected methods', () => {
    const world = createWorld();
    expect(typeof world.instantiate).toBe('function');
    expect(typeof world.despawn).toBe('function');
    expect(typeof world.insert).toBe('function');
    expect(typeof world.remove).toBe('function');
    expect(typeof world.get).toBe('function');
    expect(typeof world.has).toBe('function');
    expect(typeof world.query).toBe('function');
    expect(typeof world.addSystem).toBe('function');
    expect(typeof world.removeSystem).toBe('function');
    expect(typeof world.step).toBe('function');
  });
});

describe('instantiate', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });

  it('should return a numeric entity id', () => {
    const world = createWorld();
    const e = world.instantiate();
    expect(typeof e).toBe('number');
  });

  it('should increment entity ids sequentially', () => {
    const world = createWorld();
    const e1 = world.instantiate();
    const e2 = world.instantiate();
    const e3 = world.instantiate();
    expect(e2).toBe(e1 + 1);
    expect(e3).toBe(e2 + 1);
  });

  it('should give entity all provided components', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }), Velocity({ vx: 2 }));
    expect(world.has(e, Position)).toBe(true);
    expect(world.has(e, Velocity)).toBe(true);
  });

  it('should store provided data correctly', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 10, y: 20 }), Velocity({ vx: 1, vy: 2 }));
    expect(world.get(e, Position)).toEqual({ x: 10, y: 20 });
    expect(world.get(e, Velocity)).toEqual({ vx: 1, vy: 2 });
  });

  it('should create entity with no components when called without args', () => {
    const world = createWorld();
    const e = world.instantiate();
    expect(world.has(e, Position)).toBe(false);
    const results = Array.from(world.query());
    expect(results).toContain(e);
  });

  it('should place multiple entities with same components in same archetype', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 2 }));
    const results = Array.from(world.query(Position, Velocity));
    expect(results).toContain(e1);
    expect(results).toContain(e2);
  });
});

describe('get', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });

  it('should return component data for existing entity+component', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 5 }));
    expect(world.get(e, Position)).toEqual({ x: 5, y: 0 });
  });

  it('should return mutable reference', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 0 }));
    const data = world.get(e, Position)!;
    data.x = 42;
    expect(world.get(e, Position)!.x).toBe(42);
  });

  it('should return undefined for non-existent entity', () => {
    const world = createWorld();
    expect(world.get(999, Position)).toBeUndefined();
  });

  it('should return undefined for entity without that component', () => {
    const Velocity = defineComponent('Velocity', { vx: 0 });
    const world = createWorld();
    const e = world.instantiate();
    expect(world.get(e, Position)).toBeUndefined();
    expect(world.get(e, Velocity)).toBeUndefined();
  });

  it('should return undefined for despawned entity (after flush)', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }));
    world.despawn(e);
    expect(world.get(e, Position)).toBeUndefined();
  });
});

describe('has', () => {
  const Position = defineComponent('Position', { x: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0 });

  it('should return true if entity has component', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    expect(world.has(e, Position)).toBe(true);
  });

  it('should return false if entity does not have component', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    expect(world.has(e, Velocity)).toBe(false);
  });

  it('should return false for non-existent entity', () => {
    const world = createWorld();
    expect(world.has(999, Position)).toBe(false);
  });
});

describe('insert', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });

  it('should add new component to entity', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }));
    world.insert(e, Velocity({ vx: 2 }));
    expect(world.has(e, Velocity)).toBe(true);
    expect(world.get(e, Velocity)).toEqual({ vx: 2, vy: 0 });
  });

  it('should move entity to correct archetype after insert', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }));
    world.insert(e, Velocity({ vx: 2 }));
    expect(Array.from(world.query(Position, Velocity))).toContain(e);
  });

  it('should preserve existing components after insert', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }), Health({ hp: 50 }));
    world.insert(e, Velocity({ vx: 2 }));
    expect(world.get(e, Position)).toEqual({ x: 1, y: 0 });
    expect(world.get(e, Health)).toEqual({ hp: 50 });
  });

  it('should replace data in-place if component already exists', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1, y: 2 }));
    world.insert(e, Position({ x: 10 }));
    expect(world.get(e, Position)).toEqual({ x: 10, y: 0 });
  });

  it('should apply immediately outside step', () => {
    const world = createWorld();
    const e = world.instantiate();
    world.insert(e, Position({ x: 5 }));
    expect(world.get(e, Position)).toEqual({ x: 5, y: 0 });
  });

  it('should defer insert during step', () => {
    const world = createWorld();
    const e = world.instantiate();
    let seenDuringStep = false;

    world.addSystem((w) => {
      w.insert(e, Position({ x: 99 }));
      seenDuringStep = w.has(e, Position);
    });

    world.step(0);
    expect(seenDuringStep).toBe(false);
    expect(world.get(e, Position)).toEqual({ x: 99, y: 0 });
  });

  it('should ignore insert on non-existent entity', () => {
    const world = createWorld();
    expect(() => world.insert(999, Position({ x: 1 }))).not.toThrow();
  });
});

describe('remove', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });

  it('should remove component from entity', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }), Velocity({ vx: 2 }));
    world.remove(e, Velocity);
    expect(world.has(e, Velocity)).toBe(false);
    expect(world.get(e, Velocity)).toBeUndefined();
  });

  it('should move entity to archetype without the component', () => {
    const world = createWorld();
    const e = world.instantiate(Position(), Velocity());
    world.remove(e, Velocity);
    expect(Array.from(world.query(Position, Velocity))).not.toContain(e);
    expect(Array.from(world.query(Position))).toContain(e);
  });

  it('should preserve other components after remove', () => {
    const world = createWorld();
    const e = world.instantiate(Position(), Velocity(), Health({ hp: 50 }));
    world.remove(e, Velocity);
    expect(world.get(e, Position)).toBeDefined();
    expect(world.get(e, Health)).toEqual({ hp: 50 });
  });

  it('should apply immediately outside step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    world.remove(e, Position);
    expect(world.has(e, Position)).toBe(false);
  });

  it('should defer remove during step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    let seenDuringStep = true;

    world.addSystem((w) => {
      w.remove(e, Position);
      seenDuringStep = w.has(e, Position);
    });

    world.step(0);
    expect(seenDuringStep).toBe(true);
    expect(world.has(e, Position)).toBe(false);
  });

  it('should ignore remove on non-existent entity', () => {
    const world = createWorld();
    expect(() => world.remove(999, Position)).not.toThrow();
  });

  it('should ignore remove of component entity does not have', () => {
    const world = createWorld();
    const e = world.instantiate();
    expect(() => world.remove(e, Position)).not.toThrow();
  });
});

describe('despawn', () => {
  const Position = defineComponent('Position', { x: 0 });

  it('should remove entity from world', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }));
    world.despawn(e);
    expect(world.get(e, Position)).toBeUndefined();
    expect(world.has(e, Position)).toBe(false);
  });

  it('should not include entity in queries after despawn', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }));
    world.despawn(e);
    expect(Array.from(world.query(Position))).not.toContain(e);
  });

  it('should apply immediately outside step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    world.despawn(e);
    expect(Array.from(world.query())).not.toContain(e);
  });

  it('should defer despawn during step', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    let seenDuringStep = false;

    world.addSystem((w) => {
      w.despawn(e);
      seenDuringStep = Array.from(w.query(Position)).includes(e);
    });

    world.step(0);
    expect(seenDuringStep).toBe(true);
    expect(Array.from(world.query(Position))).not.toContain(e);
  });

  it('should ignore despawn of non-existent entity', () => {
    const world = createWorld();
    expect(() => world.despawn(999)).not.toThrow();
  });

  it('should maintain correctness with swap-pop', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }));
    const e3 = world.instantiate(Position({ x: 3 }));

    world.despawn(e2);

    expect(world.get(e1, Position)!.x).toBe(1);
    expect(world.get(e3, Position)!.x).toBe(3);
    expect(Array.from(world.query(Position))).toContain(e1);
    expect(Array.from(world.query(Position))).toContain(e3);
    expect(Array.from(world.query(Position))).not.toContain(e2);
  });

  it('should handle despawn of middle entity in archetype', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }));
    const e3 = world.instantiate(Position({ x: 3 }));

    world.despawn(e2);

    const ids = Array.from(world.query(Position));
    expect(ids).toContain(e1);
    expect(ids).toContain(e3);
    expect(ids).not.toContain(e2);
    expect(world.get(e1, Position)!.x).toBe(1);
    expect(world.get(e3, Position)!.x).toBe(3);
  });
});

describe('query', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });

  it('should return entities with all queried components (AND)', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position(), Velocity());
    const e2 = world.instantiate(Position(), Velocity(), Health());
    const e3 = world.instantiate(Position());

    const results = Array.from(world.query(Position, Velocity));
    expect(results).toContain(e1);
    expect(results).toContain(e2);
    expect(results).not.toContain(e3);
  });

  it('should not return entities missing one component', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    world.instantiate(Velocity());
    expect(Array.from(world.query(Position, Velocity))).not.toContain(e);
  });

  it('should return entities from multiple archetypes', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position(), Velocity());
    const e2 = world.instantiate(Position(), Velocity(), Health());
    const e3 = world.instantiate(Position(), Velocity(), Health(), defineComponent('A', { a: 0 })());

    const results = Array.from(world.query(Position, Velocity));
    expect(results).toContain(e1);
    expect(results).toContain(e2);
    expect(results).toContain(e3);
  });

  it('should work with single token query', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position());
    const e2 = world.instantiate(Position(), Velocity());
    const results = Array.from(world.query(Position));
    expect(results).toContain(e1);
    expect(results).toContain(e2);
  });

  it('should return all entities when querying with no tokens', () => {
    const world = createWorld();
    const e1 = world.instantiate();
    const e2 = world.instantiate(Position());
    const e3 = world.instantiate(Velocity());
    const results = Array.from(world.query());
    expect(results).toContain(e1);
    expect(results).toContain(e2);
    expect(results).toContain(e3);
  });

  it('should be iterable with for...of', () => {
    const world = createWorld();
    world.instantiate(Position());
    world.instantiate(Position());
    let count = 0;
    for (const _ of world.query(Position)) {
      count++;
    }
    expect(count).toBe(2);
  });

  it('should reflect state after insert/remove/despawn', () => {
    const world = createWorld();
    const e = world.instantiate(Position());
    expect(Array.from(world.query(Position))).toContain(e);
    world.remove(e, Position);
    expect(Array.from(world.query(Position))).not.toContain(e);
    world.insert(e, Position());
    expect(Array.from(world.query(Position))).toContain(e);
    world.despawn(e);
    expect(Array.from(world.query(Position))).not.toContain(e);
  });

  it('should be correct after swap-pop from despawn', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position());
    const e2 = world.instantiate(Position());
    const e3 = world.instantiate(Position());

    world.despawn(e2);

    const results = Array.from(world.query(Position));
    expect(results).toContain(e1);
    expect(results).toContain(e3);
    expect(results).not.toContain(e2);
    expect(results.length).toBe(2);
  });
});

describe('queryComponents', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });

  it('should return tuple [entity, ...components]', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1, y: 2 }), Velocity({ vx: 3, vy: 4 }));

    const results = Array.from(world.queryComponents(Position, Velocity));
    expect(results.length).toBe(1);

    const [id, pos, vel] = results[0];
    expect(id).toBe(e);
    expect(pos).toEqual({ x: 1, y: 2 });
    expect(vel).toEqual({ vx: 3, vy: 4 });
  });

  it('should yield mutable references to components', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 0 }), Velocity({ vx: 0 }));

    for (const [id, pos, vel] of world.queryComponents(Position, Velocity)) {
      pos.x = 99;
      vel.vx = 88;
    }

    expect(world.get(e, Position)!.x).toBe(99);
    expect(world.get(e, Velocity)!.vx).toBe(88);
  });

  it('should return empty when no entities match', () => {
    const world = createWorld();
    world.instantiate(Position());
    expect(Array.from(world.queryComponents(Position, Velocity)).length).toBe(0);
  });

  it('should include entities from multiple archetypes', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position(), Velocity());
    const e2 = world.instantiate(Position(), Velocity(), Health());
    const e3 = world.instantiate(Position());

    const results = Array.from(world.queryComponents(Position, Velocity));
    const ids = results.map(([id]) => id);
    expect(ids).toContain(e1);
    expect(ids).toContain(e2);
    expect(ids).not.toContain(e3);
  });

  it('should work with single component query', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 7 }));

    const results = Array.from(world.queryComponents(Position));
    expect(results.length).toBe(1);
    expect(results[0][0]).toBe(e);
    expect(results[0][1]).toEqual({ x: 7, y: 0 });
  });

  it('should be iterable with for...of', () => {
    const world = createWorld();
    world.instantiate(Position(), Velocity());
    world.instantiate(Position(), Velocity());

    let count = 0;
    for (const _ of world.queryComponents(Position, Velocity)) {
      count++;
    }
    expect(count).toBe(2);
  });

  it('should reflect state after insert/remove/despawn', () => {
    const world = createWorld();
    const e = world.instantiate(Position(), Velocity());

    expect(Array.from(world.queryComponents(Position, Velocity)).length).toBe(1);

    world.remove(e, Velocity);
    expect(Array.from(world.queryComponents(Position, Velocity)).length).toBe(0);

    world.insert(e, Velocity());
    expect(Array.from(world.queryComponents(Position, Velocity)).length).toBe(1);

    world.despawn(e);
    expect(Array.from(world.queryComponents(Position, Velocity)).length).toBe(0);
  });

  it('should be correct after swap-pop from despawn', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }));
    const e3 = world.instantiate(Position({ x: 3 }));

    world.despawn(e2);

    const results = Array.from(world.queryComponents(Position));
    const ids = results.map(([id]) => id);
    expect(ids).toContain(e1);
    expect(ids).toContain(e3);
    expect(ids).not.toContain(e2);
    expect(ids.length).toBe(2);
  });

  it('should allow using entity id for further operations', () => {
    const world = createWorld();
    const e = world.instantiate(Position(), Velocity());

    for (const [id, pos, vel] of world.queryComponents(Position, Velocity)) {
      world.despawn(id);
    }

    expect(Array.from(world.query(Position)).length).toBe(0);
  });
});

describe('query().without()', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });
  const Static = defineComponent('Static', { immovable: true });

  it('should exclude entities with the specified component', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }), Static());
    const e3 = world.instantiate(Position({ x: 3 }));

    const results = Array.from(world.query(Position).without(Static));
    expect(results).toContain(e1);
    expect(results).toContain(e3);
    expect(results).not.toContain(e2);
  });

  it('should exclude entities with multiple components via chaining', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }), Static());
    const e3 = world.instantiate(Position({ x: 3 }), Health());
    const e4 = world.instantiate(Position({ x: 4 }), Static(), Health());

    const results = Array.from(world.query(Position).without(Static).without(Health));
    expect(results).toContain(e1);
    expect(results).not.toContain(e2);
    expect(results).not.toContain(e3);
    expect(results).not.toContain(e4);
  });

  it('should exclude multiple components in a single call', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }), Static());
    const e3 = world.instantiate(Position({ x: 3 }), Health());
    const e4 = world.instantiate(Position({ x: 4 }), Static(), Health());

    const results = Array.from(world.query(Position).without(Static, Health));
    expect(results).toContain(e1);
    expect(results).not.toContain(e2);
    expect(results).not.toContain(e3);
    expect(results).not.toContain(e4);
  });

  it('should work combined with withTag', () => {
    const IsPlayer = defineTag('IsPlayer');
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), IsPlayer());
    const e2 = world.instantiate(Position({ x: 2 }), IsPlayer(), Static());
    const e3 = world.instantiate(Position({ x: 3 }), IsPlayer());

    const results = Array.from(world.query(Position).withTag(IsPlayer).without(Static));
    expect(results).toContain(e1);
    expect(results).toContain(e3);
    expect(results).not.toContain(e2);
  });

  it('should not affect the original query object', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }), Static());

    const base = world.query(Position);
    const filtered = base.without(Static);

    expect(Array.from(base)).toContain(e1);
    expect(Array.from(base)).toContain(e2);
    expect(Array.from(filtered)).toContain(e1);
    expect(Array.from(filtered)).not.toContain(e2);
  });

  it('should return empty when excluding a required component', () => {
    const world = createWorld();
    world.instantiate(Position({ x: 1 }));

    const results = Array.from(world.query(Position).without(Position));
    expect(results.length).toBe(0);
  });

  it('should return same results when without has no tokens', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }));
    const e2 = world.instantiate(Position({ x: 2 }));

    const results = Array.from(world.query(Position).without());
    expect(results).toContain(e1);
    expect(results).toContain(e2);
  });

  it('should work with multiple components in query', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }));
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), Static());
    const e3 = world.instantiate(Position({ x: 3 }), Velocity({ vx: 30 }));

    const results = Array.from(world.query(Position, Velocity).without(Static));
    expect(results).toContain(e1);
    expect(results).toContain(e3);
    expect(results).not.toContain(e2);
  });

  it('should be iterable with for...of', () => {
    const world = createWorld();
    world.instantiate(Position({ x: 1 }), Static());
    world.instantiate(Position({ x: 2 }));
    world.instantiate(Position({ x: 3 }));

    let count = 0;
    for (const _ of world.query(Position).without(Static)) {
      count++;
    }
    expect(count).toBe(2);
  });
});

describe('queryComponents().without()', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const Health = defineComponent('Health', { hp: 100 });
  const Static = defineComponent('Static', { immovable: true });

  it('should exclude entities with the specified component', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }));
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), Static());

    const results = Array.from(world.queryComponents(Position, Velocity).without(Static));
    expect(results.length).toBe(1);
    expect(results[0][0]).toBe(e1);
  });

  it('should yield mutable references with without filter', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 0 }), Velocity({ vx: 0 }));

    for (const [_, pos, vel] of world.queryComponents(Position, Velocity).without(Static)) {
      pos.x = 99;
      vel.vx = 88;
    }

    expect(world.get(e, Position)!.x).toBe(99);
    expect(world.get(e, Velocity)!.vx).toBe(88);
  });

  it('should chain withTag and without', () => {
    const IsPlayer = defineTag('IsPlayer');
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }), IsPlayer());
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), IsPlayer(), Static());

    const results = Array.from(world.queryComponents(Position, Velocity).withTag(IsPlayer).without(Static));
    expect(results.length).toBe(1);
    expect(results[0][0]).toBe(e1);
  });

  it('should not affect the original query object', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }));
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), Static());

    const base = world.queryComponents(Position, Velocity);
    const filtered = base.without(Static);

    expect(Array.from(base).length).toBe(2);
    expect(Array.from(filtered).length).toBe(1);
  });

  it('should work with multiple components in query', () => {
    const world = createWorld();
    const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }), Health({ hp: 100 }));
    const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), Static());
    const e3 = world.instantiate(Position({ x: 3 }), Velocity({ vx: 30 }));

    const results = Array.from(world.queryComponents(Position, Velocity).without(Static));
    const ids = results.map(([id]) => id);
    expect(ids).toContain(e1);
    expect(ids).toContain(e3);
    expect(ids).not.toContain(e2);
  });

  it('should be iterable with for...of', () => {
    const world = createWorld();
    world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }));
    world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), Static());
    world.instantiate(Position({ x: 3 }), Velocity({ vx: 30 }));

    let count = 0;
    for (const _ of world.queryComponents(Position, Velocity).without(Static)) {
      count++;
    }
    expect(count).toBe(2);
  });
});
