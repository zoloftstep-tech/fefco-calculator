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

const d0201: Dims = { L: 300, W: 200, H: 150, G: 30, T: 1.5 };
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
const thick = faceMap("0201", { ...d0201, T: 8 }, 1, 0.4);
const thickDrop = center(thick["flap-front"].points)[2] - center(thick["flap-left"].points)[2];
assert(Math.abs(thickDrop - 8) < 0.6, `0201 minor drops one caliper, dz=${thickDrop.toFixed(2)}`);

const wide = faceMap("0201", { L: 400, W: 260, H: 80, G: 20, T: 1.5 }, 1, 0);
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

const d422: Dims = { L: 280, W: 200, H: 60, G: 0, T: 1.5 };
const d427: Dims = { L: 300, W: 200, H: 80, G: 0, T: 1.5 };
const d215: Dims = { L: 300, W: 200, H: 140, G: 30, T: 1.5 };
const d470: Dims = { L: 310, W: 150, H: 100, G: 0, T: 1.5 };

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
    flat.every((face) => face.points.every((point) => Math.abs(point[2]) < 4)),
    `${id} starts flat`,
  );
}

assert(panelCount("0422", d422) === 13, `0422 panels ${panelCount("0422", d422)}`);
assert(panelCount("0470", d470) >= 15, `0470 panels ${panelCount("0470", d470)}`);

const box422 = faceMap("0422", d422, 1);
assert(Math.abs(box422.front.points[0][1]) < 1, "0422 front on y=0");
assert(box422["front-lock"] && center(box422["front-lock"].points)[1] > 2, "0422 front lock inside");
assert(center(box422["ear-lf"].points)[1] > 0.5, "0422 front taper inside");
assert(center(box422["ear-lf"].points)[1] < center(box422["front-lock"].points)[1], "taper between wall and lock");
assert(Math.min(...box422["ear-rf"].points.map((p) => p[2])) > 5, "right taper stands up");
assert(Math.min(...box422["front-tabs"].points.map((p) => p[2])) > -1, "front tongues stay near the floor");
assert(Math.min(...box422["front-tabs"].points.map((p) => p[1])) > 4, "front tongues stay inside");
{
  const tongue = box422["front-tabs"].points;
  const hole = box422["slot-f-0"].points;
  const overlap =
    Math.min(...tongue.map((p) => p[0])) < Math.max(...hole.map((p) => p[0])) &&
    Math.max(...tongue.map((p) => p[0])) > Math.min(...hole.map((p) => p[0])) &&
    Math.min(...tongue.map((p) => p[1])) < Math.max(...hole.map((p) => p[1])) &&
    Math.max(...tongue.map((p) => p[1])) > Math.min(...hole.map((p) => p[1])) &&
    Math.min(...tongue.map((p) => p[2])) < 2;
  assert(overlap, "0422 tongue head sits in the base slot");
}

