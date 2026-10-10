# Контекст слияния: FEFCO calc × open-dieline

Документ для следующего агента-реализатора. Изучение только; код здесь не менялся.  
Дата среза: 2026-10-10. Автор среза: worker `bc-b7d6a1bc-7f4c-5c64-a59e-2f2a0ae43ecc`.

Связанные внутренние выжимки (не дублировать в PR):  
`/cursor/stores/bc-050aba31-e7f3-4787-bd7a-af49768a8603/internal/transcript-fefco-calc-summary.md`,  
`…/internal/open-dieline-recalc-principles.md`,  
`…/internal/d0427-formula-extract.md`,  
`…/internal/fefco-modules-extract.md`.

### Указатель: исследование по всем стилям FEFCO

Глубокое исследование **всех** кодов A (0201, 0215, 0422, 0427, 0470, 0471) — каталог, формулы развёрток, реальная сборка, спека 3D-viz, источники:

→ **[`docs/fefco-types-research.md`](./fefco-types-research.md)**  
  (`/cursor/stores/bc-050aba31-e7f3-4787-bd7a-af49768a8603/docs/fefco-types-research.md`)

Этот merge-context остаётся про архитектуру слияния A/B/C; types-research — про геометрию и сборку **каждого** стиля с равной глубиной.

---

## 1. Executive summary

**Цель Ростислава:** объединить функционал двух проектов так, чтобы **fefco calc** (хост) правильно **пересчитывал развёртки при изменении входных размеров** и правильно **визуализировал сборку/закрывание**, опираясь на каталог FEFCO и реальную последовательность складывания.

| Роль | Проект | Суть |
|------|--------|------|
| **A — хост (сохранить UI + FEFCO-стили + 3D-сборку)** | `fefco-calculator` | Next.js калькулятор: 6 кодов FEFCO, развёртка SVG, анимация сборки по `t∈[0,1]`. Геометрия **score-to-score без толщины**. Развёртка и порядок сгиба **расходятся с каталогом / реальностью** (подтверждено пользователем, особенно 0427). |
| **B — принципы пересчёта (портировать)** | `open-dieline` | Vite/React параметрический dieline-инструмент. Нет кодов FEFCO. Ценность: `resolveParams` + `derivedDefault` cascade, толщина/girth, `generate()` как SSOT, инварианты, fold schedule из tagged creases. |
| **C — оракул формул 0427 (справочник, не хост)** | `d0427` (Java) | Производственный DXF FEFCO 0427 с flute-allowances, double-bend TOE, lug/slot. Не порт «как есть», а таблица δ и топология blank. |

**Итог слияния (целевое состояние):** один Next.js-апп (A) с параметрическим слоем в духе B (override → derived → generate) и геометрией/фазами сборки, сверенной с каталогом FEFCO и (где нужна толщина) с формулами C.

---

## 2. Inventory: репозитории, URL, ветки, запуск

### 2.1 Project A — fefco calculator

| | |
|--|--|
| Локальный checkout | `/workspace` (текущий Cloud Agent VM) |
| Origin (сессия) | `https://origin.cursor.com/git/zoloftstep/tmp-924de5149a68d5f2` |
| GitHub (канон пользователя) | https://github.com/zoloftstep-tech/fefco-calculator |
| Ветка / HEAD | `main` @ `1e3717a` — *Fold 0427 ears in catalog order and add FEFCO 0471.* (GitHub и workspace совпадают) |
| Stack | Next.js 15.5, React 19, TypeScript, Tailwind 4, shadcn/ui (`@base-ui/react`) |
| Dev | `npm install && npm run dev` → **http://localhost:4317** (`package.json`: `-H 0.0.0.0 -p 4317`) |
| Координатор-агент | https://cursor.com/agents/bc-050aba31-e7f3-4787-bd7a-af49768a8603 |

### 2.2 Project B — open-dieline (второй проект)

| | |
|--|--|
| Локальный checkout | `/tmp/open-dieline` |
| Git remote этого clone | https://github.com/zoloftstep-tech/open-dieline (private) |
| Upstream в README | https://github.com/BrownBear127/open-dieline · live https://tool.konvolut.art |
| Ветка / HEAD | `main` @ `6268bab` — v**1.4.1** |
| Stack | Vite 6, React 19, TS, Tailwind 4, Three.js 0.185, Vitest, Playwright |
| Dev | `npm install && npm run dev` → обычно **http://localhost:5173** |
| Лицензия | PolyForm Noncommercial 1.0.0 — **портировать принципы/паттерны, не копировать код вслепую** |

