import { getFaces, getNet, panelCount } from "../src/lib/fefco";
import type { BoxId, Dims } from "../src/lib/fefco-types";

function center(points: [number, number, number][]) {
  const s = points.reduce(
    (a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as [number, number, number],
    [0, 0, 0],
  );
  return s.map((v) => v / points.length) as [number, number, number];
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok", msg);
  }
}

function faceMap(id: BoxId, dims: Dims, t: number, yaw = 0) {
  return Object.fromEntries(getFaces(id, dims, t, yaw).map((face) => [face.id, face]));
}

const d0201: Dims = { L: 300, W: 200, H: 150, G: 30 };
for (const yaw of [0, 0.4, 1.2, 2.2, 3.5, 4.6, 5.6]) {
  const shut = faceMap("0201", d0201, 1, yaw);
  assert(shut["flap-front"].stack > shut["flap-left"].stack, `closed front above left yaw ${yaw.toFixed(2)}`);
  assert(shut["flap-front"].stack > shut["flap-right"].stack, `closed front above right yaw ${yaw.toFixed(2)}`);
  assert(shut["flap-back"].stack > shut["flap-left"].stack, `closed back above left yaw ${yaw.toFixed(2)}`);
  assert(shut["flap-back"].stack > shut["flap-right"].stack, `closed back above right yaw ${yaw.toFixed(2)}`);
}

const openA = faceMap("0201", d0201, 0, 0);
assert(openA["flap-front"].stack > openA["flap-back"].stack, "open mode A: near big flap above far");
const openB = faceMap("0201", d0201, 0, Math.PI);
assert(openB["flap-back"].stack > openB["flap-front"].stack, "open mode B: far big flap above near");

const openFront = center(openA["flap-front"].points);
const shut = faceMap("0201", d0201, 1, 0.4);
const shutFront = center(shut["flap-front"].points);
const shutLeft = center(shut["flap-left"].points);
assert(openFront[1] < 0, `0201 front flap opens outward y=${openFront[1].toFixed(1)}`);
assert(shutFront[1] > 10 && shutFront[1] < 190, `0201 front flap closes y=${shutFront[1].toFixed(1)}`);
assert(Math.abs(shutFront[2] - 150) < 2, `0201 front flap at top z=${shutFront[2].toFixed(1)}`);
assert(shutLeft[2] < shutFront[2] - 0.4, `small flap sits under big z=${shutLeft[2].toFixed(2)}`);

const wide = faceMap("0201", { L: 400, W: 260, H: 80, G: 20 }, 1, 0);
const wideFront = center(wide["flap-front"].points);
assert(Math.abs(wideFront[1] - 65) < 2, `flap depth follows width, y=${wideFront[1].toFixed(1)}`);

function dump(id: BoxId, dims: Dims) {
  console.log(`\n== ${id} closed ==`);
  for (const face of getFaces(id, dims, 1)) {
    const c = center(face.points);
    console.log(face.id.padEnd(14), c.map((v) => v.toFixed(1)).join(" "));
  }
  const net = getNet(id, dims);
  console.log(
    "net",
    net.width.toFixed(1),
    "x",
    net.height.toFixed(1),
    "panels",
    panelCount(id, dims),
    "area",
    net.area.toFixed(0),
    "cuts",
    net.cuts.length,
    "folds",
    net.folds.length,
  );
}

const d422: Dims = { L: 280, W: 200, H: 60, G: 0 };
const d427: Dims = { L: 300, W: 200, H: 80, G: 0 };
const d215: Dims = { L: 300, W: 200, H: 140, G: 30 };
const d470: Dims = { L: 310, W: 150, H: 100, G: 0 };

dump("0422", d422);
dump("0427", d427);
dump("0215", d215);
dump("0470", d470);

for (const [id, dims] of [
  ["0422", d422],
  ["0427", d427],
  ["0470", d470],
] as const) {
  const flat = getFaces(id, dims, 0);
  assert(
    flat.every((face) => face.points.every((point) => Math.abs(point[2]) < 0.8)),
    `${id} starts flat`,
  );
}

assert(panelCount("0422", d422) === 13, `0422 panels ${panelCount("0422", d422)}`);
assert(panelCount("0470", d470) === 15, `0470 panels ${panelCount("0470", d470)}`);

