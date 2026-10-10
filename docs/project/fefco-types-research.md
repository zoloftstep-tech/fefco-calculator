# FEFCO: исследование всех стилей (развёртки + реалистичная 3D-сборка)

Документ для реализаторов. Равная глубина по каждому коду в fefco-calculator.  
Связан: [`merge-context.md`](./merge-context.md) (архитектура слияния A/B/C).  
Внутренние выжимки модулей A: `internal/fefco-modules-extract.md`.  
Дата среза: 2026-10-10. Worker: `bc-b7d6a1bc-7f4c-5c64-a59e-2f2a0ae43ecc`.

**Коды в A (полный перечень):** `0201`, `0215`, `0422`, `0427`, `0470`, `0471`. Других нет.

**Обозначения:** \(L,W,H\) — внутренние мм (в A: `Dims.L/W/H`); \(G\) — клеевой клапан; \(t\) — caliper (толщина картона); \(f\) — глубина клапана.

---

## Общие производственные правила (для всех стилей)

| Тема | Правило / типичные значения | Источник |
|------|----------------------------|----------|
| Серия 02 | Slotted boxes: одна заготовка, manufacturer’s joint (клей/скоба/скотч), верх+низ клапанами; едут плоскими | FEFCO Code 12th ed. overview |
| Серия 04 | Folder-type boxes & trays: обычно без заводского клея, самосборка M | FEFCO Code 12th |
| Score-to-score | При 90° сгибе расстояние между параллельными панелями ≈ score-to-score − \(t\) | FCBM scoring booklet |
| Типичный \(t\) | E≈1.0–1.5; B≈2.5–3.0; C≈3.5–4.5; BC≈5–7 мм | GWP / Paperlust flute guides |
| Glue joint 0201 | overlap ≈ 25–38 мм single-wall; CardboardShaper пример: 35 мм | CardboardShaper RSC; FCBM |
| Slot kerf | ≈ \(t\) + clearance (пример RSC: 1.90 мм при E) | CardboardShaper 0201 |
| Girth (open-dieline RTE) | панели от glue: \(+[0,1,1,2]\cdot t\); tuck clearance \(0.5+t\) | `/tmp/open-dieline` RTE |
| Режим A сейчас | **только Ideal score-to-score**, без \(t\)/flute (`README.md`) | `/workspace/README.md` |
| Raster A | непрозрачный z-buffer, alpha 255; `stack` не читается | `src/lib/raster.ts` |

**Gap общий A vs реальность:** нет caliper на панелях; сгибы — «нож» без радиуса биговки; вставка язычков — театр углов/`lift`, не collision; `0201`/`0215` стартуют уже как труба.

---

## 0201 — Regular Slotted Container (RSC)

### 1. Identity

| | |
|--|--|
| FEFCO | **0201** — классический slotted case; major flaps встречаются в центре (`W/2`) |
| Синонимы | RSC, American case, «американка» |
| Группа | 02 Slotted-type; сборка M/A (ручная / авто) |
| Применение | Транспорт, склад, паллетизация; самый массовый стиль |
| Соседи | 0202 (частичный overlap), 0203 (full overlap) |
| Каталог | FEFCO Code 12th; Essential Image `F_0200/0201` |

**Топология blank:** `G | L | W | L | W` по girth; по высоте: flap \(f\) + body \(H\) + flap \(f\), \(f = W/2\).

### 2. Dieline formulas

**Ideal (как A / hand formula):**

\[
B_w = 2(L+W)+G,\quad B_h = H + W,\quad f = W/2
\]

**С толщиной (практика):**

- Score-to-score панели: \(L_{ss} = L + c_{90}\), \(W_{ss} = W + c_{90}\) (таблицы завода; \(c_{90}\) растёт с \(t\)).
- Blank height ≈ \(H_{ss} + 2f_{ss}\); slot width ≈ \(t + \delta_{slot}\).
- Glue: типично 25–35 мм на длинной панели → внутрь соседнего торца.
- FCBM: для 0201 есть отдельные scoring allowances по flute (B/C…).

