import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { Hub } from "../lib/chan/types";

/**
 * 中枢矩形绘制 Primitive（lightweight-charts 无原生矩形 API）。
 * 以半透明色块 + 上下沿描边绘制中枢区间，zOrder 为 bottom（画在 K 线下方）。
 */
export class HubRectPrimitive implements ISeriesPrimitive<Time> {
  private _hubs: Hub[] = [];
  private _params: SeriesAttachedParameter<Time, SeriesType> | null = null;
  private _paneView: IPrimitivePaneView;

  constructor(fillColor = "rgba(76, 141, 255, 0.10)", borderColor = "rgba(76, 141, 255, 0.45)") {
    this._fillColor = fillColor;
    this._borderColor = borderColor;
    this._paneView = {
      renderer: () => this._renderer(),
      zOrder: () => "bottom",
    };
  }

  private _fillColor: string;
  private _borderColor: string;
  private _rendererCache: IPrimitivePaneRenderer | null = null;

  setHubs(hubs: Hub[]): void {
    this._hubs = hubs;
    this._params?.requestUpdate();
  }

  setColors(fillColor: string, borderColor: string): void {
    this._fillColor = fillColor;
    this._borderColor = borderColor;
    this._params?.requestUpdate();
  }

  attached(params: SeriesAttachedParameter<Time, SeriesType>): void {
    this._params = params;
  }

  detached(): void {
    this._params = null;
  }

  updateAllViews(): void {
    // 坐标在 draw 时实时换算，无需缓存失效处理
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  private _renderer(): IPrimitivePaneRenderer {
    this._rendererCache ??= {
      draw: (target: CanvasRenderingTarget2D) => this._draw(target),
    };
    return this._rendererCache;
  }

  private _draw(target: CanvasRenderingTarget2D): void {
    const params = this._params;
    if (!params || this._hubs.length === 0) return;
    const { chart, series } = params as {
      chart: IChartApi;
      series: ISeriesApi<SeriesType>;
    };

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const width = scope.mediaSize.width;
      const ts = chart.timeScale();
      const visible = ts.getVisibleRange();

      for (const hub of this._hubs) {
        const yHigh = series.priceToCoordinate(hub.high);
        const yLow = series.priceToCoordinate(hub.low);
        if (yHigh === null || yLow === null) continue;

        const x1raw = ts.timeToCoordinate(hub.startTime as Time);
        const x2raw = ts.timeToCoordinate(hub.endTime as Time);

        // 区间整体在可视范围外 → 跳过（本应用 UTCTimestamp，可直接按数值比较）
        if (visible) {
          if (hub.endTime < (visible.from as number)) continue;
          if (hub.startTime > (visible.to as number)) continue;
        }

        // 一端在可视范围外 → 裁剪到画布边缘
        const x1 = x1raw ?? 0;
        const x2 = x2raw ?? width;
        if (x2 <= x1) continue;

        const top = Math.min(yHigh, yLow);
        const height = Math.abs(yLow - yHigh);

        ctx.fillStyle = this._fillColor;
        ctx.fillRect(x1, top, x2 - x1, height);
        ctx.strokeStyle = this._borderColor;
        ctx.lineWidth = 1;
        // 上下沿描边
        ctx.beginPath();
        ctx.moveTo(x1, top + 0.5);
        ctx.lineTo(x2, top + 0.5);
        ctx.moveTo(x1, top + height - 0.5);
        ctx.lineTo(x2, top + height - 0.5);
        ctx.stroke();
      }
    });
  }
}