const box422 = faceMap("0422", d422, 1);
assert(Math.abs(box422.front.points[0][1]) < 1, "0422 front on y=0");
assert(box422["front-lock"] && center(box422["front-lock"].points)[1] > 2, "0422 front lock inside");
assert(center(box422["ear-lf"].points)[1] > 0.5, "0422 front taper inside");
assert(center(box422["ear-lf"].points)[1] < center(box422["front-lock"].points)[1], "taper between wall and lock");
assert(Math.min(...box422["ear-rf"].points.map((p) => p[2])) > 5, "right taper stands up");
assert(Math.min(...box422["front-tabs"].points.map((p) => p[2])) > -2, "front tongues stay near the floor");
assert(Math.min(...box422["front-tabs"].points.map((p) => p[1])) > 8, "front tongues stay inside");

const box427 = faceMap("0427", d427, 1);
assert(center(box427["left-roll"].points)[0] > 1, "0427 left roll inside");
assert(center(box427["right-roll"].points)[0] < 299, "0427 right roll inside");
assert(center(box427.lid.points)[2] > 70, "0427 lid up");
assert(center(box427.tuck.points)[1] > 1 && center(box427.tuck.points)[2] < 80, "0427 tuck inside front");
assert(center(box427["lug-l-0"].points)[2] < 20, "0427 lug near the floor");
{
  const lug = box427["lug-l-0"].points;
  const hole = box427["slot-l-0"].points;
  const overlap =
    Math.min(...lug.map((p) => p[0])) < Math.max(...hole.map((p) => p[0])) &&
    Math.max(...lug.map((p) => p[0])) > Math.min(...hole.map((p) => p[0]));
  assert(overlap, "0427 lug meets the base slot");
  assert(Math.min(...box427["ear-l"].points.map((p) => p[0])) >= -0.2, "0427 lid ear is inside the end");
}

const box215 = faceMap("0215", d215, 1);
assert(center(box215["bot-left"].points)[0] > 5 && center(box215["bot-left"].points)[0] < 150, "0215 left dust inside");
assert(center(box215["bot-front"].points)[1] > 10, "0215 female on the floor");
assert(center(box215["bot-back"].points)[1] < 190, "0215 male on the floor");
assert(center(box215.lid.points)[2] > 130, "0215 lid up");
assert(center(box215.tuck.points)[1] > 1, "0215 tuck inside");

const box470 = faceMap("0470", d470, 1);
assert(center(box470.lid.points)[2] > 90, "0470 lid up");
assert(center(box470["front-lip"].points)[1] > 1, "0470 lip inside front");
assert(center(box470.tongue.points)[1] > -5, "0470 tongue toward the lock");
assert(
  Math.max(...box470["ear-lf"].points.map((p) => p[1])) < Math.min(...box470["ear-lb"].points.map((p) => p[1])),
  "0470 end ears leave a gap",
);
assert(Math.min(...box470["wing-l"].points.map((p) => p[0])) < -2, "0470 lid wing hangs outside");
{
  const tongue = box470.tongue.points;
  const lip = box470["front-lip"].points;
  const overlap =
    Math.max(...tongue.map((p) => p[1])) > Math.min(...lip.map((p) => p[1])) &&
    Math.min(...tongue.map((p) => p[1])) < Math.max(...lip.map((p) => p[1])) &&
    Math.max(...tongue.map((p) => p[2])) > Math.min(...lip.map((p) => p[2])) &&
    Math.min(...tongue.map((p) => p[2])) < Math.max(...lip.map((p) => p[2]));
  assert(overlap, "0470 tongue enters the front lip");
}

const net215 = getNet("0215", d215);
assert(Math.abs(net215.width - (30 + 2 * (300 + 200))) < 1, `0215 blank width ${net215.width}`);
assert(net215.panels.some((panel) => panel.tone === "glue"), "0215 has a glue flap");
assert(net215.panels.some((panel) => panel.tone === "lid"), "0215 has a lid panel");

for (const id of ["0201", "0215", "0422", "0427", "0470"] as const) {
  const dims = id === "0201" ? d0201 : id === "0215" ? d215 : id === "0422" ? d422 : id === "0427" ? d427 : d470;
  const net = getNet(id, dims);
  assert(net.width > dims.L && net.height > dims.H, `${id} blank encloses the box`);
  assert(net.cuts.length > 4 && net.folds.length > 4, `${id} has cuts and creases`);
  assert(net.area > dims.L * dims.W, `${id} area covers the base`);
}
