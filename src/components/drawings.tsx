"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  panelCentroid,
  type NetModel,
  type PanelTone,
  type WorldFace,
} from "@/lib/fefco";
import { fmt, type Pt, type Vec3 } from "@/lib/math";
import { VIEW_H, VIEW_W, type Fit } from "@/lib/project";
import { paintModel } from "@/lib/raster";

const TONE: Record<PanelTone, string> = {
  body: "#e7ece8",
  flap: "#f4f7f5",
  lock: "#c5d0cb",
  lid: "#eef3f0",
  glue: "#d5ded9",
  floor: "#dce3df",
  slot: "#24312c",
};

function pts(points: [number, number][]) {
  return points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
}

function Arrow({ id }: { id: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
      markerUnits="userSpaceOnUse"
    >
      <path d="M 0 1 L 10 5 L 0 9 L 3 5 Z" fill="#222" />
    </marker>
  );
}

function Dimension({
  a,
  b,
  fromA,
  fromB,
  label,
  marker,
  fontSize = 15,
}: {
  a: [number, number];
  b: [number, number];
  fromA?: [number, number];
  fromB?: [number, number];
  label: string;
  marker: string;
  fontSize?: number;
}) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 10) return null;
  let rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (rotation > 90) rotation -= 180;
  if (rotation < -90) rotation += 180;
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const extend = (origin: [number, number], target: [number, number]) => {
    const vx = target[0] - origin[0];
    const vy = target[1] - origin[1];
    const d = Math.hypot(vx, vy) || 1;
    return [target[0] + (vx / d) * 7, target[1] + (vy / d) * 7] as [number, number];
  };

  return (
    <g>
      {fromA && fromB && (
        <>
          <line
            x1={fromA[0]}
            y1={fromA[1]}
            x2={extend(fromA, a)[0]}
            y2={extend(fromA, a)[1]}
            stroke="#555"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={fromB[0]}
            y1={fromB[1]}
            x2={extend(fromB, b)[0]}
            y2={extend(fromB, b)[1]}
            stroke="#555"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke="#222"
        strokeWidth={1.05}
        vectorEffect="non-scaling-stroke"
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={mid[0]}
        y={mid[1] - fontSize * 0.55}
        textAnchor="middle"
        fill="#242424"
        fontSize={fontSize}
        stroke="#fff"
        strokeWidth={Math.max(2.2, fontSize * 0.34)}
        paintOrder="stroke"
        strokeLinejoin="round"
        transform={`rotate(${rotation} ${mid[0]} ${mid[1]})`}
      >
        {label}
      </text>
    </g>
  );
}

export function ModelView({
  faces,
  fit,
  yaw,
  zoom,
  dims,
  dragging,
  onZoom,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: {
  faces: WorldFace[];
  fit: Fit;
  yaw: number;
  zoom: number;
  dims: { L: number; W: number; H: number };
  dragging: boolean;
  onZoom: (direction: 1 | -1) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      onZoom(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoom]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const paint = () => paintModel(canvas, faces, fit, yaw, zoom);
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [faces, fit, yaw, zoom]);

  const screen = (p: Vec3): [number, number] => {
    const [x, y] = fit.toScreen(p, yaw);
    return [VIEW_W / 2 + (x - VIEW_W / 2) * zoom, VIEW_H / 2 + (y - VIEW_H / 2) * zoom];
  };

  const { L, W, H } = dims;
  const gap = Math.max(22, Math.max(L, W, H) * 0.14);
  const barMm = [50, 100, 200, 500, 1000].find((mm) => {
    const px = fit.pxPerMm * 0.86 * zoom * mm;
    return px >= 52 && px <= 168;
  }) ?? 100;
  const barPx = fit.pxPerMm * 0.86 * zoom * barMm;

  return (
    <div
      ref={wrapRef}
      className={`relative h-[300px] w-full max-w-full touch-pan-y select-none sm:h-[460px] lg:h-[520px] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      role="img"
      aria-label="Объёмная сборка коробки"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <Arrow id="model-arrow" />
        </defs>
        <Dimension
          a={screen([0, -gap, 0])}
          b={screen([L, -gap, 0])}
          fromA={screen([0, 0, 0])}
          fromB={screen([L, 0, 0])}
          label={`Д = ${fmt(L)}`}
          marker="model-arrow"
        />
        <Dimension
          a={screen([L + gap, 0, 0])}
          b={screen([L + gap, W, 0])}
          fromA={screen([L, 0, 0])}
          fromB={screen([L, W, 0])}
          label={`Ш = ${fmt(W)}`}
          marker="model-arrow"
        />
        <Dimension
          a={screen([-gap, -gap * 0.35, 0])}
          b={screen([-gap, -gap * 0.35, H])}
          fromA={screen([0, 0, 0])}
          fromB={screen([0, 0, H])}
          label={`В = ${fmt(H)}`}
          marker="model-arrow"
        />
        <g>
          <line x1={28} y1={VIEW_H - 28} x2={28 + barPx} y2={VIEW_H - 28} stroke="#1c2824" strokeWidth={2} />
          <line x1={28} y1={VIEW_H - 34} x2={28} y2={VIEW_H - 22} stroke="#1c2824" strokeWidth={2} />
          <line x1={28 + barPx} y1={VIEW_H - 34} x2={28 + barPx} y2={VIEW_H - 22} stroke="#1c2824" strokeWidth={2} />
          <text x={28 + barPx / 2} y={VIEW_H - 38} textAnchor="middle" fontSize={13} fill="#1c2824">
            {fmt(barMm)} мм
          </text>
        </g>
      </svg>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Отдалить"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() => onZoom(-1)}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Приблизить"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() => onZoom(1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function fitNet(net: NetModel) {
  const gap = Math.max(net.width, net.height) * 0.08;
  const points: Pt[] = [
    [-gap, 0],
    [0, -gap * 0.2],
    [net.width, net.height + gap],
    [net.width + gap * 0.15, 0],
  ];
  for (const panel of net.panels) points.push(...panel.points);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  const scale = Math.min(820 / Math.max(maxX - minX, 1), 360 / Math.max(maxY - minY, 1));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return (p: Pt): [number, number] => [
    450 + (p[0] - midX) * scale,
    210 + (p[1] - midY) * scale,
  ];
}

function panelDimensions(net: NetModel) {
  const spans: {
    a: [number, number];
    b: [number, number];
    fromA: [number, number];
    fromB: [number, number];
    label: string;
  }[] = [];
  const kept: { mx: number; my: number; mm: number; horiz: boolean }[] = [];
  const consider = (
    a: [number, number],
    b: [number, number],
    fromA: [number, number],
    fromB: [number, number],
    mm: number,
    horiz: boolean,
  ) => {
    if (mm < 22) return;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const duplicate = kept.some(
      (item) => item.horiz === horiz && Math.abs(item.mm - mm) < 0.8 && Math.hypot(item.mx - mx, item.my - my) < 18,
    );
    if (duplicate) return;
    kept.push({ mx, my, mm, horiz });
    spans.push({ a, b, fromA, fromB, label: `${fmt(mm)} мм` });
  };

  for (const panel of net.panels) {
    if (panel.tone === "slot") continue;
    const xs = panel.points.map((point) => point[0]);
    const ys = panel.points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    if (width >= 22 && height >= 8) {
      const y = height >= 36 ? minY + Math.min(14, height * 0.22) : minY - 9;
      consider([minX, y], [maxX, y], [minX, minY], [maxX, minY], width, true);
    }
    if (height >= 22 && width >= 8) {
      const x = width >= 36 ? minX + Math.min(14, width * 0.18) : maxX + 9;
      consider([x, minY], [x, maxY], [minX, minY], [minX, maxY], height, false);
    }
  }
  return spans;
}

function roomy(points: Pt[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  return maxX - minX > 34 && maxY - minY > 16;
}

export function NetView({ net }: { net: NetModel }) {
  const transform = fitNet(net);
  const gap = Math.max(net.width, net.height) * 0.065;
  const spans = panelDimensions(net);
  const [cam, setCam] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const camRef = useRef(cam);
  camRef.current = cam;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * 900;
      const py = ((event.clientY - rect.top) / rect.height) * 440;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      setCam((current) => {
        const k = Math.min(8, Math.max(0.45, current.k * factor));
        const ratio = k / current.k;
        return { k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const font = 13 / cam.k;
  const reset = () => setCam({ k: 1, x: 0, y: 0 });
  const zoomBy = (direction: 1 | -1) => {
    setCam((current) => {
      const k = Math.min(8, Math.max(0.45, current.k * (direction > 0 ? 1.12 : 1 / 1.12)));
      const ratio = k / current.k;
      return { k, x: 450 - (450 - current.x) * ratio, y: 220 - (220 - current.y) * ratio };
    });
  };

  return (
    <div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox="0 0 900 440"
          className="h-[280px] w-full max-w-full touch-none cursor-grab sm:h-[420px] active:cursor-grabbing"
          role="img"
          aria-label="Развёртка коробки"
          onDoubleClick={reset}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { px: event.clientX, py: event.clientY, x: camRef.current.x, y: camRef.current.y };
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            const svg = svgRef.current;
            if (!start || !svg) return;
            const rect = svg.getBoundingClientRect();
            const dx = ((event.clientX - start.px) / rect.width) * 900;
            const dy = ((event.clientY - start.py) / rect.height) * 440;
            setCam({ k: camRef.current.k, x: start.x + dx, y: start.y + dy });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <Arrow id="net-arrow" />
          </defs>
          <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            {net.panels.map((panel, index) => (
              <polygon key={index} points={pts(panel.points.map(transform))} fill={TONE[panel.tone]} />
            ))}
            {net.cuts.map(([a, b], index) => {
              const p = transform(a);
              const q = transform(b);
              return (
                <line
                  key={`c${index}`}
                  x1={p[0]}
                  y1={p[1]}
                  x2={q[0]}
                  y2={q[1]}
                  stroke="#343434"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {net.folds.map(([a, b], index) => {
              const p = transform(a);
              const q = transform(b);
              return (
                <line
                  key={`f${index}`}
                  x1={p[0]}
                  y1={p[1]}
                  x2={q[0]}
                  y2={q[1]}
                  stroke="#cf5656"
                  strokeWidth={1.1}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {net.panels.map((panel, index) => {
              if (!panel.label || !roomy(panel.points)) return null;
              const c = transform(panelCentroid(panel.points));
              return (
                <text
                  key={`t${index}`}
                  x={c[0]}
                  y={c[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14 / cam.k}
                  fill="#24312c"
                >
                  {panel.label}
                </text>
              );
            })}
            {spans.map((span, index) => (
              <Dimension
                key={`d${index}`}
                a={transform(span.a)}
                b={transform(span.b)}
                fromA={transform(span.fromA)}
                fromB={transform(span.fromB)}
                label={span.label}
                marker="net-arrow"
                fontSize={font}
              />
            ))}
            <Dimension
              a={transform([0, net.height + gap])}
              b={transform([net.width, net.height + gap])}
              fromA={transform([0, net.height])}
              fromB={transform([net.width, net.height])}
              label={`${fmt(net.width)} мм`}
              marker="net-arrow"
              fontSize={font}
            />
            <Dimension
              a={transform([-gap, 0])}
              b={transform([-gap, net.height])}
              fromA={transform([0, 0])}
              fromB={transform([0, net.height])}
              label={`${fmt(net.height)} мм`}
              marker="net-arrow"
              fontSize={font}
            />
          </g>
        </svg>
        <div className="absolute right-2 top-2 flex gap-1">
          <Button type="button" variant="outline" size="icon" aria-label="Отдалить развёртку" onClick={() => zoomBy(-1)}>
            <Minus />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Приблизить развёртку" onClick={() => zoomBy(1)}>
            <Plus />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Весь чертёж" onClick={reset}>
            <span className="text-xs font-medium">1:1</span>
          </Button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-[#5c6b66]">
        Колёсико приближает развёртку, перетаскивание сдвигает лист. Двойной щелчок возвращает весь чертёж. Размеры — в миллиметрах.
      </p>
    </div>
  );
}