const box427 = faceMap("0427", d427, 1);
assert(center(box427["left-bridge"].points)[0] > 1, "0427 left bridge inside");
assert(center(box427["right-bridge"].points)[0] < 299, "0427 right bridge inside");
assert(center(box427["left-roll"].points)[0] > 1, "0427 left roll inside");
assert(center(box427["right-roll"].points)[0] < 299, "0427 right roll inside");
assert(
  getNet("0427", d427).panels.some((panel) => panel.label === "Биговка"),
  "0427 draws the double-crease bridge",
);
assert(center(box427.lid.points)[2] > 70, "0427 lid up");
assert(center(box427.tuck.points)[1] > 1 && center(box427.tuck.points)[2] < 80, "0427 tuck inside front");
assert(center(box427["lug-l-0"].points)[2] < 20, "0427 lug near the floor");
{
  const lug = box427["lug-l-0"].points;
  const hole = box427["slot-l-0"].points;
  const lugRight = box427["lug-r-0"].points;
  const overlap =
    Math.min(...lug.map((p) => p[0])) < Math.max(...hole.map((p) => p[0])) &&
    Math.max(...lug.map((p) => p[0])) > Math.min(...hole.map((p) => p[0]));
  assert(overlap, "0427 lug meets the base slot");
  assert(Math.min(...lug.map((p) => p[0])) > -1, "0427 left lug stays inside the wall");
  assert(Math.max(...lugRight.map((p) => p[0])) < d427.L + 1, "0427 right lug stays inside the wall");
  assert(Math.min(...lug.map((p) => p[2])) < 4, "0427 lug reaches the floor slot");
  assert(Math.min(...box427["ear-l"].points.map((p) => p[0])) > 0, "0427 lid ear finishes inside the box");
  assert(Math.max(...box427["ear-l"].points.map((p) => p[0])) < 18, "0427 lid ear enters the box");
  assert(Math.min(...box427["lug-l-0"].points.map((p) => p[2])) > -1, "0427 lug does not pierce the floor");
  for (const id of ["dust-fl", "dust-fr", "dust-bl", "dust-br"] as const) {
    const dust = box427[id].points;
    assert(dust.every((p) => p[0] > 0 && p[0] < 300 && p[1] > -1 && p[1] < 201), `${id} folds inside`);
  }
}
assert(
  getNet("0427", d427).panels.filter((panel) => panel.label === "Ушко").length >= 6,
  "0427 draws both lid ears and the four wall ears",
);

const bent427 = faceMap("0427", d427, 0.56);
assert(center(bent427.lid.points)[2] > 120, "0427 lid is still up while its ears bend");
assert(Math.min(...bent427["ear-l"].points.map((p) => p[0])) < -20, "0427 lid ears bend before the lid drops");
const down427 = faceMap("0427", d427, 0.68);
assert(Math.min(...down427["ear-l"].points.map((p) => p[0])) < -20, "0427 lid ears are still out as the lid arrives");
const flapBent = faceMap("0427", d427, 0.86);
assert(center(flapBent.tuck.points)[1] < 0, "0427 flap has not covered the front yet");
assert(Math.min(...flapBent["tuck-ear-l"].points.map((p) => p[0])) < -8, "0427 flap ears bend before the flap closes");
const covered427 = faceMap("0427", d427, 0.94);
assert(center(covered427.tuck.points)[1] > 0, "0427 flap covers the front");
assert(
  Math.min(...box427["tuck-ear-l"].points.map((p) => p[0])) > 0 &&
    Math.max(...box427["tuck-ear-l"].points.map((p) => p[0])) < 9 &&
    Math.min(...box427["tuck-ear-l"].points.map((p) => p[1])) > 0,
  "0427 flap ears sit between the end and the roll",
);

const step215 = faceMap("0215", d215, 0.2);
assert(Math.min(...step215["bot-left"].points.map((p) => p[2])) > -2, "0215 dust is down before the female flap");
assert(Math.min(...step215["bot-front"].points.map((p) => p[2])) < -40, "0215 female waits its turn");

const box215 = faceMap("0215", d215, 1);
assert(center(box215["bot-left"].points)[0] > 5 && center(box215["bot-left"].points)[0] < 150, "0215 left dust inside");
assert(center(box215["bot-front"].points)[1] > 10, "0215 female on the floor");
assert(center(box215["bot-back"].points)[1] < 190, "0215 male on the floor");
assert(center(box215.lid.points)[2] > 130, "0215 lid up");
assert(center(box215.tuck.points)[1] > 1, "0215 tuck inside");
assert(
  Math.min(...box215.lid.points.map((p) => p[2])) >
    Math.max(...box215["top-left"].points.map((p) => p[2])),
  "0215 lid sits above the top dust flaps",
);
{
  const dustZ = center(box215["bot-left"].points)[2];
  const femaleZ = center(box215["bot-front"].points)[2];
  const maleZ = center(box215["bot-back"].points)[2];
  assert(dustZ > 0 && dustZ < femaleZ && femaleZ < maleZ, "0215 bottom flaps stack above the floor");
}

const lid470 = faceMap("0470", d470, 0.66);
assert(Math.min(...lid470["wing-l"].points.map((p) => p[0])) < -20, "0470 wings wait until the lid is down");

