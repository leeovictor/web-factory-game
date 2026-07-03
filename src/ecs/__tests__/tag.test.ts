import { describe, it, expect } from 'vitest';
import { defineComponent, defineTag } from '../component';
import { createWorld } from '../world';

describe('defineTag', () => {
  it('should create a token with isTag: true', () => {
    const Tag = defineTag('TestTag');
    expect(Tag.isTag).toBe(true);
  });

  it('should have correct name', () => {
    const Tag = defineTag('IsPlayer');
    expect(Tag.name).toBe('IsPlayer');
  });

  it('should have undefined defaults', () => {
    const Tag = defineTag('Tag');
    expect(Tag.defaults).toBeUndefined();
  });

  it('should return payload with undefined data', () => {
    const Tag = defineTag('Tag');
    const payload = Tag();
    expect(payload.data).toBeUndefined();
    expect(payload.token).toBe(Tag);
  });

  it('should have unique incrementing ids separate from components', () => {
    const A = defineTag('A');
    const B = defineTag('B');
    expect(A.id).not.toBe(B.id);
    expect(B.id).toBe(A.id + 1);
  });

  it('should not accept arguments when called', () => {
    const Tag = defineTag('NoArgs');
    const payload = Tag();
    expect(payload.data).toBeUndefined();
  });
});