### 2.3 Reference — d0427 (формулы 0427)

| | |
|--|--|
| Локальный checkout | `/tmp/d0427` |
| GitHub | https://github.com/bikinon/d0427 |
| Stack | Java Swing (NetBeans), DXF R12 |
| Запуск | Desktop Swing UI (`JFrame0427.main`); не веб |

### 2.4 Связанные агенты / чаты (корректировки пользователя)

| bcId | Имя | Доступность с этой VM | Содержание |
|------|-----|----------------------|------------|
| `bc-050aba31-…` | fefco calculator (координатор) | transcript получен | merge-ask; ссылки на воркеров |
| `bc-60d0555e-…` | Изучение FEFCO 0201 | **недоступен** batch-fetch | итерация с пользователем: 0427 сборка, трапеции ушек, 0471 |
| `bc-d3d921e7-…` | GitHub repository creation | **недоступен** batch-fetch | перерисовка 0427 «под каталог» (`crop-0427.png`); риск конфликта с 60d0555e |
| `bc-b7d6a1bc-…` | Study both projects merge (этот документ) | текущий | |

Цитата merge-ask (координатор):

> Из fefco calc взять развертки и доработать… схему складывания… не как в реальности. Из второго проекта взять принципы расчета изменения разверток при вводе данных… чтобы в итоге fefco calc правильно пересчитывал развертки… и правильно визуализировал принцип сборки и закрывания.

### 2.5 Не второй проект

- `zoloftstep-tech/boxcalculator` — калькулятор **стоимости** коробок (HTML/xlsx), не dieline recalc.
- Preview `http://127.0.0.1:5173/` в transcript воркеров — Vite-порт open-dieline / иной VM, не порт fefco (4317).

---

## 3. Архитектура каждого проекта

### 3.1 fefco-calculator (`/workspace`)

**Поток данных**

```
Calculator (fields L/W/H/G)
  → parseDims → Dims
  → getFaces(id, dims, t, yaw) / getNet(id, dims)
  → ModelView (raster z-buffer) + NetView (SVG) + serializeNet (download)
```

**Ключевые пути**

| Роль | Путь |
|------|------|
| UI | `src/components/calculator.tsx` |
| 2D/3D views | `src/components/drawings.tsx` |
| Каталог + диспетчер | `src/lib/fefco.ts`, `src/lib/fefco-types.ts` |
| Дерево панелей / net | `src/lib/fold.ts` (`PanelDef`, `facesFrom`, `netFromPanels`) |
| Проекция / fit | `src/lib/project.ts` |
| Z-buffer paint | `src/lib/raster.ts` |
| Фазы / math | `src/lib/math.ts` (`phase`) |
| Стили | `src/lib/boxes/{rsc0201,sleeve0215,tray0422,mailer0427,wrap0470,wrap0471}.ts` |
| Smoke folds | `scripts/check-folds.ts` |
| Entry | `src/app/page.tsx` → `<Calculator />` |

**Модель данных**

```ts
// fefco-types.ts
type BoxId = "0201" | "0215" | "0422" | "0427" | "0470" | "0471";
type Dims = { L: number; W: number; H: number; G: number }; // мм; G = клеевой клапан
```

`PanelDef`: `{ id, parent, hinge, axis:'x'|'y', sign, angle:(t)=>deg, poly, fill, tone, lift? }` — **ручное** дерево; net **выводится** из панелей при `t=0`, а не наоборот.

**Поведение ввода:** поля — строки; при валидных числах каждый кадр/рендер зовёт `getNet`/`getFaces` заново (чистые функции). **Нет** слоя derived-параметров (толщина, clearance, flute). `G` используется только для 0201/0215.

**Сборка:** `view.t` 0→1 за ~9 с; стадии из `CATALOG[id].stages[].at`; анимация yaw после паузы.

### 3.2 open-dieline (`/tmp/open-dieline`)

**Поток данных**

```
useParams(boxId) → overrides → resolveParams(mod, overrides) → values
  → mod.generate(values) → GenerateResult { paths, texts, bounds, pieces? }
  → Canvas / Export (SVG|DXF)
  → (fold) panelizeFoldModel(result, …) + FoldStep schedule → Three.js FoldView
```

