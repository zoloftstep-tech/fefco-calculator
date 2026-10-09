import { centroid, type Pt } from "@/lib/math";
import { facesFrom, netFromPanels, structuralCount, type NetModel, type WorldFace } from "@/lib/fold";
import { mailerMetrics, mailerPanels, lugSpans } from "@/lib/boxes/mailer0427";
import { rscFaces, rscNet } from "@/lib/boxes/rsc0201";
import { sleeveMetrics, sleeveFaces, sleeveNet } from "@/lib/boxes/sleeve0215";
import { trayMetrics, trayPanels } from "@/lib/boxes/tray0422";
import { wrapMetrics, wrapPanels } from "@/lib/boxes/wrap0470";
import type { BoxId, BoxMeta, Dims } from "@/lib/fefco-types";

export type { BoxId, BoxMeta, Dims, Stage } from "@/lib/fefco-types";
export type { FaceFill, NetModel, PanelTone, WorldFace } from "@/lib/fold";

export const CATALOG: Record<BoxId, BoxMeta> = {
  "0427": {
    id: "0427",
    code: "0427",
    title: "Почтовая с крышкой",
    group: "04 · папка, закатные торцы",
    summary:
      "FEFCO 0427, roll-end tuck top. Торцы закатываются внутрь и садятся язычками в прорези дна, крышка закрывает верх, боковые ушки опускаются у торцов, клапан заправляется за переднюю стенку.",
    selfAssembly: true,
    formula: "дно Д × Ш, закатка торцов 2 × В, крышка Ш и клапан",
    defaults: { L: 300, W: 200, H: 80, G: 0 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Перед и зад", detail: "стенки вверх", at: 0.18 },
      { title: "Торцы", detail: "наружная стенка", at: 0.34 },
      { title: "Закатка", detail: "внутрь и в дно", at: 0.64 },
      { title: "Крышка", detail: "накрывает верх", at: 0.86 },
      { title: "Клапан", detail: "за переднюю стенку", at: 1 },
    ],
  },
  "0422": {
    id: "0422",
    code: "0422",
    title: "Лоток с двойными стенками",
    group: "04 · лоток без крышки",
    summary:
      "Длинные стенки складываются пополам, язычки внутренней стенки входят в прорези дна. На коротких торцах косынки зажимаются между наружной стенкой и замком. Клей не нужен.",
    selfAssembly: true,
    formula: "дно Д × Ш, двойные длинные стенки, косынки 0,45 × Ш",
    defaults: { L: 280, W: 200, H: 60, G: 0 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "короткие стенки", at: 0.24 },
      { title: "Косынки", detail: "внутрь углов", at: 0.4 },
      { title: "Длинные стенки", detail: "снаружи косынок", at: 0.58 },
      { title: "Замки", detail: "язычки в дно", at: 1 },
    ],
  },
  "0470": {
    id: "0470",
    code: "0470",
    title: "Обёртка с замком крышки",
    group: "04 · папка",
    summary:
      "Лист оборачивает коробку без клея. Ушки торцов заходят внутрь, у передней стенки есть внутренняя кромка, язычок крышки садится в этот замок.",
    selfAssembly: true,
    formula: "дно, четыре стенки, ушки, крышка и один язычок",
    defaults: { L: 310, W: 150, H: 100, G: 0 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Стенки", detail: "торцы и перед", at: 0.26 },
      { title: "Ушки", detail: "внутрь углов", at: 0.48 },
      { title: "Крышка", detail: "крылья вниз", at: 0.8 },
      { title: "Язычок", detail: "в передний замок", at: 1 },
    ],
  },
  "0215": {
    id: "0215",
    code: "0215",
    title: "Дно 1-2-3 и крышка",
    group: "02 · складная с замком",
    summary:
      "Склеенный рукав. Снизу сначала пыльники, затем клапан со шлицем и клапан с язычком. Сверху полная крышка на длинной стороне и клапан внутрь передней стенки.",
    selfAssembly: false,
    formula: "[2 × (Д + Ш) + клапан] × (пыльники + В + крышка)",
    defaults: { L: 300, W: 200, H: 140, G: 30 },
    stages: [
      { title: "Открыта", detail: "рукав уже склеен", at: 0.02 },
      { title: "Пыльники", detail: "короткие снизу", at: 0.26 },
      { title: "Замок дна", detail: "шлиц и язычок", at: 0.62 },
      { title: "Верх", detail: "пыльники крышки", at: 0.76 },
      { title: "Крышка", detail: "клапан внутрь", at: 1 },
    ],
  },
  "0201": {
    id: "0201",
    code: "0201",
    title: "Четырёхклапанная",
    group: "02 · складные коробки",
    summary:
      "Классический рукав FEFCO 0201. Клеевой клапан соединяет обечайку, верх закрывается в два шага: сначала малые клапаны, затем большие поверх них.",
    selfAssembly: false,
    formula: "[2 × (Д + Ш) + клапан] × (В + Ш)",
    defaults: { L: 300, W: 200, H: 150, G: 30 },
    stages: [
      { title: "Открыта", detail: "клапаны наружу", at: 0.04 },
      { title: "Малые клапаны", detail: "Ш-стороны", at: 0.5 },
      { title: "Большие клапаны", detail: "ложатся сверху", at: 1 },
    ],
  },
};

