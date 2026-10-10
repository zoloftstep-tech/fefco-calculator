"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ModelView, NetView } from "@/components/drawings";
import {
  CATALOG,
  flapNote,
  getFaces,
  getNet,
  serializeNet,
  warningsFor,
  type BoxId,
  type Dims,
} from "@/lib/fefco";
import { fmt, fmtArea, type Vec3 } from "@/lib/math";
import { fitPoints } from "@/lib/project";

const PLAY_MS = 9000;
const ORDER: BoxId[] = ["0427", "0422", "0470", "0215", "0201"];

type Fields = { L: string; W: string; H: string; G: string };

const initial = CATALOG["0427"].defaults;

function parseDims(fields: Fields): Dims | null {
  const raw = [fields.L, fields.W, fields.H, fields.G];
  if (raw.some((value) => value.trim() === "")) return null;
  const [L, W, H, G] = raw.map(Number);
  if (![L, W, H, G].every(Number.isFinite)) return null;
  if (L <= 0 || W <= 0 || H <= 0 || G < 0) return null;
  if (!Number.isFinite(L * W * H)) return null;
  return { L, W, H, G };
}

function anchors(dims: Dims): Vec3[] {
  const gap = Math.max(22, Math.max(dims.L, dims.W, dims.H) * 0.14);
  return [
    [0, -gap, 0],
    [dims.L, -gap, 0],
    [dims.L + gap, 0, 0],
    [dims.L + gap, dims.W, 0],
    [-gap, -gap * 0.35, 0],
    [-gap, -gap * 0.35, dims.H],
  ];
}

function activeStage(at: number[], t: number) {
  const index = at.findIndex((value) => t < value - 1e-4);
  return index === -1 ? at.length - 1 : index;
}

