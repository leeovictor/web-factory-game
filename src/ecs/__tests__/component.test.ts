import { describe, it, expect } from 'vitest';
import { defineComponent } from '../component';

describe('defineComponent', () => {
  it('should create a token with a unique incrementing id', () => {
    const A = defineComponent('A', { x: 0 });
    const B = defineComponent('B', { y: 0 });
    expect(A.id).toBeDefined();
    expect(B.id).toBeDefined();
    expect(B.id).toBe(A.id + 1);
  });

  it('should have correct name', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    expect(Position.name).toBe('Position');
  });

  it('should preserve defaults on token', () => {
    const defaults = { x: 1, y: 2 };
    const Position = defineComponent('Position', defaults);
    expect(Position.defaults).toEqual(defaults);
    expect(Position.defaults).toBe(defaults); // stored by reference
  });

  it('should return payload with defaults when called with no args', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    const payload = Position();
    expect(payload.data).toEqual({ x: 0, y: 0 });
  });

  it('should merge partial with defaults', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    const payload = Position({ x: 5 });
    expect(payload.data).toEqual({ x: 5, y: 0 });
  });

  it('should use all provided fields', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    const payload = Position({ x: 10, y: 20 });
    expect(payload.data).toEqual({ x: 10, y: 20 });
  });

  it('should include self-reference in payload.token', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    const payload = Position({ x: 5 });
    expect(payload.token).toBe(Position);
  });

  it('should not mutate defaults between calls', () => {
    const Position = defineComponent('Position', { x: 0, y: 0 });
    const p1 = Position();
    p1.data.x = 999;
    const p2 = Position();
    expect(p2.data.x).toBe(0);
  });

  it('should give different ids to different components', () => {
    const A = defineComponent('A', { a: 0 });
    const B = defineComponent('B', { b: 0 });
    expect(A.id).not.toBe(B.id);
  });
});