describe('Tag with World', () => {
  const Position = defineComponent('Position', { x: 0, y: 0 });
  const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
  const IsPlayer = defineTag('IsPlayer');
  const IsEnemy = defineTag('IsEnemy');
  const Invulnerable = defineTag('Invulnerable');

  it('should allow instantiating entity with tag', () => {
    const world = createWorld();
    const e = world.instantiate(Position({ x: 1 }), IsPlayer());
    expect(world.has(e, IsPlayer)).toBe(true);
    expect(world.get(e, Position)).toEqual({ x: 1, y: 0 });
  });

  it('should return undefined for get(tag)', () => {
    const world = createWorld();
    const e = world.instantiate(IsPlayer());
    expect(world.get(e, IsPlayer)).toBeUndefined();
  });

  it('should allow entity with only tags (no data components)', () => {
    const world = createWorld();
    const e = world.instantiate(IsPlayer(), IsEnemy());
    expect(world.has(e, IsPlayer)).toBe(true);
    expect(world.has(e, IsEnemy)).toBe(true);
  });

  it('should work with has() for tags', () => {
    const world = createWorld();
    const e = world.instantiate(IsPlayer());
    expect(world.has(e, IsPlayer)).toBe(true);
    expect(world.has(e, IsEnemy)).toBe(false);
  });

  describe('query().withTag()', () => {
    it('should filter entities by tag', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), IsPlayer());
      const e2 = world.instantiate(Position({ x: 2 }), IsEnemy());
      const e3 = world.instantiate(Position({ x: 3 }));

      const players = Array.from(world.query(Position).withTag(IsPlayer));
      expect(players).toContain(e1);
      expect(players).not.toContain(e2);
      expect(players).not.toContain(e3);
    });

    it('should work with multiple tags (AND)', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), IsPlayer(), Invulnerable());
      const e2 = world.instantiate(Position({ x: 2 }), IsPlayer());
      const e3 = world.instantiate(Position({ x: 3 }), Invulnerable());

      const filtered = Array.from(world.query(Position).withTag(IsPlayer).withTag(Invulnerable));
      expect(filtered).toContain(e1);
      expect(filtered).not.toContain(e2);
      expect(filtered).not.toContain(e3);
    });

    it('should work with query() without component tokens', () => {
      const world = createWorld();
      const e1 = world.instantiate(IsPlayer());
      const e2 = world.instantiate(IsEnemy());

      const players = Array.from(world.query().withTag(IsPlayer));
      expect(players).toContain(e1);
      expect(players).not.toContain(e2);
    });

    it('should return empty when no entities match tag', () => {
      const world = createWorld();
      world.instantiate(Position());

      const results = Array.from(world.query(Position).withTag(IsPlayer));
      expect(results.length).toBe(0);
    });

    it('should be iterable with for...of', () => {
      const world = createWorld();
      world.instantiate(Position({ x: 1 }), IsPlayer());
      world.instantiate(Position({ x: 2 }), IsPlayer());

      let count = 0;
      for (const _ of world.query(Position).withTag(IsPlayer)) {
        count++;
      }
      expect(count).toBe(2);
    });
  });

  describe('queryComponents().withTag()', () => {
    it('should filter component queries by tag', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), Velocity({ vx: 10 }), IsPlayer());
      const e2 = world.instantiate(Position({ x: 2 }), Velocity({ vx: 20 }), IsEnemy());

      const results = Array.from(world.queryComponents(Position, Velocity).withTag(IsPlayer));
      expect(results.length).toBe(1);
      expect(results[0][0]).toBe(e1);
      expect(results[0][1]).toEqual({ x: 1, y: 0 });
      expect(results[0][2]).toEqual({ vx: 10, vy: 0 });
    });

    it('should yield mutable references with tag filter', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 0 }), Velocity({ vx: 0 }), IsPlayer());

      for (const [_, pos, vel] of world.queryComponents(Position, Velocity).withTag(IsPlayer)) {
        pos.x = 99;
        vel.vx = 88;
      }

      expect(world.get(e, Position)!.x).toBe(99);
      expect(world.get(e, Velocity)!.vx).toBe(88);
    });

    it('should return empty when no entities match tag', () => {
      const world = createWorld();
      world.instantiate(Position(), IsEnemy());

      const results = Array.from(world.queryComponents(Position).withTag(IsPlayer));
      expect(results.length).toBe(0);
    });

    it('should work with multiple tags', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), IsPlayer(), Invulnerable());
      const e2 = world.instantiate(Position({ x: 2 }), IsPlayer());
      const e3 = world.instantiate(Position({ x: 3 }), Invulnerable());

      const results = Array.from(world.queryComponents(Position).withTag(IsPlayer).withTag(Invulnerable));
      expect(results.length).toBe(1);
      expect(results[0][0]).toBe(e1);
    });
  });

  describe('tag lifecycle', () => {
    it('should support insert tag after creation', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }));
      expect(world.has(e, IsPlayer)).toBe(false);

      world.insert(e, IsPlayer());
      expect(world.has(e, IsPlayer)).toBe(true);
    });

    it('should support remove tag', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }), IsPlayer());
      expect(world.has(e, IsPlayer)).toBe(true);

      world.remove(e, IsPlayer);
      expect(world.has(e, IsPlayer)).toBe(false);
    });

    it('should update query results after insert tag', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }));

      expect(Array.from(world.query(Position).withTag(IsPlayer)).length).toBe(0);

      world.insert(e, IsPlayer());
      expect(Array.from(world.query(Position).withTag(IsPlayer))).toContain(e);
    });

    it('should update query results after remove tag', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }), IsPlayer());

      expect(Array.from(world.query(Position).withTag(IsPlayer))).toContain(e);

      world.remove(e, IsPlayer);
      expect(Array.from(world.query(Position).withTag(IsPlayer)).length).toBe(0);
    });

    it('should work with deferred insert/remove during step', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }));

      let seenWithTag = false;
      world.addSystem((w) => {
        w.insert(e, IsPlayer());
        seenWithTag = Array.from(w.query(Position).withTag(IsPlayer)).includes(e);
      });

      world.step(0);

      expect(seenWithTag).toBe(false);
      expect(world.has(e, IsPlayer)).toBe(true);
    });

    it('should work with deferred remove during step', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }), IsPlayer());

      let seenWithTag = true;
      world.addSystem((w) => {
        w.remove(e, IsPlayer);
        seenWithTag = Array.from(w.query(Position).withTag(IsPlayer)).includes(e);
      });

      world.step(0);

      expect(seenWithTag).toBe(true);
      expect(world.has(e, IsPlayer)).toBe(false);
    });

    it('should survive despawn with tags', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }), IsPlayer());
      world.despawn(e);
      expect(world.has(e, IsPlayer)).toBe(false);
      expect(Array.from(world.query(Position).withTag(IsPlayer)).length).toBe(0);
    });

    it('should handle swap-pop correctness with tags', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), IsPlayer());
      const e2 = world.instantiate(Position({ x: 2 }), IsPlayer());
      const e3 = world.instantiate(Position({ x: 3 }), IsPlayer());

      world.despawn(e2);

      const players = Array.from(world.query(Position).withTag(IsPlayer));
      expect(players).toContain(e1);
      expect(players).toContain(e3);
      expect(players).not.toContain(e2);
      expect(world.get(e1, Position)!.x).toBe(1);
      expect(world.get(e3, Position)!.x).toBe(3);
    });
  });

  describe('query reuse', () => {
    it('should produce independent iterators each iteration', () => {
      const world = createWorld();
      world.instantiate(Position({ x: 1 }), IsPlayer());
      world.instantiate(Position({ x: 2 }), IsPlayer());

      const q = world.query(Position).withTag(IsPlayer);
      const first = Array.from(q);
      const second = Array.from(q);
      expect(first.length).toBe(2);
      expect(second.length).toBe(2);
    });

    it('should allow chaining withTag on queryComponents', () => {
      const world = createWorld();
      const e = world.instantiate(Position({ x: 1 }), IsPlayer(), Invulnerable());

      const results = Array.from(
        world.queryComponents(Position).withTag(IsPlayer).withTag(Invulnerable)
      );
      expect(results.length).toBe(1);
      expect(results[0][0]).toBe(e);
    });

    it('should not affect original query when withTag is called', () => {
      const world = createWorld();
      const e1 = world.instantiate(Position({ x: 1 }), IsPlayer());
      const e2 = world.instantiate(Position({ x: 2 }));

      const base = world.query(Position);
      const filtered = base.withTag(IsPlayer);

      expect(Array.from(base)).toContain(e1);
      expect(Array.from(base)).toContain(e2);
      expect(Array.from(filtered)).toContain(e1);
      expect(Array.from(filtered)).not.toContain(e2);
    });
  });
});