**В A (`rsc0201.ts`):** \(B_w=2(L+W)+G\), \(B_h=H+W\), \(f=W/2\); bevel клея \(\min(0.3G, 0.15H)\); **нет** \(t\).

### 3. Assembly reality

Порядок packing-house (Kapak GPSR PDF; Boxes Made To Measure; manuals.plus):

1. Раскрыть плоскую склеенную обечайку в трубу.  
2. **Дно:** короткие (minor, W) клапаны внутрь → длинные (major, L) поверх → скотч по шву.  
3. Загрузка.  
4. **Верх:** то же — minor → major → скотч.

**Что делает A неправильно / упрощает:**

| Реальность | A сейчас |
|------------|----------|
| Старт: плоский glued blank → erect tube | Старт уже «открытая труба», стенки не складываются (`selfAssembly:false`) |
| Клапаны ≈ 90° | Ход 135°→0 (`MAX_ANGLE=135`) |
| Скотч/клей на шве | Только геометрия; нет tape |
| Толщина стопки minor под major | Костыль `hShort = H − min(0.008H,1)` |
| Glue flap в 3D | Только на net |

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина листа | Стены/клапаны как плиты толщиной \(t\) (E/B), не zero-thickness quads |
| Биговка | Радиус сгиба ≈ \(t/2\)…\(t\) на score; не «шарнир без объёма» |
| Opacity | Закрытая коробка — сплошной объём; minor не видны сквозь major |
| Порядок | Сначала minor полностью лежат, затем major накрывают; шов major в центре |
| Фазы видимости | (1) труба open 135°, (2) minor closing, (3) major closing, (4) sealed — опц. полоска tape |
| Collision | Major не проходят сквозь minor; tip major на \(z=H\), minor чуть ниже на \(t\) |

### 5. Sources (0201)

- FEFCO Code PDF: https://www.fefco.org/sites/default/files/files/2022-04-21_FEFCO%20Code_WEB_unprotected.pdf  
- FEFCO/ESBO designs: https://www.fefco.org/sites/default/files/files/FEFCO_ESBO_codes_of_designs.pdf  
- CardboardShaper RSC: https://cardboardshaper.com/box-types/regular-slotted-box/  
- Kapak fold instructions PDF: https://kapak.pl/upload/gpsr/en/Instrukcja_Klapy_EN.pdf  
- Boxes Made To Measure: https://boxesmadetomeasure.co.uk/box-style-fefco-0201/  
- Hercule RSC: https://herculeindustrial.com/products/corrugated/fefco/0200-series/0201-regular-slotted-container-rsc  
- Essential Image 0201: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0200/0201/0201.htm  
- A: `/workspace/src/lib/boxes/rsc0201.ts`, `scripts/check-folds.ts`  
- Sample SVG: `/home/ubuntu/Downloads/FEFCO-0201-300x200x150.svg`

---

## 0215 — Tuck top + snap-lock (1-2-3 / Swedish) bottom

### 1. Identity

| | |
|--|--|
| FEFCO | **0215** — slotted, **Top: tuck flap; Bottom: snap lock** (не crash-lock/0713) |
| Синонимы | 1-2-3 bottom, Swedish bottom, tuck-top snap-lock |
| Группа | 02; сборка **M** (ручная последовательность) |
| Применение | Retail / e-com presentation; ручная сборка на столе |
| Важно | Crash-lock (auto-bottom) — **другой** класс (часто 071x); не путать |

### 2. Dieline formulas

**Ideal blank (A `sleeveNet` / catalog formula):**

\[
B_w = 2(L+W)+G,\quad
\text{metrics: } dust=L/3,\; female\approx0.78W,\; male\approx0.55W,\; tongue\in[16,36],\; tuck\approx0.72H
\]

**Производство:**

