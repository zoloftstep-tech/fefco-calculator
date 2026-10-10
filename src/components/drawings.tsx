"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
}: {
  a: [number, number];
  b: [number, number];
  fromA?: [number, number];
  fromB?: [number, number];
  label: string;
  marker: string;
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
          />
          <line
            x1={fromB[0]}
            y1={fromB[1]}
            x2={extend(fromB, b)[0]}
            y2={extend(fromB, b)[1]}
            stroke="#555"
            strokeWidth={0.8}
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
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={mid[0]}
        y={mid[1] - 8}
        textAnchor="middle"
        fill="#242424"
        fontSize={15}
        stroke="#fff"
        strokeWidth={5}
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
  const scale = Math.min(846 / Math.max(maxX - minX, 1), 300 / Math.max(maxY - minY, 1));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return (p: Pt): [number, number] => [
    450 + (p[0] - midX) * scale,
    180 + (p[1] - midY) * scale,
  ];
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

  return (
    <svg viewBox="0 0 900 360" className="h-[220px] w-full max-w-full sm:h-[320px]" role="img" aria-label="Развёртка коробки">
      <defs>
        <Arrow id="net-arrow" />
      </defs>
      {net.panels.map((panel, index) => (
        <polygon key={index} points={pts(panel.points.map(transform))} fill={TONE[panel.tone]} />
      ))}
      {net.cuts.map(([a, b], index) => {
        const p = transform(a);
        const q = transform(b);
        return (
          <line key={`c${index}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#343434" strokeWidth={1.2} />
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
          />
        );
      })}
      {net.panels.map((panel, index) => {
        if (!panel.label || !roomy(panel.points)) return null;
        const c = transform(panelCentroid(panel.points));
        return (
          <text key={`t${index}`} x={c[0]} y={c[1]} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#24312c">
            {panel.label}
          </text>
        );
      })}
      <Dimension
        a={transform([0, net.height + gap])}
        b={transform([net.width, net.height + gap])}
        fromA={transform([0, net.height])}
        fromB={transform([net.width, net.height])}
        label={`${fmt(net.width)} мм`}
        marker="net-arrow"
      />
      <Dimension
        a={transform([-gap, 0])}
        b={transform([-gap, net.height])}
        fromA={transform([0, 0])}
        fromB={transform([0, net.height])}
        label={`${fmt(net.height)} мм`}
        marker="net-arrow"
      />
    </svg>
  );
}
