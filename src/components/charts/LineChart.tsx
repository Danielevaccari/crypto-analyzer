import { createChart, LineSeries, LineStyle, type IChartApi, type ISeriesApi, type MouseEventParams, type UTCTimestamp } from 'lightweight-charts';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Point } from '../../lib/analysis/indicators';
import { fmtDate } from '../../lib/format';
import { baseOptions, useChartColors } from './theme';

export interface LineDef {
  id: string;
  label: string;
  color: string;
  data: Point[];
}

interface Props {
  lines: LineDef[];
  format: (v: number) => string;
  intraday?: boolean;
  zeroLine?: boolean;
  height?: number;
  /** Keep the latest point in view as data streams in. */
  follow?: boolean;
}

/** Multi-series line chart with a crosshair legend; used for comparisons and live spreads. */
export default function LineChart({ lines, format, intraday = false, zeroLine = false, height = 380, follow = false }: Props) {
  const colors = useChartColors();
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef(new Map<string, ISeriesApi<'Line'>>());
  const [hover, setHover] = useState<{ time: number; values: Map<string, number> } | null>(null);
  const key = lines.map((l) => `${l.id}:${l.color}`).join();

  useLayoutEffect(() => {
    const c = createChart(box.current!, {
      ...baseOptions(colors, { intraday }),
      localization: { ...baseOptions(colors, { intraday }).localization, priceFormatter: format },
    });
    chart.current = c;
    series.current.clear();
    lines.forEach((l, i) => {
      const s = c.addSeries(LineSeries, {
        color: l.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 3,
      });
      if (zeroLine && i === 0) s.createPriceLine({ price: 0, color: colors.muted, lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: '' });
      series.current.set(l.id, s);
    });
    const onMove = (p: MouseEventParams) => {
      if (p.time === undefined) return setHover(null);
      const values = new Map<string, number>();
      for (const [id, s] of series.current) {
        const d = p.seriesData.get(s) as { value?: number } | undefined;
        if (d?.value !== undefined) values.set(id, d.value);
      }
      setHover({ time: p.time as number, values });
    };
    c.subscribeCrosshairMove(onMove);
    return () => {
      c.unsubscribeCrosshairMove(onMove);
      c.remove();
      chart.current = null;
    };
    // `lines` structure is captured by `key`; data is applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, colors, intraday, zeroLine, format]);

  useLayoutEffect(() => {
    for (const l of lines) series.current.get(l.id)?.setData(l.data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    if (!follow) chart.current?.timeScale().fitContent();
  }, [lines, key, colors, intraday, zeroLine, format, follow]);

  const latest = (l: LineDef) => (hover ? hover.values.get(l.id) : l.data[l.data.length - 1]?.value);
  const time = hover?.time ?? Math.max(0, ...lines.map((l) => l.data[l.data.length - 1]?.time ?? 0));

  return (
    <div className="chart" style={{ height }}>
      <div className="chart-legend">
        {time > 0 && (
          <span className="muted">
            {intraday ? new Date(time * 1000).toLocaleTimeString('en-GB') : fmtDate(time)}
          </span>
        )}
        {lines.map((l) => {
          const v = latest(l);
          return (
            <span key={l.id} className="legend-key" style={{ ['--key' as string]: l.color }}>
              {l.label} <b>{v === undefined ? '–' : format(v)}</b>
            </span>
          );
        })}
      </div>
      <div ref={box} className="chart-canvas" />
    </div>
  );
}
