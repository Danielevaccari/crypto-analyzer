import { useNowSec } from '../hooks/useNow';
import { RANGE_PRESETS, resolveRange, toIsoDate, HISTORY_START } from '../lib/ranges';
import { Segmented } from './ui';

/** Preset segmented control plus custom from/to inputs. `value` is a preset id or "yyyy-mm-dd..yyyy-mm-dd". */
export default function RangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const now = useNowSec();
  const { start, end } = resolveRange(value, now);
  const isPreset = RANGE_PRESETS.some((p) => p.id === value);
  const today = toIsoDate(now);
  const setCustom = (from: string, to: string) => {
    if (from && to) onChange(`${from}..${to}`);
  };
  return (
    <div className="toolbar">
      <Segmented
        label="Date range"
        size="sm"
        value={isPreset ? value : 'custom'}
        onChange={(v) => v !== 'custom' && onChange(v)}
        options={[...RANGE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Custom' }]}
      />
      <span className="toolbar" style={{ gap: 4 }}>
        <input
          className="input"
          type="date"
          aria-label="From date"
          min={HISTORY_START}
          max={today}
          value={toIsoDate(start)}
          onChange={(e) => setCustom(e.target.value, toIsoDate(end))}
        />
        <span className="muted">–</span>
        <input
          className="input"
          type="date"
          aria-label="To date"
          min={HISTORY_START}
          max={today}
          value={toIsoDate(end)}
          onChange={(e) => setCustom(toIsoDate(start), e.target.value)}
        />
      </span>
    </div>
  );
}
