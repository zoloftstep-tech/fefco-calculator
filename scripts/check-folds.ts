import { getFaces, getNet } from "../src/lib/fefco";

function center(points: [number, number, number][]) {
  const s = points.reduce(
    (a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as [number, number, number],
    [0, 0, 0],
  );
  return s.map((v) => v / points.length) as [number, number, number];
}

function dump(id: "0201" | "0422" | "0427", t: number) {
  const dims =
    id === "0201"
      ? { L: 300, W: 200, H: 150, G: 30 }
      : { L: 300, W: 220, H: 80, G: 0 };
  const faces = getFaces(id, dims, t);
  console.log(`\n== ${id} t=${t} ==`);
  for (const face of faces) {
    const c = center(face.points);
    const z = face.points.map((p) => p[2].toFixed(1)).join(",");
    console.log(
      face.id.padEnd(12),
      "c",
      c.map((v) => v.toFixed(1)).join(" "),
      "z",
      z,
    );
  }
}

dump("0427", 0);
dump("0427", 1);
dump("0422", 1);
dump("0201", 0);
dump("0201", 1);

const box = getFaces("0427", { L: 300, W: 220, H: 80, G: 0 }, 1);
const byId = Object.fromEntries(box.map((f) => [f.id, center(f.points)]));

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok", msg);
  }
}

assert(Math.abs(byId.front[1]) < 2, `front on y=0, got ${byId.front[1]}`);
assert(byId.front[2] > 30, `front stands, z=${byId.front[2]}`);
assert(byId["front-lock"][1] > 2, `lock inside, y=${byId["front-lock"][1]}`);
assert(byId["ear-lf"][1] > 1 && byId["ear-lf"][1] < 7, `left front ear between wall and lock, y=${byId["ear-lf"][1]}`);
assert(byId["ear-rf"][0] < 300, `right front ear inside, x=${byId["ear-rf"][0]}`);
assert(byId["ear-rf"][1] > 1, `right front ear y=${byId["ear-rf"][1]}`);
assert(byId["ear-lb"][1] < 219, `left back ear inside back wall, y=${byId["ear-lb"][1]}`);
assert(byId.lid[2] > 70, `lid up, z=${byId.lid[2]}`);
assert(byId.lid[1] > 20 && byId.lid[1] < 200, `lid covers, y=${byId.lid[1]}`);
assert(byId.tuck[1] > 2, `tuck inside front, y=${byId.tuck[1]}`);
assert(byId.tuck[2] < 80, `tuck hangs down, z=${byId.tuck[2]}`);

const open = getFaces("0201", { L: 300, W: 200, H: 150, G: 30 }, 0);
const closed = getFaces("0201", { L: 300, W: 200, H: 150, G: 30 }, 1);
const openFront = center(open.find((f) => f.id === "flap-front")!.points);
const shutFront = center(closed.find((f) => f.id === "flap-front")!.points);
const shutLeft = center(closed.find((f) => f.id === "flap-left")!.points);
assert(openFront[1] < 0, `0201 front flap opens outward y=${openFront[1]}`);
assert(shutFront[1] > 10 && shutFront[1] < 190, `0201 front flap closes y=${shutFront[1]}`);
assert(Math.abs(shutFront[2] - 150) < 2, `0201 front flap at top z=${shutFront[2]}`);
assert(shutLeft[0] > 10 && shutLeft[0] < 290, `0201 left flap inside x=${shutLeft[0]}`);

for (const id of ["0201", "0422", "0427"] as const) {
  const dims = id === "0201" ? { L: 300, W: 200, H: 150, G: 30 } : { L: 300, W: 220, H: 80, G: 0 };
  const net = getNet(id, dims);
  console.log("net", id, net.width.toFixed(1), net.height.toFixed(1), "area", net.area.toFixed(0), "panels", net.panels.length);
  assert(net.width > dims.L && net.height > dims.H, `${id} blank encloses the box`);
  assert(net.cuts.length > 4 && net.folds.length > 4, `${id} has cuts and creases`);
}

const flat = getFaces("0427", { L: 300, W: 220, H: 80, G: 0 }, 0);
assert(
  flat.every((f) => f.points.every((p) => Math.abs(p[2]) < 0.01)),
  "flat sheet has z=0",
);