**Ключевые пути**

| Роль | Путь |
|------|------|
| Контракт | `src/core/types.ts` |
| Registry / resolve | `src/core/registry.ts` |
| Геометрия сегментов | `src/core/geometry.ts`, `path.ts`, `primitives.ts` |
| Параметры UI | `src/ui/useParams.ts`, `ParamPanel.tsx` |
| App | `src/ui/App.tsx` |
| Боксы | `src/boxes/reverse-tuck-end.ts`, `tuck-top-snap-lock.ts`, `triangular-tube.ts`, `telescope/*` |
| Fold | `src/fold/{types,schedule,pose3d,scene-spec}.ts`, `fold/derive/panelize.ts`, `fold/models/*` |
| Export | `src/export/svg.ts`, `dxf.ts` |

**Стили в registry:** `rte`, `telescope`, `ttsl`, `ttb` — **без FEFCO-кодов**.

**Порядок истины:** 2D `generate` → tagged creases (`fold:Parent>Child`) → panelize → timed `FoldStep[]`. Hinge может быть произвольной crease-линией (Rodrigues), не только axis-aligned.

### 3.3 d0427 (`/tmp/d0427`)

```
JFrame0427.getSizes() → draw0427cls.allowanceSetup() → Draw0427() → DXF CUT/CREASE
```

Файлы: `draw0427cls.java` (формулы + turtle), `dxf12objects.java`, `BoardSz.java`, `parcelSizes.java`.

---

## 4. Развёртки: что есть, что не так, gaps каталог ↔ код

### 4.1 Общая модель A

README явно: *«Геометрия score-to-score: без толщины картона, ширины прорезей и производственных зазоров»*.  
SVG: группы `cut` / `crease` (`serializeNet` в `fefco.ts`).

Пользователь (verbatim, усечённо в координаторе):

> во первых исправь развертки и чертежи. потому ято они у тебя ебаные не правильные, чего то не хватает, или неправильно отрисованы

### 4.2 По стилям

#### 0427 (`mailer0427.ts`) — главный конфликт

**В коде сейчас (идеал):**

- Дно `L×W`; перед/зад с inset; торцы `H`; закатка `roll = max(8, H−lug)`; язычки `lugSpans(W)` → прорези в дне.
- Крышка `L×W` на задней стенке; ушки крышки — трапеции `earPoly` (длинная сторона на биге); клапан `tuck`; ушки клапана `tuckEarPoly`.
- Дерево панелей **корневое от дна** → `netFromPanels` даёт развёртку «крестом/деревом», **не** каталожной лентой.

**Каталог / воркер d3d921e7 (цель топологии blank):**

- Цепочка: **закатка → перед → дно → зад → крышка → язычок**
- Бока: наружная стенка `H` + **двойная биговка** + закатка с **двумя** язычками в прорези дна
- Ушки крышки ≈ `H`; короткий передний roll-in с центральным табом
- Референс-файл (имя): `crop-0427.png` (файл на этой VM **не найден**)

**Производство d0427 (толщина/flute):**

- Blank N2: `dinr + w1 + dmain + w2 + dfront`
- Blank S1: `2·(lug+dinr+dblbend+dotr) + l1`
- `l1 = l2 + 2·dblbend + 2` (кроме Carton Brd), `l2 = length + δ_flute` → **дно длиннее крышки**
- Double-bend strip `dblbend` 6…20 мм + слоты; arc-flap на front; folder flaps на lid
- Таблицы E/B/C/BC/Carton — см. appendix / `internal/d0427-formula-extract.md`

**Gap:** код A ≈ упрощённый mailer без double crease, без разницы l1/l2, без arc flap, net не strip-layout. Сборка уже частично подправлена под пользовательскую последовательность (см. §5), но **чертёж** всё ещё не каталожный.

#### 0201 (`rsc0201.ts`)

- Net: классический рукав `[2·(L+W)+G] × (H+W/2+W/2)`, клапаны `W/2`, glue bevel.
- 3D: отдельный путь `rscFaces` (не `PanelDef`); малые клапаны → большие; stack ranks зависят от yaw.
- README/каталог: ок как «четырёхклапанный рукав». Пользовательский воркер 0201 **не трогал** геометрию в последнем проходе (по relay координатора).
- Gap: нет толщины/girth на панелях обечайки (как в open-dieline `[0,1,1,2]·t`); нет отдельной анимации склейки клапана.