- Manufacturer’s joint \(G\) как у 02xx.  
- Геометрия замков дна чувствительна к \(t\): узкие flute (E) предпочтительны; толстый картон «трудно собрать» (EasyPackMaker remark).  
- Top tuck: depth + side clearance \(c \approx 0.5+t\) (паттерн open-dieline).  
- Slot в female-клапане: ширина ≈ \(0.34L\), позиция по глубине female.

**В A (`sleeveMetrics`):** dust/shoulder/female/male/tongue/topDust/tuck/slotW — эвристики от \(L,W,H\); **нет** \(t\).

### 3. Assembly reality

Инструкции (Packaging Warehouse; Superbox PDF; Box Packing Solution):

**Дно (коробку перевернуть дном вверх):**

1. Самый большой клапан (со «шлицем» / punched rectangle) — первым.  
2. Два противоположных пыльника / side flaps — накрывают «рожки».  
3. Оставшийся tuck/tongue — в щель между предыдущими (щелчок «конверта»).

**Крышка:** пыльники внутрь → главный tuck в переднюю стенку.

Видео: Rutube FEFCO 0215 https://rutube.ru/video/e5dd4eb7cabb0f61a77b225fe7ba0915/ ; Slimbox auto-lock guide https://www.slimbox.eu/post/stuck-in-the-auto-lock-box ; PDF https://superbox.lt/img/cms/fefco-0215-box-folding-instructions-en.pdf

**A vs реальность:**

| Реальность | A |
|------------|---|
| Erect tube из плоского | Уже труба, стены `angle=90` fixed |
| Дно: female → dusts → male tongue в шлиц | Порядок фаз похож (dust→female→male), но нет «переворота» и настоящего interlock |
| Шлиц — прорезь | Тёмная панель `bot-slot`, не cut |
| Крышка + tuck раздельно | Lid до 0.88, tuck 0.88–1 до 104°; stage «Крышка» сливает оба |
| Толщина замков | `lift` 1.2–2.8 мм имитация |

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина | Плиты \(t\); язык проходит **в** шлиц с зазором |
| Opacity | Закрытое дно — сплошной пол; не видно «дыр» сквозь flaps |
| Порядок | Строго 1→2→3 на дне; пыльники не пересекают female до её укладки |
| Видимость фаз | (1) open tube, (2) dusts down, (3) female+slot, (4) tongue snap, (5) top dusts, (6) lid+tuck seated inside front |
| Collision | Tongue tip скрывается под/в female; lid tuck между передней стенкой и содержимым |

### 5. Sources (0215)

- Packaging Warehouse 0215: https://www.packaging-warehouse.com/en/category/fefco-0215-folding-boxes-86  
- Snap-lock explained: https://www.packaging-warehouse.com/en/adviser/snap-lock-base-285  
- Hercule 0215: https://herculeindustrial.com/products/corrugated/fefco/0200-series/0215-tuck-top-snap-lock-box  
- Packdroid 0215: https://packdroid.com/templates/e-commerce-mailer-box-tuck-top-snap-lock-base-fefco-0215  
- EasyPackMaker 0215: https://easypackmaker.com/chooser/final?templateIndex=fefco_0215  
- Folding PDF: https://superbox.lt/img/cms/fefco-0215-box-folding-instructions-en.pdf  
- Rutube: https://rutube.ru/video/e5dd4eb7cabb0f61a77b225fe7ba0915/  
- A: `/workspace/src/lib/boxes/sleeve0215.ts`

---

## 0422 — Tray with self-locking / double long walls

### 1. Identity

| | |
|--|--|
| FEFCO | **0422** — Tray with Self Locking Wall (Essential Image); folder/tray 04 |
| Суть (каталог / BoxBlanks) | Одноразовый blank; длинные стенки складываются **вдвое**, язычки внутренней стенки **в прорези дна**; без клея/скотча; double wall на двух длинных сторонах |
| Применение | Retail trays, gift, display; ручная самосборка |
| Соседи | 0423–0425 (вариации double walls), 0421 (с крышкой) |
| Сверка | BoxBlanks: checked vs FEFCO Code 12th plate |

