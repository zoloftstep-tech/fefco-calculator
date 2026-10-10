import { centroid, type Pt } from "@/lib/math";
import { facesFrom, netFromPanels, structuralCount, type NetModel, type WorldFace } from "@/lib/fold";
import { mailerMetrics, mailerPanels, lugSpans } from "@/lib/boxes/mailer0427";
import { rscFaces, rscNet } from "@/lib/boxes/rsc0201";
import { sleeveMetrics, sleeveFaces, sleeveNet } from "@/lib/boxes/sleeve0215";
import { trayMetrics, trayPanels } from "@/lib/boxes/tray0422";
import { wrapMetrics, wrapPanels } from "@/lib/boxes/wrap0470";
import { wrap471Metrics, wrap471Panels } from "@/lib/boxes/wrap0471";
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
      "FEFCO 0427. Сначала сгибаются ушки крышки, крышка опускается, ушки входят внутрь. Затем сгибаются ушки клапана, клапан закрывает перед, а ушки встают между торцом и закаткой.",
    selfAssembly: true,
    formula: "дно Д × Ш, закатка торцов 2 × В, крышка Ш и клапан",
    defaults: { L: 300, W: 200, H: 80, G: 0, T: 1.5 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Корпус", detail: "стенки и двойная закатка", at: 0.44 },
      { title: "Ушки крышки", detail: "сначала сгибаются", at: 0.56 },
      { title: "Крышка", detail: "опускается", at: 0.68 },
      { title: "Ушки внутрь", detail: "входят в коробку", at: 0.8 },
      { title: "Ушки клапана", detail: "сгибаются", at: 0.86 },
      { title: "Клапан", detail: "закрывает перед", at: 0.94 },
      { title: "В закатку", detail: "между торцом и закаткой", at: 1 },
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
    defaults: { L: 280, W: 200, H: 60, G: 0, T: 1.5 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "короткие стенки", at: 0.18 },
      { title: "Косынки", detail: "внутрь углов", at: 0.3 },
      { title: "Длинные стенки", detail: "снаружи косынок", at: 0.48 },
      { title: "Замки", detail: "поверх косынок", at: 0.68 },
      { title: "Крючки", detail: "в прорези дна", at: 1 },
    ],
  },
  "0470": {
    id: "0470",
    code: "0470",
    title: "Обёртка с замком крышки",
    group: "04 · папка",
    summary:
      "FEFCO 0470. Торцы с двойной биговкой и язычками в дно, внутренние клапаны дна, кромка переда под язычок. Крылья крышки и клапан заходят в карманы закатки.",
    selfAssembly: true,
    formula: "дно, TOE-торцы, клапаны дна, крышка и язычок",
    defaults: { L: 310, W: 150, H: 100, G: 0, T: 1.5 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "двойная закатка", at: 0.26 },
      { title: "Кромка", detail: "карман под язычок", at: 0.42 },
      { title: "Крышка", detail: "крылья ещё снаружи", at: 0.66 },
      { title: "Крылья", detail: "в карман торца", at: 0.8 },
      { title: "Клапан", detail: "перед стенкой", at: 0.9 },
      { title: "Язычок", detail: "в переднюю кромку", at: 1 },
    ],
  },
  "0471": {
    id: "0471",
    code: "0471",
    title: "Обёртка со скруглённой крышкой",
    group: "04 · папка",
    summary:
      "FEFCO 0471. Торцы с двойной биговкой, крышка со скруглёнными ушками в карманы закатки, затем скруглённый клапан на перед (каталог Essential Image).",
    selfAssembly: true,
    formula: "дно Д × Ш, TOE-торцы, крышка с ушками и скруглённый клапан",
    defaults: { L: 300, W: 160, H: 90, G: 0, T: 1.5 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "двойная закатка", at: 0.36 },
      { title: "Ушки крышки", detail: "сгибаются", at: 0.52 },
      { title: "Крышка", detail: "ушки ещё снаружи", at: 0.64 },
      { title: "Ушки внутрь", detail: "внутрь от закатки", at: 0.78 },
      { title: "Клапан", detail: "скруглённый, перед стенкой", at: 1 },
    ],
  },
  "0215": {
    id: "0215",
    code: "0215",
    title: "Дно 1-2-3 и крышка",
    group: "02 · складная с замком",
    summary:
      "Склеенный рукав. Снизу сначала клапан со шлицем, затем пыльники закрывают рожки, затем язычок входит в шлиц. Сверху пыльники, крышка и клапан перед стенкой.",
    selfAssembly: false,
    formula: "[2 × (Д + Ш) + клапан] × (пыльники + В + крышка)",
    defaults: { L: 300, W: 200, H: 140, G: 30, T: 1.5 },
    stages: [
      { title: "Открыта", detail: "рукав уже склеен", at: 0 },
      { title: "Шлиц", detail: "клапан со шлицем", at: 0.2 },
      { title: "Пыльники", detail: "закрывают рожки", at: 0.38 },
      { title: "Язычок", detail: "входит в шлиц", at: 0.56 },
      { title: "Верх", detail: "пыльники крышки", at: 0.7 },
      { title: "Крышка", detail: "клапан перед стенкой", at: 1 },
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
    defaults: { L: 300, W: 200, H: 150, G: 30, T: 1.5 },
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
  return facesFrom(panelsFor(id, dims), t);
}

export function getNet(id: BoxId, dims: Dims): NetModel {
  if (id === "0201") return rscNet(dims);
  if (id === "0215") return sleeveNet(dims);
  return netFromPanels(panelsFor(id, dims));
}

function panelsFor(id: BoxId, dims: Dims) {
  if (id === "0422") return trayPanels(dims);
  if (id === "0427") return mailerPanels(dims);
  if (id === "0471") return wrap471Panels(dims);
  return wrapPanels(dims);
}

export function panelCount(id: BoxId, dims: Dims) {
  if (id === "0201" || id === "0215") return getNet(id, dims).panels.filter((panel) => panel.tone !== "slot").length;
  return structuralCount(panelsFor(id, dims));
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
  if ((id === "0470" || id === "0471") && d.W < d.H * 0.6) {
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
    return `биговка ${fmtMm(m.bridge)} мм, закатка ${fmtMm(m.roll)} мм, клапан ${fmtMm(m.tuck)} мм`;
  }
  if (id === "0471") {
    const m = wrap471Metrics(d);
    return `клапан ${fmtMm(m.flap)} мм, ушко ${fmtMm(m.ear)} мм, биговка ${fmtMm(m.bridge)} мм`;
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