#### 0215 (`sleeve0215.ts`)

- Дно 1-2-3 (пыльники → шлиц → язычок), сверху пыльники + полная крышка + tuck.
- `selfAssembly: false` — старт уже как склеенный рукав (`angle: () => 90` на стенках).
- Net отдельный (`sleeveNet`), не через `netFromPanels` для всего.
- Воркер заявлял «уже tape-style» — **не верифицировано** против каталога FEFCO в этом срезе.

#### 0422 (`tray0422.ts`)

- Лоток: двойные длинные стенки, косынки `0.45·W`, язычки-крючки в прорези дна.
- Gap vs каталог: нет flute/caliper; упрощённые косынки.

#### 0470 (`wrap0470.ts`)

- Обёртка без клея: ушки, кромка переда с вырезом под язычок, крышка + wings + tongue.
- Пользовательский chat_selection ранее описывал порядок «крышка → ушки/клапан внутрь → язычок в кромку» — совпадает с `stages` в `CATALOG`.

#### 0471 (`wrap0471.ts`) — добавлен недавно (`1e3717a`)

- Торцы с прорезями, скруглённый клапан, крючки.
- Новый стиль; сверка с каталогом FEFCO 0471 **ещё нужна** (нет независимого оракула на VM).

### 4.3 Сводная таблица gaps

| Код | В A | Vs каталог / реальность | Vs B (recalc) | Vs C (0427 DXF) |
|-----|-----|-------------------------|---------------|-----------------|
| 0427 | mailer + фазы | strip topology, double crease, arc/short front, ушки≈H | нет thickness cascade | flute δ, dblbend, l1≠l2 |
| 0201 | RSC net+faces | в целом узнаваем | girth на обечайке, glue derived | n/a |
| 0215 | sleeve | уточнить пыльники/шлиц | clearance/t | n/a |
| 0422 | tray | gussets/slots упрощены | — | TOE helpers частично родственны |
| 0470 | wrap | ушки/язычок упрощены | tuck clearance pattern | n/a |
| 0471 | wrap471 | новый, мало сверки | — | n/a |

---

## 5. Сборка / закрывание: логика vs реальность

### 5.1 Общий механизм A

- `PanelDef.angle(t)` через `phase(t, t0, t1, fromDeg, toDeg)` (smoothstep).
- `xforms` композирует parent→child с `rotX`/`rotY` вокруг `hinge`.
- `lift` — мм по нормали только в folded view.
- Рендер: `paintModel` z-buffer (`raster.ts`), не Three.js.

### 5.2 0427 — пользовательская истина vs код

**Пользователь (verbatim):**

> крышка: загибаются ушки, крышка опускается, ушки вставляются внутрь коробки, загибаются ушки клапана, клапан закрывает собой перед, а ушки клапана вставляются между торцом и закаткой.

**Отвергнутая** более ранняя наррация воркера (крышка ложится с ушками снаружи, затем ушки входят…) — не использовать.

**Текущий код** (`mailer0427.ts` + `CATALOG["0427"].stages`) уже выстроен под эту последовательность:

| Фаза (примерно) | `angle` window | Действие |
|-----------------|----------------|----------|
| 0.02–0.44 | walls/dusts/ends/rolls/lugs | корпус + закатка + язычки |
| 0.44–0.56 | `ears` → 48° | ушки крышки сгибаются (крышка ещё вверх) |
| 0.56–0.68 | `lid` → 90° | крышка опускается |
| 0.68–0.8 | `ears` 48→100° | ушки внутрь |
| 0.78–0.86 | `flapEars` → 42° | ушки клапана |
| 0.86–0.94 | `tuckAngle` → 104° | клапан на перед |
| 0.94–1 | `flapEars` 42→94° | ушки между торцом и закаткой |

**Оставшиеся gaps сборки 0427:**

1. Корпусная часть (пыльники/inset front) может не соответствовать каталожному TOE.
2. Посадка ушек клапана — эвристика углов/`lift`, не геометрический «карман» 1–4 мм (как заявлял воркер).
3. `ROLL = 172°` константа — не из каталога.
4. Нет double-bend анимации (двух биговок закатки).