**Внимание:** некоторые онлайн-генераторы описывают 0422 как «glued corner tray» — это **другая** конструкция. Для A/каталога ориентир: **base-locking double walls + slits**, не клей углов.

### 2. Dieline formulas

**Ideal (A `trayMetrics`):**

| Символ | Формула A |
|--------|-----------|
| taper (косынка) | \(\min(0.45W,\; L/2-2)\), ≥8 |
| wall (внутр. высота) | \(\max(H-8,\; 0.78H)\), ≥8 |
| tongue depth | \(\min(24,\max(14,0.38H))\) |
| tongues count | \(L<140\Rightarrow 1\), иначе 2 |
| half (голова крючка) | \(\min(12,\max(7,0.045L))\) |
| slot | width \(1.44\cdot half\), depth **16** fixed, y≈12 / \(W-28\) |

**Производство:**

- Double crease на длинных стенках (outer \(H\) + return); Essential Image: Double Crease + Lock Hole params.  
- Allowance: \(H_{ss}=H+C_{90}+\ldots\); slit width ≈ \(t+\delta\).  
- Косынки/web corners зажимаются между outer и return.

### 3. Assembly reality

Консенсус (BoxBlanks; FreeBoxTemplate variant notes):

1. Поднять короткие торцы.  
2. Загнуть косынки/угловые элементы внутрь.  
3. Поднять длинные наружные стенки **снаружи** косынок.  
4. Откинуть return (замок) внутрь ≈180°.  
5. Протолкнуть крючки-язычки **вниз в прорези дна** до щелчка.

**A vs реальность:**

| Реальность | A |
|------------|---|
| Return ≈180° | `locks` → **174°** (близко) |
| Язычки входят в щели | `tabs` → только **64°**; визуально «нависают», не садятся |
| Порядок торцы→косынки→длинные→замки | Фазы есть, но **stage `at` отстаёт** от реальных `phase` окон |
| Caliper slits | Fixed 16 mm; нет \(t\) |

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина | Двойная длинная стенка = два слоя \(t\) с зазором ≈0…\(t\) |
| Opacity | Снаружи не видно косынок после закрытия return |
| Порядок | Косынки полностью внутри до закрытия longs; язычки **после** return |
| Видимость | Прорези в дне видны до входа крючков; крючок: узкая шейка → широкая голова **под** плоскостью дна |
| Collision | Голова крючка не проходит обратно без деформации; return прижимает косынки |

### 5. Sources (0422)

- BoxBlanks 0422: https://boxblanks.com/fefco/0422/  
- Essential Image 0422: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0400/0422/0422.htm  
- FreeBoxTemplate 0422: https://freeboxtemplate.com/corrugated/container-with-double-walls-and-locks-fefco-0422/  
- A: `/workspace/src/lib/boxes/tray0422.ts`

---

## 0427 — Roll-end tuck-front mailer (RETT)

### 1. Identity

| | |
|--|--|
| FEFCO | **0427** — folder-type; hinged lid; roll ends; manual **M** |
| Синонимы | Roll End Tuck Front/Top (RETF/RETT), e-commerce mailer, «шкатулка» |
| Применение | E-com, subscription, postal; плоская поставка, без клея при сборке |
| Вариант | 0427.1 в Code 12th |

**Топология каталога (производство / воркер d3d921e7):** лента  
`закатка → перед → дно → зад → крышка → язычок`  
+ боковые TOE: outer \(H\) + **double crease** + roll-in + tongues → slots в дне.

### 2. Dieline formulas

**Ideal (A `mailerMetrics`):**

| | A |
|--|---|
| lug | \(\max(12,\min(18,0.2H))\) |
| roll | \(\max(8, H-lug)\) |
| tuck | \(\min(0.78H,\max(16,0.42W))\) |
| ear | \(\min(0.92H, 0.46W)\) |
| inset front/back | \(\max(7,0.1H)\) |
| lug count | `lugSpans(W)`: 0 / 1 / 2 / 3 |

