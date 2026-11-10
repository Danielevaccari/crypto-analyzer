import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Point } from '../../lib/analysis/indicators';
import { fmtCompact, fmtDate, fmtPct, fmtPrice, priceDecimals, trendClass } from '../../lib/format';
import type { Candle, Quote } from '../../lib/types';
import { ChartSyncContext, nearestBarIndex, type SyncMember } from './sync';
import { alpha, baseOptions, useChartColors } from './theme';

export interface Overlay {
  id: string;
  label: string;
  data: Point[];
  color: string;
}

export interface Band {
  from: number;
  to: number;
  color: string;
}

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text: string;
}

interface Props {
  candles: Candle[];
  quote: Quote;
  type?: 'candles' | 'area';
  intraday?: boolean;
  /** Bars to apply on top of `candles` in real time (last bar updates or new bars). */
  liveBars?: Candle[];
  overlays?: Overlay[];
  rsi?: Point[] | null;
  bands?: Band[];
  markers?: ChartMarker[];
  /** Zoom to this range (UTC seconds); null fits all data. */
  focus?: { from: number; to: number } | null;
  /** Pixels, or a CSS size such as "100%" to fill the parent. */
  height?: number | string;
}

const ts = (t: number) => t as UTCTimestamp;

// Stable defaults: fresh `[]` literals would re-run the effects below on every render.
const NO_OVERLAYS: Overlay[] = [];
const NO_BANDS: Band[] = [];
const NO_MARKERS: ChartMarker[] = [];

