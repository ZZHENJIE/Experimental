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
import type { ZhongShu } from "../lib/chan/types";

/**
 * 中枢矩形绘制 Primitive（lightweight-charts 无原生矩形 API，需求 5.4）。
 * 以半透明色块 + 1px 边框绘制 [ZD, ZG] 区间，横向锚定 startTime → endTime，
 * 纵向锚定 zd / zg，缩放平移自动跟随；zOrder 为 bottom（画在 K 线下方）。
 * 延伸的中枢只画一个矩形（endTime 随延伸向右扩展）。
 */
export class HubRectPrimitive implements ISeriesPrimitive<Time> {
  private _zhongshus: ZhongShu[] = [];
  private _params: SeriesAttachedParameter<Time, SeriesType> | null = null;
  private _paneView: IPrimitivePaneView;
  private _rendererCache: IPrimitivePaneRenderer | null = null;

  constructor(fillColor = "rgba(255, 193, 7, 0.15)", borderColor = "#ffc107") {
    this._fillColor = fillColor;
    this._borderColor = borderColor;
    this._paneView = {
      renderer: () => this._renderer(),
      zOrder: () => "bottom",
    };
  }

  private _fillColor: string;
  private _borderColor: string;

  setZhongShus(zhongshus: ZhongShu[]): void {
    this._zhongshus = zhongshus;
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
    if (!params || this._zhongshus.length === 0) return;
    const { chart, series } = params as {
      chart: IChartApi;
      series: ISeriesApi<SeriesType>;
    };

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const width = scope.mediaSize.width;
      const ts = chart.timeScale();
      const visible = ts.getVisibleRange();

      for (const zs of this._zhongshus) {
        const yZg = series.priceToCoordinate(zs.zg);
        const yZd = series.priceToCoordinate(zs.zd);
        if (yZg === null || yZd === null) continue;

        // 区间整体在可视范围外 → 跳过（本应用 UTCTimestamp，可直接按数值比较）
        if (visible) {
          if (zs.endTime < (visible.from as number)) continue;
          if (zs.startTime > (visible.to as number)) continue;
        }

        const x1raw = ts.timeToCoordinate(zs.startTime as Time);
        const x2raw = ts.timeToCoordinate(zs.endTime as Time);
        // 一端在可视范围外 → 裁剪到画布边缘
        const x1 = x1raw ?? 0;
        const x2 = x2raw ?? width;
        if (x2 <= x1) continue;

        const top = Math.min(yZg, yZd);
        const height = Math.abs(yZd - yZg);

        ctx.fillStyle = this._fillColor;
        ctx.fillRect(x1, top, x2 - x1, height);

        ctx.strokeStyle = this._borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, top + 0.5, x2 - x1 - 1, Math.max(1, height - 1));
      }
    });
  }
}