**Production (d0427 `allowanceSetup`, E-flute):**

| Var | E | B | C | BC |
|-----|---|---|---|-----|
| dblbend | 6 | 8 | 14 | 20 |
| l2 | L+2 | L+3 | L+5 | L+7 |
| l1 | l2+2·dblbend+2 | … | … | … |
| w1 / w2 | W+2 / W+3 | W+3/W+6 | W+5/W+9 | W+7/W+14 |
| dmain | D+2 | D+3 | D+5 | D+7 |
| blank S1 | \(2(lug+dinr+dblbend+dotr)+l1\) | | | |
| blank N2 | \(dinr+w1+dmain+w2+dfront\) | | | |

**CardboardShaper (E 1.5 mm пример):** roll bridge \(= 2t + 0.4\) (4.90 мм); front/back inset 3 мм под плоскость ушек; 2 tongues/side в slots.

**open-dieline паттерн (не FEFCO, но caliper):** girth \(+[0,1,1,2]t\); tuck \(0.5+t\).

### 3. Assembly reality — два слоя последовательности

**A. Возведение корпуса (packing-house consensus)**  
CardboardShaper; Packlane; CustomBoxez:

1. Pre-break всех биговок ( esp. **две** близкие на roll).  
2. Перед + зад вверх.  
3. Пыльники/ears стенок внутрь вдоль торцов.  
4. Боковая стенка вверх → через roll bridge → inner down; **tongues в slots дна** (держать стены, пока не сядут).  
5. Загрузка.  
6. Крышка: ушки крышки в карманы закатки + передний tuck внутрь переда.

Видео: https://www.youtube.com/watch?v=igMLZhJk3vk ; Packlane Vimeo на https://packlane.com/support/how-do-you-assemble-a-mailer-box ; Shorts https://www.youtube.com/shorts/mAAobtERMug

**B. Закрывание крышки — требование Ростислава (verbatim, приоритет для viz крышки):**

> загибаются ушки, крышка опускается, ушки вставляются внутрь коробки, загибаются ушки клапана, клапан закрывает собой перед, а ушки клапана вставляются между торцом и закаткой.

**A сейчас:** фазы крышки уже близки к (B); корпус свёрнут в один stage «Корпус»; вставка — углы+`lift`, не карман; net **не** strip-каталог; нет double crease; `ROLL=172°`.

| Gap | Деталь |
|-----|--------|
| Net topology | Дерево от дна ≠ лента каталога |
| Double score | Отсутствует (d0427/Packlane: critical) |
| l1≠l2 | Нет (дно длиннее крышки на 2·dblbend+…) |
| Tongue seat | 22° lug angle, не snap в slot |
| crop-0427.png | **Не найден** на VM — gap |

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина | Outer + inner wall = 2\(t\); roll bridge видимый зазор |
| Биговка | Две параллельные score на закатке, сгибаются **раздельно** |
| Opacity | После roll ушки пыльников **не видны** снаружи (в кармане) |
| Lid ears | Сначала сгиб, потом опускание крыши, потом вход в карман |
| Flap ears | Между торцом и roll-in; снаружи не торчат |
| Collision | Tongues входят в slots дна до закрытия крышки; крышка не пересекает поднятые стены |
| Фазы | Плоский → стены/пыльники → roll+lock → (опц. fill) → lid ears → lid down → ears in → flap ears → tuck → flap ears pocket |

### 5. Sources (0427)

- CardboardShaper mailer: https://cardboardshaper.com/box-types/mailer-box/  
- CustomBoxez RETF: https://customboxez.co.uk/packaging/styles/roll-end-tuck-front-boxes  
- Packlane assemble: https://packlane.com/support/how-do-you-assemble-a-mailer-box  
- YouTube RU: https://www.youtube.com/watch?v=igMLZhJk3vk  
- BoxBlanks lists 0427 as RETT: https://boxblanks.com/fefco/0427/ (generator hub)  
- d0427: `/tmp/d0427/draw0427cls.java`, `internal/d0427-formula-extract.md`  
- A: `/workspace/src/lib/boxes/mailer0427.ts`  
- Gap: `crop-0427.png` (упоминался воркером) — отсутствует