### 5.3 Остальные стили (кратко)

| Код | Заявленная последовательность (`CATALOG.stages`) | Риски |
|-----|--------------------------------------------------|-------|
| 0201 | малые → большие клапаны | ок по smoke `check-folds.ts`; склейка G не анимируется |
| 0215 | пыльники → шлиц → язычок → верх → крышка | старт уже «труба»; нет раскрытия склейки |
| 0422 | торцы → косынки → длинные → замки | упрощённые углы косынок |
| 0470 | стенки → ушки → крышка → заправка → язычок | непрозрачность/порядок planes зависели от z-buffer правок |
| 0471 | стенки → крышка → клапан → крючки | новая; мало user feedback |

### 5.4 Как делает B (портируемый fold-паттерн)

1. `generate` с тегами crease  
2. `panelizeFoldModel` → дерево `FoldPanel`  
3. `FoldStep { panelIds, t0, t1, ease }` — явный schedule  
4. `foldPose` + Rodrigues  

Пример RTE (`fold/models/reverse-tuck-end.ts`): body 0–0.35 → bottom dust → tuck → lid → top dust → tuck → lid.

Для FEFCO: либо обогатить `angle(t)` явным schedule-объектом на стиль, либо перейти на generate→panelize (дороже).

---

## 6. Принципы пересчёта из Project B (портировать)

### 6.1 Контракт параметров

`BoxParamDef`: `key`, `unit: 'mm'|'deg'|'bool'|'enum'`, `default`, `min/max/step`, `derivedDefault?(ResolvedParams)=>number`, groups, highlightTags.

`ResolvedParams = Readonly<Record<string, number|boolean|string>>`.

### 6.2 `resolveParams` — приоритет

Файл: `/tmp/open-dieline/src/core/registry.ts`

1. **User override** (даже если есть `derivedDefault`)  
2. **`derivedDefault(resolvedSoFar)`** — только уже разрешённые **предыдущие** ключи (Proxy кидает на forward-ref)  
3. **Static `default`**

Неизвестные ключи в overrides → throw («fake knobs»).

### 6.3 `useParams` — только overrides

Файл: `/tmp/open-dieline/src/ui/useParams.ts`

- State = `Partial` overrides, не полный snapshot.  
- Каждый render: `values = resolveParams(mod, overrides)`.  
- Смена upstream (например `thickness`) мгновенно пересчитывает непереопределённый `tuckClearance`.  
- Смена `boxId` очищает overrides.

**Контраст с A:** `Calculator` держит строки полей и зовёт метрики внутри `*Panels(d)` локально (`mailerMetrics` и т.д.) — нет общего графа зависимостей и нет caliper.

### 6.4 Формулы (RTE — эталон паттерна)

Файл: `/tmp/open-dieline/src/boxes/reverse-tuck-end.ts`

| Параметр | Правило |
|----------|---------|
| `tuckClearance` | `derivedDefault: p => 0.5 + p.thickness` |
| Girth body | `GIRTH_COMP_FROM_GLUE = [0,1,1,2]`; `wPi = dim + comp[i]*t`; сумма coeff = 4 → `+4t` к ширине развёртки |
| Lid height | `= W` (без girth) |
| Relief | `reliefGap = max(flapNotch, creaseRelief, 3) + t` |
| Glue | `glueSize` + chamfer `GLUE_CHAMFER=5`; сторона `glueSide` enum |
| Friction lock | `tuckLock`; 0 отключает |

**TTSL derivedDefaults (отношение к L/W):**  
`lockFlapDepth=0.7*W`, `lockReceiveWidth=(39.5/85)*L`, …

**Telescope:** явные knobs компенсации (`rootJog`, `innerWallReduction`, …) вместо жёсткого `±t` — полезный паттерн, когда caliper нелинейна.

### 6.5 Единицы и слои

- Все координаты **мм**.  
- Слои: `cut` / `crease` / `halfcut` / `dimension` (`core/layers.ts`).  
- Manufacturing export: только cut+crease(+halfcut).

### 6.6 Инварианты

`BoxInvariant.check(params, result)` — shared UI + CI. RTE: `unfold-width`, `lid-equals-w`, `tuck-lock-fits`, `no-nan`, self-intersection, …