const box470 = faceMap("0470", d470, 1);
assert(center(box470["bot-l"].points)[0] > 2 && center(box470["bot-l"].points)[0] < d470.L, "0470 left bottom flap inside");
assert(center(box470["bot-r"].points)[0] < d470.L - 2 && center(box470["bot-r"].points)[0] > 0, "0470 right bottom flap inside");
assert(center(box470["bot-l"].points)[2] > 0 && center(box470["bot-r"].points)[2] > 0, "0470 bottom flaps sit on the floor");
assert(Math.max(...box470["lug-l-0"].points.map((p) => p[0])) > 4, "0470 left lug points into the box");
assert(Math.min(...box470["lug-l-0"].points.map((p) => p[0])) > -1, "0470 left lug stays inside the wall");
assert(center(box470.lid.points)[2] > 90, "0470 lid up");
assert(center(box470["front-lip"].points)[1] > 1, "0470 lip inside front");
assert(center(box470.tongue.points)[1] > -5, "0470 tongue toward the lock");
assert(
  Math.max(...box470["ear-lf"].points.map((p) => p[1])) < Math.min(...box470["ear-lb"].points.map((p) => p[1])),
  "0470 end ears leave a gap",
);
assert(Math.min(...box470["wing-l"].points.map((p) => p[0])) >= -0.5, "0470 lid wing stays inside the end");
assert(Math.max(...box470["wing-l"].points.map((p) => p[0])) > 8, "0470 lid wing tucks into the box");
assert(Math.min(...box470["lid-front"].points.map((p) => p[1])) >= -1, "0470 lid flap tucks inside");
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
/** Girth [0,1,1,2]·T adds +4T to the blank width. */
assert(Math.abs(net215.width - (30 + 2 * (300 + 200) + 4 * 1.5)) < 1, `0215 blank width ${net215.width}`);
assert(net215.panels.some((panel) => panel.tone === "glue"), "0215 has a glue flap");
assert(net215.panels.some((panel) => panel.tone === "lid"), "0215 has a lid panel");

const d471 = { L: 300, W: 160, H: 90, G: 0, T: 1.5 };
const box471 = faceMap("0471", d471, 1);
assert(center(box471.lid.points)[2] > 80, "0471 lid up");
assert(Math.min(...box471["lid-front"].points.map((p) => p[1])) >= -1, "0471 rounded flap tucks inside");
assert(center(box471["left-roll"].points)[0] > 1, "0471 left roll inside");
assert(Math.min(...box471["lug-l-0"].points.map((p) => p[0])) > -1, "0471 left lug stays inside the wall");
assert(Math.min(...box471["lug-l-0"].points.map((p) => p[2])) < 4, "0471 lug reaches the floor slot");
assert(Math.min(...box471["ear-l"].points.map((p) => p[0])) > 0, "0471 lid ear finishes inside the box");
assert(Math.max(...box471["ear-l"].points.map((p) => p[0])) < 20, "0471 lid ear enters the end pocket");
assert(getNet("0471", d471).panels.some((panel) => panel.label === "Биговка"), "0471 draws double-crease bridge");
assert(getNet("0471", d471).panels.filter((panel) => panel.tone === "slot").length >= 2, "0471 draws floor slots");
{
  const bent = faceMap("0471", d471, 0.52);
  assert(center(bent.lid.points)[2] > 120, "0471 lid still up while ears bend");
}

for (const id of ["0201", "0215", "0422", "0427", "0470", "0471"] as const) {
  const dims =
    id === "0201" ? d0201 : id === "0215" ? d215 : id === "0422" ? d422 : id === "0427" ? d427 : id === "0471" ? d471 : d470;
  const net = getNet(id, dims);
  assert(net.width > dims.L && net.height > dims.H, `${id} blank encloses the box`);
  assert(net.cuts.length > 4 && net.folds.length > 4, `${id} has cuts and creases`);
  assert(net.area > dims.L * dims.W, `${id} area covers the base`);
}