---

## 0470 — Wrap-around / self-locking folder with locking lid

### 1. Identity

| | |
|--|--|
| FEFCO | **0470** — Self Locking Tray with Interior Bottom Flaps (Essential Image); EasyPackMaker: Tray with Self Locking Walls and Hinged Lid |
| BoxBlanks | «Wrap-around box with locking lid»; сверка с FEFCO 12th plate |
| Группа | 04; сборка **M** |
| Применение | Лёгкая упаковка, gift/wrap; без скотча, переоткрывается |
| Сосед | **0471** — rounded locking lid / hooks |

### 2. Dieline formulas

**Ideal (A `wrapMetrics`):**

| | |
|--|--|
| ear | \(\min(0.92H, 0.46W, 0.46L)\) |
| lip | \(\max(14,\min(0.48H, 0.7W))\) |
| wing | \(\min(0.9H, 0.95W)\) |
| frontFlap | \(\max(16,\min(0.4H,46))\) |
| tongue | \(\min(20,\max(12,0.2H))\); width \(\min(0.28L,90)\) |
| lip notch | width \(0.55\cdot tongueW\) |

**Производство / CAD libs:** Double Crease, Triangle, Lock Hole, Tuck End params (Essential Image 0470).  
Caliper: inset ears/wings на \(t\); tongue clearance \(0.5+t\); lip fold ≈180° внутрь.

### 3. Assembly reality

Типичная последовательность wrap-folder:

1. Поднять торцы и перед/зад.  
2. Ушки в углы (внутрь).  
3. Внутренняя кромка переда (lip) загибается внутрь — карман под язычок.  
4. Крышка сверху.  
5. Боковые крылья крышки + передний клапан **внутрь**.  
6. Язычок в вырез кромки.

**A vs реальность:**

| Реальность | A |
|------------|---|
| Полный wrap / самозамок корпуса | Упрощённые ушки + lip notch |
| Lip ≈180° внутрь | `lip` → **158°** |
| Tongue deep seat | Tongue → только **52°** |
| Stage «Стенки» | Back ещё гнётся до 0.44, ends уже готовы в 0.16 |
| Толщина кармана | `lift: -0.8` костыль |

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина | Стенки \(t\); lip образует карман толщиной ≥\(t\) |
| Opacity | После закрытия не видно «рентген» внутренних ушек снаружи |
| Порядок | Lip готов **до** посадки tongue; wings после/вместе с опусканием крышки, до tongue |
| Видимость | Notch в lip виден; tongue входит и скрывается; крылья исчезают в торцах |
| Collision | Tongue не пересекает переднюю стенку; только щель notch |

### 5. Sources (0470)

- BoxBlanks 0470: https://boxblanks.com/fefco/0470/  
- EasyPackMaker 0470: https://easypackmaker.com/chooser/final?templateIndex=fefco_0470  
- Essential Image 0470: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0400/0470/0470.htm  
- Boxshot editor: https://dielines.boxshot.com/make/fefco-0470/  
- A: `/workspace/src/lib/boxes/wrap0470.ts`

---

## 0471 — Wrap / tray with rounded locking lid + hooks

### 1. Identity

| | |
|--|--|
| FEFCO | **0471** — Self Locking Tray with Interior Bottom Flaps; lid с **Tuck Tongue** + **Lock Holes** |
| BoxBlanks | «Wrap-around box with **rounded** locking lid» |
| EasyPackMaker | Group 04; M; remark: thick board hard to assemble |
| Отличие от 0470 | Скруглённый клапан; крючки/язычки в **прорези торцов** (не tongue-in-lip) |

### 2. Dieline formulas

**CAD library (Essential Image Lock Hole — символы):**