export function getFaces(id: BoxId, dims: Dims, t: number, yaw = 0): WorldFace[] {
  if (id === "0201") return rscFaces(dims, t, yaw);
  if (id === "0215") return sleeveFaces(dims, t);
  const panels =
    id === "0422" ? trayPanels(dims) : id === "0427" ? mailerPanels(dims) : wrapPanels(dims);
  return facesFrom(panels, t);
}

export function getNet(id: BoxId, dims: Dims): NetModel {
  if (id === "0201") return rscNet(dims);
  if (id === "0215") return sleeveNet(dims);
  const panels = id === "0422" ? trayPanels(dims) : id === "0427" ? mailerPanels(dims) : wrapPanels(dims);
  return netFromPanels(panels);
}

export function panelCount(id: BoxId, dims: Dims) {
  if (id === "0201" || id === "0215") return getNet(id, dims).panels.filter((panel) => panel.tone !== "slot").length;
  const panels = id === "0422" ? trayPanels(dims) : id === "0427" ? mailerPanels(dims) : wrapPanels(dims);
  return structuralCount(panels);
}

export function warningsFor(id: BoxId, d: Dims) {
  const messages: string[] = [];
  if (id === "0201" || id === "0215") {
    if (d.L < 60 || d.W < 60 || d.H < 30) {
      messages.push("Размер меньше минимума 60 × 60 × 30 мм.");
    }
    if (d.L < d.W) {
      messages.push("Лучше держать Д ≥ Ш: иначе встречные клапаны пересекаются.");
    }
    if (d.L + d.W > 3140) {
      messages.push("Д + Ш больше 3140 мм — заготовка шире типичного формата листа.");
    }
    if (d.H + d.W > 1390 && id === "0201") {
      messages.push("В + Ш больше 1390 мм — заготовка выше типичного формата листа.");
    }
    if (d.G === 0) {
      messages.push("Клеевого клапана нет. Стык обечайки нужно закрыть отдельно.");
    }
    if (d.G >= Math.min(d.L, d.W)) {
      messages.push("Клеевой клапан слишком широк относительно стенок.");
    }
    if (id === "0215" && d.H > d.L) {
      messages.push("Клапан крышки рассчитан на высоту не больше длины.");
    }
    return messages;
  }

  if (d.L < 80 || d.W < 50 || d.H < 20) {
    messages.push("Для ручной сборки удобнее размеры не меньше 80 × 50 × 20 мм.");
  }
  if (d.H > Math.min(d.L, d.W)) {
    messages.push("Высота больше меньшей стороны. Замки рассчитаны на коробку, где В меньше Д и Ш.");
  }
  if (id === "0427" && d.H > d.L) {
    messages.push("При В > Д закатке торца может понадобиться дополнительный сгиб.");
  }
  if (id === "0427" && lugSpans(d.W).length === 0) {
    messages.push("Ширина меньше 50 мм — язычки закатки не помещаются.");
  }
  if (id === "0422" && trayMetrics(d).taper * 2 > d.L - 4) {
    messages.push("Косынки почти встречаются. Увеличьте длину или уменьшите ширину.");
  }
  if (id === "0470" && d.W < d.H * 0.6) {
    messages.push("Крылья крышки садятся увереннее, когда ширина не меньше высоты.");
  }
  return messages;
}

export function flapNote(id: BoxId, d: Dims) {
  if (id === "0201") return `клапаны по ${fmtMm(d.W / 2)} мм`;
  if (id === "0215") {
    const m = sleeveMetrics(d);
    return `пыльник ${fmtMm(m.dust)} мм, язычок дна ${fmtMm(m.tongue)} мм`;
  }
  if (id === "0422") {
    const m = trayMetrics(d);
    return `косынки ${fmtMm(m.taper)} мм, язычков ${m.tongues}`;
  }
  if (id === "0427") {
    const m = mailerMetrics(d);
    return `закатка ${fmtMm(m.roll)} мм, клапан ${fmtMm(m.tuck)} мм`;
  }
  const m = wrapMetrics(d);
  return `язычок ${fmtMm(m.tongue)} × ${fmtMm(m.tongueW)} мм`;
}

function fmtMm(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
}

export function serializeNet(net: NetModel, title: string, note: string) {
  const cuts = net.cuts
    .map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)
    .join("");
  const folds = net.folds
    .map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${net.width}mm" height="${net.height}mm" viewBox="0 0 ${net.width} ${net.height}">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(note)}</desc>
  <g id="cut" fill="none" stroke="#000" stroke-width="0.25">${cuts}</g>
  <g id="crease" fill="none" stroke="#cf5656" stroke-width="0.25" stroke-dasharray="3 2">${folds}</g>
</svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function panelCentroid(points: Pt[]) {
  return centroid(points);
}
