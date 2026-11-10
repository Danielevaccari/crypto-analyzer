import { describe, expect, it } from 'vitest';
import { pulseLabel, pulseScore } from './pulse';

describe('pulseScore', () => {
  it('is high when everything rallies on calm volatility', () => {
    const p = pulseScore({ changes24h: [5, 6, 4, 7], changes7d: [15, 20, 12, 18], vols: [20, 25, 30, 22] });
    expect(p.score).toBeGreaterThan(80);
    expect(p.label).toBe('Extreme greed');
  });
  it('is low when everything falls on wild volatility', () => {
    const p = pulseScore({ changes24h: [-6, -5, -7, -4], changes7d: [-20, -15, -18, -25], vols: [110, 120, 140, 100] });
    expect(p.score).toBeLessThan(20);
    expect(p.label).toBe('Extreme fear');
  });
  it('is neutral with no data and stays within 0..100', () => {
    expect(pulseScore({ changes24h: [], changes7d: [], vols: [] }).score).toBe(50);
    const extreme = pulseScore({ changes24h: [500], changes7d: [900], vols: [0] });
    expect(extreme.score).toBeLessThanOrEqual(100);
  });
  it('re-normalises weights when history is missing', () => {
    const p = pulseScore({ changes24h: [1, -1, 2, -2], changes7d: [], vols: [] });
    expect(p.components).toHaveLength(2);
    expect(p.score).toBeGreaterThan(40);
    expect(p.score).toBeLessThan(60);
  });
  it('labels the five zones', () => {
    expect([10, 30, 50, 70, 90].map(pulseLabel)).toEqual(['Extreme fear', 'Fear', 'Neutral', 'Greed', 'Extreme greed']);
  });
});