| Symbol | Default |
|--------|---------|
| \(TL\) tongue length | \(W / (3\cdot N_{tongues})\) |
| \(TO\) tongue offset | \(W/8\) |
| \(LHL\) hole length | \(TL\) |
| \(LHW\) hole width | \(HWDC2y(d(), fd())\) — f(caliper, flute) |
| \(LHO\) hole offset | \(TO-(LHL-TL)/2+DxDCT1\) (учитывает double crease) |
| \(DxTT\) taper | 1 mm |

**Ideal (A `wrap471Metrics`):**

| | |
|--|--|
| flap | \(\min(0.62H, \max(28, 0.42W))\) |
| hook | \(\max(14,\min(22,0.22H))\) |
| slotW / slotH | \(\in[12,22]\times[10,16]\) от W/H |
| slot pos | near top of end: \(y\in[H\cdot0.9-slotH,\; H\cdot0.9]\) |

Нет dust ears в A; rounded flap = 6-gon, не дуга.

### 3. Assembly reality

1. Поднять перед/зад и торцы (прорези на торцах).  
2. Опустить крышку.  
3. Скруглённый клапан на перед.  
4. Боковые крючки → в прорези торцов (замок).

**A vs реальность:** стадии почти совпадают с `phase`; gaps — упрощённая геометрия крючка/слота, нет caliper engagement, нет interior bottom flaps каталога 0471 (если требуются полной пластиной FEFCO).

### 4. Visualization spec

| Требование | Спека |
|------------|-------|
| Толщина | Клапан и торцы \(t\); крючок проходит в slot с зазором |
| Форма клапана | Настоящая дуга / bezier, не 6 точек |
| Opacity | Крючки после посадки **внутри** / в толще торца, снаружи не торчат |
| Порядок | Стенки → lid → flap down → hooks rotate into slots |
| Collision | Hook path не пересекает торец до выравнивания со slot; audible/visual «seat» |
| Фазы | Плоский → стены → крышка 90° → клапан на перед → hooks engaged |

### 5. Sources (0471)

- EasyPackMaker 0471: https://easypackmaker.com/chooser/final?templateIndex=fefco_0471  
- Essential Image 0471: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0400/0471/0471.htm  
- Lock Hole params: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0400/0471/0471_Lock_Hole_Parameters.htm  
- BoxBlanks neighbor list (0471): https://boxblanks.com/fefco/0470/  
- Boxshot: https://dielines.boxshot.com/make/fefco-0471/  
- A: `/workspace/src/lib/boxes/wrap0471.ts` (добавлен в `1e3717a`)

---

## Сводная матрица: A сейчас vs целевая реальность

| Код | Net vs каталог | Fold sequence | Thickness | Viz must-fix |
|-----|----------------|---------------|-----------|---------------|
| 0201 | OK ideal RSC | Minor→major OK; нет erect-from-flat | Нет | Tube→bottom→top; opaque; tape optional |
| 0215 | Упрощённый 1-2-3 | Порядок близок; нет snap geometry | Нет | Real interlock; slot=cut; lid tuck seat |
| 0422 | Упрощённый tray | Порядок ок; tongue не доходит в slot | Нет | Double wall; hooks under floor |
| 0427 | **Сильный gap** (не strip, нет dblbend) | Корпус industry + крышка user; insert fake | Нет (+ есть таблицы C) | Roll bridge; ears in pocket; tongues in slots |
| 0470 | Упрощённый wrap | Lip/tongue углы слабые | Нет | Pocket+tongue seat; opaque wrap |
| 0471 | Упрощённый hooks | Стадии ок | Нет | Arc flap; hooks in end slots |

---

## Общая visualization checklist (все стили)

