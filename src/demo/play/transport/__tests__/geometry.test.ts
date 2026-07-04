import { describe, it, expect } from 'vitest';
import { dist, lerp, packetWorldPos } from '../../transport/geometry';

describe('geometry helpers', () => {
  describe('dist', () => {
    it('should return 0 for same point', () => {
      expect(dist(0, 0, 0, 0)).toBe(0);
    });

    it('should compute horizontal distance', () => {
      expect(dist(0, 0, 3, 0)).toBe(3);
    });

    it('should compute vertical distance', () => {
      expect(dist(0, 0, 0, 4)).toBe(4);
    });

    it('should compute diagonal distance (3-4-5 triangle)', () => {
      expect(dist(0, 0, 3, 4)).toBe(5);
    });
  });

  describe('lerp', () => {
    it('should return a at t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('should return b at t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('should return midpoint at t=0.5', () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });
  });

  describe('packetWorldPos', () => {
    it('should return origin at pos=0', () => {
      const result = packetWorldPos(0, 0, 100, 200, 0);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return destination at pos=1', () => {
      const result = packetWorldPos(0, 0, 100, 200, 1);
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should return midpoint at pos=0.5', () => {
      const result = packetWorldPos(0, 0, 100, 200, 0.5);
      expect(result).toEqual({ x: 50, y: 100 });
    });
  });
});