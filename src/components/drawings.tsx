"use client";

import {
  panelCentroid,
  type FaceFill,
  type NetModel,
  type PanelTone,
  type WorldFace,
} from "@/lib/fefco";
import { fmt, type Pt, type Vec3 } from "@/lib/math";
import { VIEW_H, VIEW_W, type Fit } from "@/lib/project";

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

function average(face: WorldFace, depth: (p: Vec3) => number) {
  return face.points.reduce((sum, point) => sum + depth(point), 0) / face.points.length;
}

export function ModelView({
  faces,
  fit,
  yaw,
  dims,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: {
  faces: WorldFace[];
  fit: Fit;
  yaw: number;
  dims: { L: number; W: number; H: number };
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  onDoubleClick: () => void;
}) {
  const screen = (p: Vec3) => fit.toScreen(p, yaw);
  const depth = (p: Vec3) => fit.depth(p, yaw);

  const zs = faces.flatMap((face) => face.points.map((p) => p[2]));
  const flatSheet = zs.length === 0 || Math.max(...zs) - Math.min(...zs) < 1.2;
  const ordered = [...faces].sort((a, b) => {
    if (a.stack !== b.stack) return a.stack - b.stack;
    if (flatSheet) return a.id.localeCompare(b.id);
    const delta = average(a, depth) - average(b, depth);
    return Math.abs(delta) > 0.05 ? delta : a.id.localeCompare(b.id);
  });

  const { L, W, H } = dims;
  const gap = Math.max(22, Math.max(L, W, H) * 0.14);
  const foot = faces
    .filter((face) => face.id === "floor" || face.id.startsWith("floor"))
    .flatMap((face) => face.points.map(screen));
  let footMinX = Infinity;
  let footMaxX = -Infinity;
  let footMinY = Infinity;
  let footMaxY = -Infinity;
  for (const p of foot) {
    footMinX = Math.min(footMinX, p[0]);
    footMaxX = Math.max(footMaxX, p[0]);
    footMinY = Math.min(footMinY, p[1]);
    footMaxY = Math.max(footMaxY, p[1]);
  }

  const barMm = [50, 100, 200, 500, 1000].find((mm) => {
    const px = fit.pxPerMm * 0.86 * mm;
    return px >= 52 && px <= 168;
  }) ?? 100;
  const barPx = fit.pxPerMm * 0.86 * barMm;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`h-[340px] w-full touch-none select-none sm:h-[460px] lg:h-[520px] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      role="img"
      aria-label="Объёмная сборка коробки"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <defs>
        <Arrow id="model-arrow" />
        <filter id="board" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} result="grain" />
          <feColorMatrix in="grain" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="soft">
            <feFuncR type="linear" slope="0.08" intercept="0.94" />
            <feFuncG type="linear" slope="0.08" intercept="0.94" />
            <feFuncB type="linear" slope="0.08" intercept="0.94" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="soft" mode="multiply" result="textured" />
          <feComposite in="textured" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="groundBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <Gradient id="floor" stops={["#d5ddd8", "#e4ebe7", "#c9d3ce"]} />
        <Gradient id="front" stops={["#f7faf8", "#e7ece8", "#d5ded9"]} />
        <Gradient id="side" stops={["#d5ded9", "#b7c2bc"]} />
        <Gradient id="back" stops={["#cfd8d3", "#b7c2bc", "#9aabb3"]} vertical />
        <Gradient id="flap" stops={["#f4f7f5", "#d5ded9"]} />
        <Gradient id="flapDark" stops={["#e3eae6", "#c5d0cb"]} />
        <Gradient id="lock" stops={["#dfe7e3", "#aebbb6"]} />
        <Gradient id="lid" stops={["#f3f7f5", "#dce5e1", "#c5d0cb"]} />
        <Gradient id="tuck" stops={["#d5ded9", "#9eaea8"]} />
      </defs>

      {foot.length > 0 && (
        <ellipse
          cx={(footMinX + footMaxX) / 2 + 8}
          cy={(footMinY + footMaxY) / 2 + 18}
          rx={Math.max((footMaxX - footMinX) * 0.46, 12)}
          ry={Math.max((footMaxY - footMinY) * 0.28, 8)}
          fill="#1c2824"
          opacity={0.12}
          filter="url(#groundBlur)"
        />
      )}

      {ordered.map((face) => (
        <g key={face.id}>
          <title>{face.name}</title>
          <polygon
            points={pts(face.points.map(screen))}
            fill={face.fill === "slot" ? "#24312c" : `url(#${face.fill as FaceFill})`}
            filter={face.fill === "slot" ? undefined : "url(#board)"}
            stroke={face.fill === "slot" ? "#24312c" : "#2c3a36"}
            strokeWidth={face.fill === "slot" ? 0.6 : 1.05}
            strokeLinejoin="round"
          />
        </g>
      ))}

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
  );
}

function Gradient({
  id,
  stops,
  vertical = false,
}: {
  id: string;
  stops: string[];
  vertical?: boolean;
}) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2={vertical ? "0%" : "100%"} y2="100%">
      {stops.map((color, index) => (
        <stop
          key={color}
          offset={`${(index / Math.max(stops.length - 1, 1)) * 100}%`}
          stopColor={color}
        />
      ))}
    </linearGradient>
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
    <svg viewBox="0 0 900 360" className="h-[240px] w-full sm:h-[320px]" role="img" aria-label="Развёртка коробки">
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