export function Calculator() {
  const [typeId, setTypeId] = useState<BoxId>("0427");
  const [zoom, setZoom] = useState(1);
  const nudgeZoom = useCallback((direction: 1 | -1) => {
    setZoom((current) => Math.min(2.6, Math.max(0.55, current * (direction > 0 ? 1.12 : 1 / 1.12))));
  }, []);
  const [fields, setFields] = useState<Fields>({
    L: String(initial.L),
    W: String(initial.W),
    H: String(initial.H),
    G: String(initial.G),
  });
  const view = useRef({
    t: 0,
    yaw: 0.45,
    playing: true,
    dragging: false,
    armDrag: false,
    holdUntil: 0,
  });
  const dragX = useRef(0);
  const dragY = useRef(0);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    const loop = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const state = view.current;
      if (state.playing) {
        state.t = Math.min(1, state.t + dt / PLAY_MS);
        if (state.t >= 1) {
          state.playing = false;
          state.holdUntil = now + 2400;
        }
      } else if (!state.dragging && now > state.holdUntil) {
        state.yaw += ((Math.PI * 2) / 16000) * dt;
      }
      if (now - lastPaint > 32) {
        lastPaint = now;
        setFrame((frame) => (frame + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const meta = CATALOG[typeId];
  const dims = parseDims(fields);
  const t = view.current.t;
  const yaw = view.current.yaw;
  const playing = view.current.playing;
  const faces = dims ? getFaces(typeId, dims, t, yaw) : [];
  const net = dims ? getNet(typeId, dims) : null;
  const length = dims?.L;
  const width = dims?.W;
  const height = dims?.H;
  const glue = dims?.G;
  const fit = useMemo(() => {
    if (length === undefined || width === undefined || height === undefined || glue === undefined) {
      return null;
    }
    const box = { L: length, W: width, H: height, G: glue };
    return fitPoints(
      [
        getFaces(typeId, box, 0).flatMap((face) => face.points),
        getFaces(typeId, box, 1).flatMap((face) => face.points),
        anchors(box),
      ],
      length / 2,
      width / 2,
    );
  }, [typeId, length, width, height, glue]);
  const warnings = dims ? warningsFor(typeId, dims) : [
    "Введите положительные размеры коробки. Клеевой клапан может быть нулевым.",
  ];
  const stageIndex = activeStage(meta.stages.map((stage) => stage.at), t);
  const yawDeg = ((yaw * 180) / Math.PI) % 360;
  const yawShown = Math.round(yawDeg < 0 ? yawDeg + 360 : yawDeg);

  function setField(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function chooseType(id: BoxId) {
    setTypeId(id);
    const usesGlue = id === "0201" || id === "0215";
    if (usesGlue) {
      setFields((current) =>
        Number(current.G) > 0 ? current : { ...current, G: String(CATALOG[id].defaults.G) },
      );
    }
    view.current.t = 0;
    view.current.playing = true;
  }

  function resetSizes() {
    const defaults = CATALOG[typeId].defaults;
    setFields({
      L: String(defaults.L),
      W: String(defaults.W),
      H: String(defaults.H),
      G: String(defaults.G),
    });
    view.current.t = 0;
    view.current.playing = true;
    view.current.yaw = 0.45;
  }

  function togglePlay() {
    const state = view.current;
    if (state.playing) {
      state.playing = false;
      setFrame((frame) => frame + 1);
      return;
    }
    if (state.t >= 0.995) state.t = 0;
    state.playing = true;
    setFrame((frame) => frame + 1);
  }

  function download() {
    if (!net || !dims) return;
    const title = `FEFCO ${meta.code} — ${dims.L} × ${dims.W} × ${dims.H} мм`;
    const xml = serializeNet(
      net,
      title,
      "Идеализированная развёртка по внутренним размерам, без поправки на толщину картона, биговку и прорези. Не является штампом.",
    );
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FEFCO-${meta.code}-${dims.L}x${dims.W}x${dims.H}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const playLabel = playing
    ? "Пауза"
    : t >= 0.995
      ? "Собрать снова"
      : t > 0.02
        ? "Продолжить"
        : "Собрать";

  return (
    <main className="mx-auto min-w-0 max-w-[1460px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-[1.7rem] font-semibold tracking-tight text-[#1c2824] sm:text-3xl">
        Калькулятор FEFCO
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#737b84] sm:text-[15px]">
        Внутренние размеры в миллиметрах задают и развёртку, и сборку.
        0427, 0422 и 0470 складываются с плоского листа. 0201 и 0215 показывают
        уже склеенный рукав: клапаны, дно 1-2-3 и крышку.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ORDER.map((id) => {
          const item = CATALOG[id];
          const selected = id === typeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => chooseType(id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-[#1f6f64] bg-[#f3f7f6] shadow-[0_0_0_1px_#1f6f64]"
                  : "border-[#d5ddd8] bg-white hover:border-[#b7c9c3]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[#252a30]">{item.code}</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    item.selfAssembly
                      ? "bg-[#e5f2ef] text-[#1b5c54]"
                      : "bg-[#eef1ef] text-[#5c6b66]"
                  }`}
                >
                  {item.selfAssembly ? "самосбор" : "клапаны"}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-[#252a30]">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-[#737b84]">{item.group}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#e3e6ea] bg-white p-5 shadow-[0_5px_20px_#26334206]">
          <h2 className="text-lg font-semibold">Размеры коробки</h2>
          <p className="mt-1 text-sm leading-5 text-[#737b84]">{meta.summary}</p>

          <div className="mt-5">
            <DimensionField
              id="length"
              label="Длина — Д, мм"
              value={fields.L}
              min={40}
              max={1200}
              onChange={(value) => setField("L", value)}
            />
            <DimensionField
              id="width"
              label="Ширина — Ш, мм"
              value={fields.W}
              min={40}
              max={800}
              onChange={(value) => setField("W", value)}
            />
            <DimensionField
              id="height"
              label="Высота — В, мм"
              value={fields.H}
              min={20}
              max={600}
              onChange={(value) => setField("H", value)}
            />
            {(typeId === "0201" || typeId === "0215") && (
              <DimensionField
                id="glue"
                label="Клеевой клапан, мм"
                value={fields.G}
                min={0}
                max={80}
                onChange={(value) => setField("G", value)}
              />
            )}
          </div>

          <Button type="button" variant="secondary" onClick={resetSizes}>
            <RotateCcw />
            Сбросить размеры
          </Button>

          <dl className="mt-5 border-t border-[#e3e6ea]">
            <Result label="Внутренние размеры" value={dims ? `${fmt(dims.L)} × ${fmt(dims.W)} × ${fmt(dims.H)} мм` : "—"} />
            <Result label="Объём" value={dims ? `${fmt((dims.L * dims.W * dims.H) / 1e6)} л` : "—"} />
            <Result label="Габариты заготовки" value={net ? `${fmt(net.width)} × ${fmt(net.height)} мм` : "—"} />
            <Result label="Площадь габаритного листа" value={net ? `${fmtArea(net.width * net.height)} м²` : "—"} />
            <Result label="Площадь контура" value={net ? `${fmtArea(net.area)} м²` : "—"} />
            <Result label="Клапаны и замки" value={dims ? flapNote(typeId, dims) : "—"} />
          </dl>

          <div className="mt-3 space-y-2" aria-live="polite">
            {warnings.map((message) => (
              <p key={message} className="rounded-lg bg-[#e7f3f0] px-3 py-2 text-[13px] leading-5 text-[#1b5c54]">
                {message}
              </p>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-[#737b84]">
            Геометрия score-to-score: толщина картона, ширина прорезей и
            производственные зазоры не заложены. Развёртка не заменяет штамп.
            Формула заготовки: {meta.formula}.
          </p>
        </aside>

        <section className="grid min-w-0 gap-5">
          <div className="rounded-2xl border border-[#e3e6ea] bg-white p-4 shadow-[0_5px_20px_#26334206] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {meta.selfAssembly ? "Сборка с листа" : "Закрытие клапанов"}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-xs text-[#68727c]">
                  {meta.code}
                </span>
                <span className="min-w-28 rounded-md bg-[#e5f2ef] px-2.5 py-1 text-center text-xs font-semibold text-[#1b5c54] tabular-nums">
                  Поворот {yawShown}°
                </span>
              </div>
            </div>

            {dims && fit ? (
              <ModelView
                faces={faces}
                fit={fit}
                yaw={yaw}
                zoom={zoom}
                dims={dims}
                dragging={view.current.dragging}
                onZoom={nudgeZoom}
                onPointerDown={(event) => {
                  if (event.button !== 0 && event.pointerType === "mouse") return;
                  dragX.current = event.clientX;
                  dragY.current = event.clientY;
                  if (event.pointerType === "mouse") {
                    view.current.dragging = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    return;
                  }
                  view.current.armDrag = true;
                }}
                onPointerMove={(event) => {
                  if (view.current.armDrag && !view.current.dragging) {
                    const dx = event.clientX - dragX.current;
                    const dy = event.clientY - dragY.current;
                    if (Math.hypot(dx, dy) < 8) return;
                    view.current.armDrag = false;
                    if (Math.abs(dy) > Math.abs(dx)) return;
                    view.current.dragging = true;
                    dragX.current = event.clientX;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                  if (!view.current.dragging) return;
                  const dx = event.clientX - dragX.current;
                  dragX.current = event.clientX;
                  view.current.yaw += dx * 0.01;
                }}
                onPointerUp={() => {
                  view.current.dragging = false;
                  view.current.armDrag = false;
                }}
                onDoubleClick={() => {
                  view.current.yaw = 0.45;
                }}
              />
            ) : (
              <div className="grid h-[340px] place-items-center text-sm text-[#737b84] sm:h-[460px]">
                Модель появится, когда размеры станут положительными.
              </div>
            )}

            <p className="text-center text-xs text-[#5c6b66]">
              Кнопки и колёсико приближают модель. Вертикально страница листается. Поворот — движением вбок, двойной щелчок возвращает ракурс.
            </p>

            <div className="mx-auto mt-4 max-w-3xl">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="assembly">Ход сборки</Label>
                <span className="text-xs tabular-nums text-[#737b84]">{Math.round(t * 100)}%</span>
              </div>
              <Slider
                id="assembly"
                min={0}
                max={1000}
                step={1}
                value={[Math.round(t * 1000)]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  view.current.t = next / 1000;
                  view.current.playing = false;
                  view.current.holdUntil = performance.now() + 5000;
                  setFrame((frame) => frame + 1);
                }}
                aria-label="Ход сборки"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {meta.stages.map((stage, index) => (
                  <button
                    key={stage.title}
                    type="button"
                    onClick={() => {
                      view.current.t = index === 0 ? 0 : stage.at;
                      view.current.playing = false;
                      view.current.holdUntil = performance.now() + 5000;
                      setFrame((frame) => frame + 1);
                    }}
                    className={`min-w-[7.5rem] flex-1 rounded-xl border px-2.5 py-2 text-center text-xs leading-4 ${
                      index === stageIndex
                        ? "border-[#b7d4cc] bg-[#e7f3f0] text-[#1b5c54]"
                        : "border-[#e3e6ea] bg-[#f7f8fa] text-[#737b84]"
                    }`}
                  >
                    <span className="block font-medium">{stage.title}</span>
                    <span className="block text-[11px]">{stage.detail}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <Button type="button" onClick={togglePlay}>
                  {playing ? <Pause /> : <Play />}
                  {playLabel}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3e6ea] bg-white p-4 shadow-[0_5px_20px_#26334206] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Развёртка</h2>
              <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-xs text-[#68727c]">
                {net ? `${fmt(net.width)} × ${fmt(net.height)} мм` : "—"}
              </span>
            </div>
            {net ? <NetView net={net} /> : (
              <div className="grid h-[240px] place-items-center text-sm text-[#737b84]">
                Нет заготовки для текущих размеров.
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-5 text-xs text-[#737b84]">
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block w-7 border-t-2 border-[#343434]" />
                  Рез
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block w-7 border-t-2 border-dashed border-[#cf5656]" />
                  Биговка
                </span>
              </div>
              <Button type="button" onClick={download} disabled={!net}>
                <Download />
                Скачать SVG 1:1
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#737b84]">
              Файл в миллиметрах: чёрный рез и красная биговка, без текстуры и подписей.
              Масштаб модели в окне выше повторяет эти размеры — меняется Д, Ш или В, меняется и коробка.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function DimensionField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const numeric = Number(value);
  const slider = Number.isFinite(numeric)
    ? Math.min(max, Math.max(min, numeric))
    : min;

  return (
    <div className="mb-4">
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 bg-white text-base"
      />
      <Slider
        className="mt-3"
        min={min}
        max={max}
        step={1}
        value={[slider]}
        onValueChange={(next) => {
          const resolved = Array.isArray(next) ? next[0] : next;
          onChange(String(resolved));
        }}
        aria-label={label}
      />
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#e3e6ea] py-3">
      <dt className="text-xs text-[#737b84]">{label}</dt>
      <dd className="mt-1 text-[17px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