export default function PriceChart({
  candles,
  quote,
  type = 'candles',
  intraday = false,
  liveBars,
  overlays = NO_OVERLAYS,
  rsi = null,
  bands = NO_BANDS,
  markers = NO_MARKERS,
  focus = null,
  height = 420,
}: Props) {
  const colors = useChartColors();
  const sync = useContext(ChartSyncContext);
  const candlesRef = useRef(candles);
  useEffect(() => {
    candlesRef.current = candles;
  });
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const main = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const volume = useRef<ISeriesApi<'Histogram'> | null>(null);
  const band = useRef<ISeriesApi<'Histogram'> | null>(null);
  const rsiSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const overlaySeries = useRef(new Map<string, ISeriesApi<'Line'>>());
  const markerApi = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastTime = useRef(0);
  const [hover, setHover] = useState<Candle | null>(null);
  const hasRsi = rsi !== null;
  const overlayKey = overlays.map((o) => o.id).join();

  // Build the chart. Rebuilt only when its structure (type, panes, overlays, theme) changes.
  useLayoutEffect(() => {
    const el = box.current!;
    const c = createChart(el, baseOptions(colors, { intraday }));
    chart.current = c;

    // Shaded time ranges: a full-height histogram on its own hidden scale, drawn behind everything.
    band.current = c.addSeries(HistogramSeries, {
      priceScaleId: 'band',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });
    c.priceScale('band').applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });

    volume.current = c.addSeries(HistogramSeries, {
      priceScaleId: 'vol',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: 'volume' },
    });
    c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });

    main.current =
      type === 'candles'
        ? c.addSeries(CandlestickSeries, {
            upColor: colors.up,
            downColor: colors.down,
            wickUpColor: colors.up,
            wickDownColor: colors.down,
            borderVisible: false,
            priceLineStyle: LineStyle.Dotted,
          })
        : c.addSeries(AreaSeries, {
            lineColor: colors.accent,
            topColor: alpha(colors.accent, 0.1),
            bottomColor: alpha(colors.accent, 0.1),
            lineWidth: 2,
            priceLineStyle: LineStyle.Dotted,
          });
    c.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: 0.2 } });

    overlaySeries.current.clear();
    for (const o of overlays) {
      overlaySeries.current.set(
        o.id,
        c.addSeries(LineSeries, { color: o.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }),
      );
    }

    rsiSeries.current = null;
    if (hasRsi) {
      const r = c.addSeries(LineSeries, { color: colors.accent, lineWidth: 1, priceLineVisible: false, lastValueVisible: true }, 1);
      r.createPriceLine({ price: 70, color: colors.down, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: '' });
      r.createPriceLine({ price: 30, color: colors.up, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: '' });
      c.panes()[1]?.setHeight(90);
      rsiSeries.current = r;
    }

    markerApi.current = createSeriesMarkers(main.current as ISeriesApi<'Area'>, []);
    lastTime.current = 0;

    const member: SyncMember = {
      chart: c,
      series: main.current as ISeriesApi<'Area'>,
      priceAt: (time) => {
        const bars = candlesRef.current;
        const i = nearestBarIndex(bars.map((k) => k.time), time);
        return i < 0 ? undefined : bars[i]!.close;
      },
      showHover: (time) => {
        const bars = candlesRef.current;
        const i = time === undefined ? -1 : nearestBarIndex(bars.map((k) => k.time), time);
        setHover(i < 0 ? null : bars[i]!);
      },
    };
    const unregister = sync?.register(member);
    const onRange = (r: { from: unknown; to: unknown } | null) => sync?.range(member, r ? { from: r.from as number, to: r.to as number } : null);
    if (sync) c.timeScale().subscribeVisibleTimeRangeChange(onRange);

    const onMove = (p: MouseEventParams) => {
      sync?.crosshair(member, p.time === undefined ? undefined : (p.time as number));
      const bar = p.time !== undefined ? p.seriesData.get(main.current!) : undefined;
      const vol = p.time !== undefined ? p.seriesData.get(volume.current!) : undefined;
      if (!bar || p.time === undefined) return setHover(null);
      const b = bar as { open?: number; high?: number; low?: number; close?: number; value?: number };
      const close = b.close ?? b.value ?? 0;
      const next: Candle = {
        time: p.time as number,
        open: b.open ?? close,
        high: b.high ?? close,
        low: b.low ?? close,
        close,
        volume: (vol as { value?: number } | undefined)?.value ?? 0,
      };
      // Setting identical values again would re-render and can re-trigger the crosshair event.
      setHover((prev) =>
        prev && prev.time === next.time && prev.open === next.open && prev.high === next.high && prev.low === next.low && prev.close === next.close && prev.volume === next.volume
          ? prev
          : next,
      );
    };
    c.subscribeCrosshairMove(onMove);
    return () => {
      c.unsubscribeCrosshairMove(onMove);
      if (sync) c.timeScale().unsubscribeVisibleTimeRangeChange(onRange);
      unregister?.();
      c.remove();
      chart.current = null;
    };
    // overlays is represented by overlayKey; data is applied in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, type, intraday, hasRsi, overlayKey, sync]);

  // Main + volume data.
  useLayoutEffect(() => {
    const m = main.current;
    if (!m || !volume.current) return;
    const last = candles[candles.length - 1];
    const precision = priceDecimals(last?.close ?? 1);
    m.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } });
    if (type === 'candles') {
      (m as ISeriesApi<'Candlestick'>).setData(candles.map((k) => ({ time: ts(k.time), open: k.open, high: k.high, low: k.low, close: k.close })));
    } else {
      (m as ISeriesApi<'Area'>).setData(candles.map((k) => ({ time: ts(k.time), value: k.close })));
    }
    volume.current.setData(
      candles.map((k) => ({ time: ts(k.time), value: k.volume, color: k.close >= k.open ? colors.upSoft : colors.downSoft })),
    );
    lastTime.current = last?.time ?? 0;
  }, [candles, type, colors, overlayKey, hasRsi, intraday]);

  // Real-time bar updates.
  useEffect(() => {
    const m = main.current;
    if (!m || !volume.current || !liveBars?.length) return;
    for (const k of liveBars) {
      if (k.time < lastTime.current) continue;
      if (type === 'candles') (m as ISeriesApi<'Candlestick'>).update({ time: ts(k.time), open: k.open, high: k.high, low: k.low, close: k.close });
      else (m as ISeriesApi<'Area'>).update({ time: ts(k.time), value: k.close });
      volume.current.update({ time: ts(k.time), value: k.volume, color: k.close >= k.open ? colors.upSoft : colors.downSoft });
      lastTime.current = k.time;
    }
  }, [liveBars, type, colors]);

  useLayoutEffect(() => {
    for (const o of overlays) overlaySeries.current.get(o.id)?.setData(o.data.map((p) => ({ time: ts(p.time), value: p.value })));
  }, [overlays, colors, type, intraday, hasRsi, overlayKey]);

  useLayoutEffect(() => {
    rsiSeries.current?.setData((rsi ?? []).map((p) => ({ time: ts(p.time), value: p.value })));
  }, [rsi, colors, type, intraday, overlayKey]);

  useLayoutEffect(() => {
    const inBand = (t: number) => bands.find((b) => t >= b.from && t <= b.to);
    band.current?.setData(
      bands.length === 0
        ? []
        : candles.map((k) => {
            const b = inBand(k.time);
            return b ? { time: ts(k.time), value: 1, color: b.color } : { time: ts(k.time) };
          }),
    );
  }, [bands, candles, colors, type, intraday, hasRsi, overlayKey]);

  useLayoutEffect(() => {
    markerApi.current?.setMarkers(
      [...markers].sort((a, b) => a.time - b.time).map((m): SeriesMarker<Time> => ({ ...m, time: ts(m.time), size: 1 })),
    );
  }, [markers, colors, type, intraday, hasRsi, overlayKey]);

  // Zoom to the focused range with some padding, or fit everything.
  useLayoutEffect(() => {
    const c = chart.current;
    if (!c || candles.length === 0) return;
    if (focus) {
      const pad = Math.max((focus.to - focus.from) * 0.6, 86_400 * 3);
      const first = candles[0]!.time;
      const last = candles[candles.length - 1]!.time;
      c.timeScale().setVisibleRange({ from: ts(Math.max(first, focus.from - pad)), to: ts(Math.min(last, focus.to + pad)) });
    } else {
      c.timeScale().fitContent();
    }
  }, [focus, candles, colors, type, intraday, hasRsi, overlayKey]);

  const shown = hover ?? candles[candles.length - 1];
  const prev = shown ? candles[candles.findIndex((k) => k.time === shown.time) - 1] : undefined;
  const change = shown && prev ? ((shown.close - prev.close) / prev.close) * 100 : null;

  return (
    <div className="chart" style={{ height: typeof height === 'number' ? height + (hasRsi ? 90 : 0) : height }}>
      {shown && (
        <div className="chart-legend">
          <span className="muted">{intraday ? new Date(shown.time * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : fmtDate(shown.time)}</span>
          {type === 'candles' ? (
            <>
              <span><i>O</i>{fmtPrice(shown.open, quote)}</span>
              <span><i>H</i>{fmtPrice(shown.high, quote)}</span>
              <span><i>L</i>{fmtPrice(shown.low, quote)}</span>
              <span><i>C</i>{fmtPrice(shown.close, quote)}</span>
            </>
          ) : (
            <span>{fmtPrice(shown.close, quote)}</span>
          )}
          {change !== null && <span className={trendClass(change)}>{fmtPct(change)}</span>}
          <span><i>Vol</i>{fmtCompact(shown.volume, quote)}</span>
          {overlays.map((o) => (
            <span key={o.id} className="legend-key" style={{ ['--key' as string]: o.color }}>
              {o.label}
            </span>
          ))}
        </div>
      )}
      <div ref={box} className="chart-canvas" />
    </div>
  );
}