### 6.7 Что НЕ портировать из B

Imposition, SVG overlay calibration, artwork editor, zh/en i18n shell, Vercel analytics, сами стили RTE/telescope как «FEFCO», лицензионный копипаст.

### 6.8 d0427 — слой flute (когда выходим из ideal)

Минимум для режима «производство» на 0427 (E-flute пример):

```
dotr=D+1; dinr=D; dfront=D+1; dblbend=6; lug=3 (2.5 if dmain<40)
l2=L+2; l1=l2+2*dblbend+2; w1=W+2; w2=W+3
dside=D+1.5; dmain=D+2
blks1=2*(lug+dinr+dblbend+dotr)+l1
blkn2=dinr+w1+dmain+w2+dfront
```

Полные таблицы B/C/BC/Carton — в `internal/d0427-formula-extract.md`.  
Предупреждение: `depth > length` (совпадает с `warningsFor` 0427 в A).

---

## 7. Предлагаемый план слияния

### 7.1 Что взять откуда

| Компонент | Источник | Действие |
|-----------|----------|----------|
| UI калькулятора, RU copy, FEFCO catalog UX | A | Оставить хостом |
| Коды 0201…0471 + 3D viz | A | Исправить геометрию/фазы, не выкидывать |
| Param cascade / overrides / derivedDefault | B | Портировать как тонкий слой (`src/lib/params/*`) |
| Thickness/girth/clearance patterns | B | Адаптировать под corrugated (или dual mode Ideal/Production) |
| Invariants на net | B | Добавить per-style checks + расширить `check-folds.ts` |
| Fold schedule abstraction | B | Опционально поверх `PanelDef.angle` |
| 0427 production δ / TOE topology | C | Оракул для Production mode и сверки blank |
| Каталожная лента 0427 | user + d3d921e7 notes + `crop-0427.png` | Перестроить net generator |

### 7.2 Целевая архитектура (минимально инвазивно)

```
BoxModule (FEFCO id)
  params: Dims + thickness? + flute? + derived flap/slot sizes
  resolveParams(overrides)
  generateNet(resolved) → NetModel | GenerateResult-like
  panelsFor(resolved) → PanelDef[]   // или panelize из net
  stages / foldSchedule
  invariants
```

UI A остаётся: поля пишут в overrides; `values` кормят generate + fold.

Два режима геометрии (рекомендация):

1. **Ideal** — score-to-score (текущий контракт README), но **правильная топология каталога**.  
2. **Production** — flute/caliper из таблиц C / girth из B.

### 7.3 Порядок миграции

1. **Зафиксировать оракулы:** найти/положить `crop-0427.png` (и аналоги) в repo; зафиксировать golden SVG для дефолтных размеров.  
2. **Param layer** из B без смены UI визуально: `Dims` + optional `thickness`; metrics (`mailerMetrics`…) → `derivedDefault`.  
3. **0427 dieline rewrite** под каталожную цепочку + double crease + правильные ушки; фазы сборки уже близки — подогнать hinge/poly под новый net.  
4. **Сверка 0471 / 0470 / 0422 / 0215 / 0201** по одному стилю: сначала net vs каталог, потом fold sequence vs user/real pack.  
5. **Production mode** (flute) — после Ideal-correct; подключить δ из C.  
6. **Invariants + CI** (`check-folds` + net dimension identities).  
7. Не тащить Three.js/imposition из B, пока z-buffer A закрывает UX.

### 7.4 Риски

| Риск | Митигация |
|------|-----------|
| Два воркера правили 0427 параллельно | Один owner файла `mailer0427.ts`; сверять с user verbatim sequence |
| `netFromPanels` не умеет strip-layout | Либо ручной `NetModel` (как 0201), либо перестроить hinge tree |
| PolyForm NC license B | Реимплементировать паттерны, не копировать большие куски |
| OD/BB path в d0427 buggy | Не копировать `getSizes()` OD; только ID→allowance таблицы |
| Ideal vs Production путаница у пользователя | Явный toggle + подпись в SVG desc |
| Child transcripts 60d0555e / d3d921e7 недоступны | Нужен доступ к их чатам или артефактам для полной истории правок |

---

## 8. Open questions / blockers

Только блокирующие:

