import { describe, it, expect } from 'vitest';
import { defineResource } from '../resource';
import { createWorld } from '../world';

describe('defineResource', () => {
  it('should create a token with unique id and name', () => {
    const A = defineResource('Time', { dt: 0 });
    const B = defineResource('Fps', { fps: 0 });
    expect(A.id).toBeDefined();
    expect(A.name).toBe('Time');
    expect(B.id).toBe(A.id + 1);
  });

  it('should preserve defaults on token', () => {
    const defaults = { dt: 0, elapsed: 0 };
    const token = defineResource('Time', defaults);
    expect(token.defaults).toBe(defaults);
  });
});

describe('world resources', () => {
  it('should store and retrieve resource data', () => {
    const world = createWorld();
    const Token = defineResource('Config', { volume: 0.5 });
    const data = { volume: 0.8 };
    world.insertResource(Token, data);
    expect(world.getResource(Token)).toBe(data);
    expect(world.getResource(Token).volume).toBe(0.8);
  });

  it('should return mutable reference to resource', () => {
    const world = createWorld();
    const Token = defineResource('Counter', { count: 0 });
    world.insertResource(Token, { count: 5 });
    world.getResource(Token).count++;
    expect(world.getResource(Token).count).toBe(6);
  });

  it('should lazy-init with defaults on first get', () => {
    const world = createWorld();
    const Token = defineResource('Settings', { sound: true, brightness: 0.5 });
    const r = world.getResource(Token);
    expect(r.sound).toBe(true);
    expect(r.brightness).toBe(0.5);
    r.brightness = 0.9;
    expect(world.getResource(Token).brightness).toBe(0.9);
  });

  it('should persist data across system steps', () => {
    const world = createWorld();
    const Token = defineResource('Time', { t: 0 });

    world.addSystem((w) => {
      w.getResource(Token).t += 1;
    });

    expect(world.getResource(Token).t).toBe(0);
    world.step(0);
    expect(world.getResource(Token).t).toBe(1);
    world.step(0);
    expect(world.getResource(Token).t).toBe(2);
  });
});
