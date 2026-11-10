export interface PulseInput {
  /** 24h change of each coin, in percent */
  changes24h: number[];
  /** 7d change of each coin, in percent (may be empty while history loads) */
  changes7d: number[];
  /** Annualised 30d volatility of each coin, in percent (may be empty) */
  vols: number[];
}

export interface PulseComponent {
  label: string;
  /** 0 (bearish) to 100 (bullish) */
  value: number;
  weight: number;
}

export interface Pulse {
  score: number;
  label: string;
  components: PulseComponent[];
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function pulseLabel(score: number): string {
  if (score < 20) return 'Extreme fear';
  if (score < 40) return 'Fear';
  if (score < 60) return 'Neutral';
  if (score < 80) return 'Greed';
  return 'Extreme greed';
}

/**
 * Own composite of market mood, 0 (fear) to 100 (greed). It is not a standard index: it blends
 * how many coins are up (breadth), the average 24h and 7d move, and how calm volatility is.
 * Components without data are skipped and the remaining weights are re-normalised.
 */
export function pulseScore({ changes24h, changes7d, vols }: PulseInput): Pulse {
  const avg24 = mean(changes24h);
  const avg7 = mean(changes7d);
  const avgVol = mean(vols);
  const parts: (PulseComponent | null)[] = [
    changes24h.length ? { label: 'Breadth', value: (changes24h.filter((c) => c > 0).length / changes24h.length) * 100, weight: 0.3 } : null,
    avg24 === null ? null : { label: 'Momentum 24h', value: 50 + 50 * Math.tanh(avg24 / 4), weight: 0.3 },
    avg7 === null ? null : { label: 'Trend 7d', value: 50 + 50 * Math.tanh(avg7 / 10), weight: 0.25 },
    avgVol === null ? null : { label: 'Calm volatility', value: 100 - clamp((avgVol / 120) * 100), weight: 0.15 },
  ];
  const components = parts.filter((p): p is PulseComponent => p !== null);
  const weight = components.reduce((s, c) => s + c.weight, 0);
  const score = weight === 0 ? 50 : clamp(components.reduce((s, c) => s + c.value * c.weight, 0) / weight);
  return { score, label: pulseLabel(score), components };
}