1. **Где лежит `crop-0427.png` (и другие crop-каталога)?** На этой VM файла нет — без него нельзя формально закрыть «каталожную» сверку 0427.  
2. **Режим по умолчанию:** Ideal (как сейчас в README) или Production (flute)? От этого зависит, тащить ли δ из d0427 в v1 merge.  
3. **Транскрипты воркеров `bc-60d0555e` / `bc-d3d921e7`** недоступны batch-fetch с этой среды — возможны дополнительные user-правки, не попавшие в координаторский relay.

Не блокирует: отсутствие FEFCO-кодов в open-dieline (ожидаемо); лицензия B (обходится реимплементацией).

---

## Appendix A — важные API / сниппеты

### A.1 Диспетчер A

```ts
// src/lib/fefco.ts
export function getFaces(id: BoxId, dims: Dims, t: number, yaw = 0): WorldFace[]
export function getNet(id: BoxId, dims: Dims): NetModel
// 0201 → rscFaces/rscNet; 0215 → sleeve*; иначе facesFrom/netFromPanels(panelsFor)
```

### A.2 PanelDef / xforms A

```ts
// src/lib/fold.ts
export type PanelDef = {
  id: string; parent: string | null; hinge: Vec3;
  axis: "x" | "y"; sign: 1 | -1;
  angle: (t: number) => number; // degrees
  poly: Pt[]; fill: FaceFill; tone: PanelTone; stack: number;
  lift?: number;
};
export function facesFrom(panels: PanelDef[], t: number): WorldFace[]
export function netFromPanels(panels: PanelDef[]): NetModel
```

### A.3 Метрики 0427 A (ideal)

```ts
// src/lib/boxes/mailer0427.ts
export function mailerMetrics(d: Dims) {
  const lug = Math.max(12, Math.min(18, d.H * 0.2));
  const tuck = Math.min(d.H * 0.78, Math.max(16, d.W * 0.42));
  const ear = Math.min(d.H * 0.92, d.W * 0.46);
  // ...
  return { lug, tuck, ear, inset, dust, roll: Math.max(8, d.H - lug) };
}
```

### A.4 resolveParams B

```ts
// /tmp/open-dieline/src/core/registry.ts — приоритет:
// override > derivedDefault(resolvedSoFar) > default
export function resolveParams(m: BoxModule, overrides?: OverrideMap): ResolvedParams
```

### A.5 derived tuck clearance B

```ts
// /tmp/open-dieline/src/boxes/reverse-tuck-end.ts
derivedDefault: (p) => 0.5 + (p.thickness as number),
// GIRTH_COMP_FROM_GLUE = [0, 1, 1, 2]
```

### A.6 Fold steps B (RTE)

```ts
// /tmp/open-dieline/src/fold/models/reverse-tuck-end.ts
const RTE_STEPS: FoldStep[] = [
  { panelIds: ['P2','P3','P4','glue'], t0: 0, t1: 0.35, ease: 'powerInOut' },
  { panelIds: ['bottomDustP2','bottomDustP4'], t0: 0.35, t1: 0.5, ease: 'backIn' },
  // …
];
```

### A.7 allowanceSetup C (E)

```java
// /tmp/d0427/draw0427cls.java — case "E":
dotr=depth+1; dinr=depth+0; dfront=depth+1; dblbend=6;
l2=length+2; l1=l2+(dblbend*2+2); w1=width+2; w2=width+3;
dside=depth+1.5; dmain=depth+2;
blks1=(lug+dinr+dblbend+dotr)*2+l1;
blkn2=dinr+w1+dmain+w2+dfront;
```

### A.8 Запуск (шпаргалка)

```bash
# A
cd /workspace && npm install && npm run dev   # :4317

# B
cd /tmp/open-dieline && npm install && npm run dev   # :5173
```

---

## Appendix B — карта файлов для следующего шага

Приоритет правок в A:

1. `src/lib/boxes/mailer0427.ts` — топология развёртки + полигоны  
2. `src/lib/fefco.ts` — stages/summary/warnings под новую геометрию  
3. Новый `src/lib/params/` (порт идей B)  
4. `src/components/calculator.tsx` — overrides UI (толщина/flute optional)  
5. Остальные `src/lib/boxes/*` по одному  
6. `scripts/check-folds.ts` + golden nets  

Справочники только-чтение: `/tmp/open-dieline`, `/tmp/d0427`.
