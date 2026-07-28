# Design-Tokens

`tokens.json` ist die **einzige Quelle der Wahrheit** für Farben, Abstände,
Schrift, Schatten und Effekte. Alles Sichtbare an dieser App leitet sich daraus
ab — es gibt keine Rohwerte in Komponenten und keine in `app/globals.css`.

Format: [W3C Design Tokens (DTCG)](https://tr.designtokens.org/format/) —
jedes Token ist ein Objekt mit `$value`, `$type` und optional `$description`.

## Die drei Stufen

| Stufe          | Zweig in `tokens.json`                                | Zweck                                                         | Verwendung in Komponenten   |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------- | --------------------------- |
| 1 — Rohpalette | `primitive.*`                                         | die nackten Farbwerte der Crimson-Palette und der Neutraltöne | **nie direkt**              |
| 2 — semantisch | `semantic.light.*`, `semantic.dark.*`                 | Rollen wie „Textfarbe“, „Hintergrund“, „Fokusring“            | **nur diese**               |
| 3 — System     | `dimension.*`, `typography.*`, `shadow.*`, `effect.*` | Abstände, Rundungen, Schrift, Schatten, Blur, Übergänge       | über die Tailwind-Utilities |

Stufe 1 beantwortet „welches Rot genau“, Stufe 2 beantwortet „wofür“. Ändert
sich die Marke, wird nur Stufe 1 angefasst; ändert sich die Bedeutung (z. B.
„gedämpfter Text soll dunkler werden“), nur Stufe 2.

## Namenskonvention

```
category.role.variant.state
```

Beispiele: `semantic.light.color.background.subtle`,
`semantic.light.color.brand.hover`, `semantic.light.color.status.criticalSubtle`.
Verschachtelte Namen werden in `camelCase` geschrieben und beim Generieren zu
`kebab-case` umgeschrieben (`glassStrong` → `--surface-glass-strong`).

Alias-Werte zeigen in geschweiften Klammern auf ein anderes Token und werden
rekursiv aufgelöst:

```json
{ "$type": "color", "$value": "{primitive.color.brand.600}" }
```

## Status-Farben sind reserviert

`semantic.<mode>.color.status.*` ist eine **reservierte Palette**. Sie bedeutet
immer einen Zustand — nie „sieht hübsch aus“.

| Rolle      | Bedeutung                       | Hell      | Dunkel    |
| ---------- | ------------------------------- | --------- | --------- |
| `success`  | erledigt, im Zielbereich        | `#0F7059` | `#34B894` |
| `warning`  | Aufmerksamkeit nötig            | `#8A5A00` | `#E8A93D` |
| `critical` | Fehler, Gefahr, Handlungsbedarf | `#A8380B` | `#F2764A` |

Dazu je eine zarte Fläche (`successSubtle`, `warningSubtle`, `criticalSubtle`)
für Banner, Badges und Hinweisboxen.

Drei Regeln, ohne Ausnahme:

1. **Nie dekorativ.** Kein Diagramm-Akzent, keine Kachel, kein Icon „weil grün
   gut aussieht“. Wer eine Farbe zum Gestalten braucht, nimmt die Marke oder
   die Neutraltöne.
2. **Nie als alleiniges Signal.** Farbe kommt immer zusammen mit einem Icon
   **und** einem Text-Label — Farbenblindheit und Graustufendruck müssen die
   gleiche Information tragen (WCAG 1.4.1).
3. **Nie mit der Marke verwechselbar.** `success` ist bewusst ins Teal
   verschoben und `critical` ist tiefer und deutlich oranger als das
   Marken-Crimson `brand.600` (#A32432), damit ein Alarm nie als Branding
   gelesen wird. Umgekehrt gilt: Marken-Rot bedeutet **niemals** „Fehler“.

In Komponenten stehen dafür die Utilities `text-success`, `bg-success-subtle`,
`text-warning`, `bg-warning-subtle`, `text-critical`, `bg-critical-subtle`
bereit. shadcns `--destructive` zeigt auf `status.critical`.

Der Generator prüft jede Status-Farbe doppelt: auf `background.default` **und**
auf ihrer eigenen zarten Fläche. Beide Paarungen müssen 4.5:1 erreichen.

## Die drei Flächenstufen des App-Shells

Der eingeloggte Bereich ist aus echtem Glas gebaut: Der Hintergrund liegt
sichtbar hinter allem, und Tiefe entsteht durch **drei klar getrennte
Flächenstufen** statt durch Ränder. Alle liegen unter
`semantic.<mode>.surface.*` und werden nie ad hoc nachgebaut.

| Token              | Utility            | Wirkung                                                                          |
| ------------------ | ------------------ | -------------------------------------------------------------------------------- |
| `surface.shell`    | `.glass-shell`     | das schwebende Panel und die Icon-Leiste: helles Frostglas über dem Grund        |
| `surface.content`  | `.surface-content` | die Inhaltsfläche in der Mitte, eine Spur heller und ruhiger                     |
| `surface.card`     | `.surface-card`    | **deckende** Karten darauf — Zahlen liegen nie auf Glas                          |
| `surface.rail`     | `.rail-panel`      | die Kontextleiste rechts: eigenes, abgesetztes Panel, etwas matter als die Mitte |
| `surface.railCard` | `.rail-card`       | **deckende**, reinweisse Karten darin — sie springen von der matteren Leiste ab  |

Zwei Dinge daran sind Absicht und keine Nachlässigkeit:

1. **`shell`, `content` und `rail` sind bewusst nicht deckend.** Ihre Deckkraft
   ist so gewählt, dass sich der Verlauf des Grundes quer über die Fläche noch
   sichtbar durchzeichnet. Wer sie „zur Sicherheit“ dichter macht, nimmt dem Glas
   seine Wirkung.
2. **Karten sind das Gegenteil davon: deckend.** Messwerte werden auf ruhigem
   Grund gelesen, nicht auf einem Verlauf.
3. **`rail` bringt ihre Deckung selbst mit** (0.46 statt 0.34): die
   Inhaltsfläche liegt auf dem Shell-Glas, die Leiste als eigenes Panel direkt
   auf dem Grund. Der Wert liegt bewusst unter der Summe der Mitte (≈ 0.62) —
   die Leiste trägt reinweisse Karten, und die brauchen einen matteren Grund,
   von dem sie abspringen. Bei 0.62 verschmelzen Karte und Leiste zu einer
   Fläche, bei deutlich weniger verliert die Leiste ihren Bezug zur Mitte.

Auf der Rail gilt eine eigene Textfamilie
(`text.onRail`, `onRailMuted`, `onRailFaint`, `onRailBrand`), dazu
`border.onRail*`, `status.successOnRail` / `warningOnRail` und der Fokusring
`focusOnRail`. Sie decken sich derzeit mit den Rollen der Inhaltsfläche —
benutzt wird auf der Rail trotzdem **nur** die on-rail-Familie: sie ist der
Hebel, mit dem die Leiste ihre Fläche wechseln kann, ohne dass jede Komponente
darauf angefasst werden muss.

### Der Hintergrund

`primitive.color.backdrop.*` bildet ein Mesh: eine helle neutrale Grundfarbe
und drei grosse, stark weichgezeichnete Farbfelder in entsättigten Warmgrautönen
plus einem sehr blassen Marken-Ton. Sie sind fix, nichts daran ist scharf oder
belebt — der Grund existiert nur, damit das Glas etwas zu brechen hat. Darüber
liegt `primitive.texture.grain` mit `effect.grain.opacity` (3 %) für
Materialgefühl; die Textur ist ein eingebettetes SVG, also keine Netzwerkanfrage.

Die Glas-Rezeptur selbst steckt in `effect.blur.xl` (Weichzeichnung) und
`effect.saturate.glass` (Sättigung des Durchblicks), die Schatten in
`shadow.float` (App-Panel) und `shadow.railFloat` (die beiden abgesetzten
Leisten).

## Gruppen-Farben der Marker-Chips

> ⚠️ **Derzeit ungenutzt.** Die Marker-Kachel trug einen getönten Icon-Chip je
> Anzeige-Gruppe; er ist entfernt, weil alle Kacheln eines Abschnitts denselben
> zeigten und damit nichts unterschieden. Die Stufen bleiben als Palette
> stehen. Wer sie zurückholt, grenzt sie gegen `status.*` ab — die Kachel
> benutzt Grün, Bernstein und Rot inzwischen für ein Urteil.

`semantic.<mode>.color.category.k1 … k5` sind fünf **gedämpfte, chromaarme**
Farbpaare (je `surface` für den runden Chip und `icon` für das Symbol darin) —
**eines je Anzeige-Gruppe**, in deren Reihenfolge:

| Slot | Anzeige-Gruppe  | Ton                   |
| ---- | --------------- | --------------------- |
| `k1` | Hormone         | Violett (L\* 88)      |
| `k2` | Herz-Gesundheit | Periwinkle (L\* 92)   |
| `k3` | Stoffwechsel    | warmes Taupe (L\* 87) |
| `k4` | Schilddrüse     | Petrol (L\* 83)       |
| `k5` | Leber & Niere   | Azur (L\* 92)         |

> **Namensfalle:** `k1 … k5` sind hier nur Steckplätze für **Anzeige-Gruppen**
> und haben nichts mit den **Bewertungs-Kategorien K1–K4** der Analyse zu tun.
> Die Kürzel bleiben vorerst, weil die Kachel sie so anspricht; sie werden in die
> Gruppen-Ids aus `contracts/biomarker.ts` umbenannt, sobald die Kachel ihre
> Gruppe von dort liest.

Die fünf Töne müssen **nebeneinander** unterscheidbar sein. Sie liegen deshalb
weit auseinander im Farbkreis _und_ auf verschiedenen Helligkeiten (L\* 83 bis 92) — geprüft gegen Deuteran-, Protan- und Tritanopie sowie in Graustufen, das
schwächste Paar liegt bei ΔE 13. Zusätzlich trägt jede Gruppe ein eigenes Icon:
die Farbe ist nie das einzige Unterscheidungsmerkmal.

Sie bedeuten **keinen Zustand**. Ein Chip sagt „Hormon“ oder „Schilddrüse“, nie
„gut“ oder „schlecht“. Deshalb sind sie ausdrücklich von der Status-Palette
getrennt und bewusst niedrig gesättigt — fünf ruhige Töne, kein Farbzirkus. Für
eine Bewertung ist allein `status.*` zuständig.

## Diagramm-Farben

`semantic.<mode>.color.chart.1 … .5` werden bewusst als `--chart-1 … --chart-5`
ausgegeben, weil shadcn/ui und Recharts genau diese Namen erwarten. Weil sie je
Modus definiert sind, erben Diagramme Hell/Dunkel von selbst — in `globals.css`
steht dafür nichts mehr.

## Nur `tokens.json` bearbeiten

`tokens/generated/` wird **erzeugt und niemals von Hand bearbeitet** — jeder
Lauf von `npm run tokens` überschreibt den Inhalt. Die erzeugte Datei trägt
deshalb den Kopf `AUTO-GENERATED from tokens/tokens.json — DO NOT EDIT`.

```bash
npm run tokens
```

Der Befehl läuft automatisch vor `npm run dev` und `npm run build`
(`predev`/`prebuild`), es gibt also keinen Zustand, in dem CSS und Tokens
auseinanderlaufen.

Was dabei passiert:

1. `tokens.json` lesen, alle Alias-Referenzen rekursiv auflösen.
2. **WCAG-Kontraste prüfen** (Schwelle 4.5:1). Geprüft wird Text auf allen
   Flächen inklusive der Glasflächen. Deren `rgba`-Wert wird dafür über dem
   ungünstigsten Punkt des Hintergrunds gerechnet, und der ist je nach Textfarbe
   ein anderer: dunkler Text auf heller Glasfläche wird über dem **dunkelsten**
   Stopp des Verlaufs gemessen, heller Text auf einer dunklen Glasfläche über dem
   **hellsten**. Gestapelte Flächen werden dabei tatsächlich gestapelt
   (`content` über `shell` über dem Grund), sonst rechnet die Prüfung eine
   Durchsichtigkeit, die es auf dem Bildschirm nicht gibt. Fällt ein Paar durch,
   endet der Lauf mit Fehler und es wird **kein CSS geschrieben**. `brand.secondary` ist ausdrücklich nur Deko und darf im
   Bereich 3:1–4.5:1 liegen; das ergibt eine Warnung statt eines Fehlers.
3. `tokens/generated/theme.css` schreiben: `:root` mit allen Primitiven und den
   hellen semantischen Tokens, `.dark` überschreibt die semantischen.

`app/globals.css` importiert diese Datei und bildet darauf nur noch die Namen
ab, die shadcn/ui und die Tailwind-Utilities erwarten (`--primary`, `--border`,
`--radius`, …). Dort stehen ausschliesslich `var()`-Verweise.

## Stolperfallen

- Die Blur-Tokens heissen `--blur-sm/md/lg/xl` und überschreiben damit bewusst
  die gleichnamigen Tailwind-Defaults. `backdrop-blur-md` liefert also 16px aus
  `effect.blur.md`, nicht Tailwinds 12px, und `--blur-xl` sind 32px statt 24px.
- `dimension.radius.base` ist der Anker für shadcn `--radius`; die Tailwind-
  Stufen `rounded-sm/md/lg/xl/2xl` werden in `globals.css` daraus berechnet.
- Neue Farben immer zuerst in Stufe 1 anlegen und in Stufe 2 nur referenzieren.