1. **Лист толщины \(t\)** — extrude panels или dual-surface; default E=1.5 / B=3.0.  
2. **Bend radius** на crease ≥ \(t/2\); 180° returns показывают сжатие.  
3. **Opacity** — z-buffer уже opaque; убрать «просветы» за счёт правильного seating, не alpha-hack.  
4. **Insertion** — конечные углы такие, что язычок/крючок **внутри** приёмника (slot/pocket/lip), с overlap ≥ \(t\).  
5. **Порядок столкновений** — родительские панели дочерних; пыльники до returns; корпус до крышки (кроме явной pre-fold ушек крышки у 0427).  
6. **Фазовый UI** — подписи = реальные окна `phase`, не отстающие `stages.at`.  
7. **Два режима геометрии** — Ideal (каталог score-to-score) / Production (\(t\), flute tables).

---

## Appendix — единый список источников

### Официальные / стандарты

| URL | Зачем |
|-----|--------|
| https://www.fefco.org/technical-information/fefco-code | FEFCO Code 12th portal |
| https://www.fefco.org/sites/default/files/files/2022-04-21_FEFCO%20Code_WEB_unprotected.pdf | Design Style Library PDF |
| https://www.fefco.org/sites/default/files/files/FEFCO_ESBO_codes_of_designs.pdf | FEFCO/ESBO codes of designs |
| https://fcbm.org/wp-content/uploads/2025/06/186-FCBM-46-12.pdf | Scoring allowances theory |
| https://www.gwp.co.uk/guides/corrugated-board-grades-explained/ | Flute thickness |
| https://alphaprepress.com/how-flute-and-board-grade-change-a-corrugated-dieline/ | Caliper меняет dieline |

### Генераторы / CAD libs

| URL | Коды |
|-----|------|
| https://cardboardshaper.com/box-types/regular-slotted-box/ | 0201 |
| https://cardboardshaper.com/box-types/mailer-box/ | 0427 |
| https://boxblanks.com/fefco/0422/ | 0422 |
| https://boxblanks.com/fefco/0470/ | 0470 (+0471 neighbor) |
| https://easypackmaker.com/ | 0215, 0470, 0471… |
| https://www.theessentialimage.com/…/FEFCO_Standards_Library/ | параметрические таблицы |
| https://packdroid.com/templates/e-commerce-mailer-box-tuck-top-snap-lock-base-fefco-0215 | 0215 |

### Видео / инструкции сборки

| URL | Код |
|-----|-----|
| https://kapak.pl/upload/gpsr/en/Instrukcja_Klapy_EN.pdf | 0201/0202 |
| https://manuals.plus/boxes-24/0201-double-wall-cardboard-boxes-manual | 0201 |
| https://superbox.lt/img/cms/fefco-0215-box-folding-instructions-en.pdf | 0215 |
| https://rutube.ru/video/e5dd4eb7cabb0f61a77b225fe7ba0915/ | 0215 |
| https://www.packaging-warehouse.com/en/category/fefco-0215-folding-boxes-86 | 0215 |
| https://packlane.com/support/how-do-you-assemble-a-mailer-box | 0427 |
| https://www.youtube.com/watch?v=igMLZhJk3vk | 0427 |
| https://customboxez.co.uk/packaging/styles/roll-end-tuck-front-boxes | 0427 |

### Локальные checkouts

| Path | Роль |
|------|------|
| `/workspace` (`src/lib/boxes/*`, `fefco.ts`, `fold.ts`, `raster.ts`) | Project A |
| `/tmp/open-dieline` | Project B — param cascade / girth / fold schedule |
| `/tmp/d0427` | Project C — 0427 flute allowances |
| `internal/fefco-modules-extract.md` | Полный разбор кода A по стилям |
| `internal/d0427-formula-extract.md` | Таблицы flute |
| `internal/open-dieline-recalc-principles.md` | Port principles |
| `/home/ubuntu/Downloads/FEFCO-0201-300x200x150.svg` | Sample export |

### Gaps артефактов

- `crop-0427.png` — **не найден** на этой VM (упоминание у воркера d3d921e7).  
- Публичные plate drawings FEFCO 12th — в интерактивном PDF (изображения); для pixel-compare нужны экспорты/сканы.  
- Транскрипты воркеров `bc-60d0555e` / `bc-d3d921e7` с этой среды недоступны — user corrections частично через координаторский relay.
