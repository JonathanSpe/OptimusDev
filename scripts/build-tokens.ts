/**
 * Generiert tokens/generated/theme.css aus tokens/tokens.json (W3C DTCG).
 *
 * Ablauf: Tokens lesen -> Alias-Referenzen wie "{primitive.color.brand.600}"
 * rekursiv aufloesen -> WCAG-Kontraste pruefen -> CSS schreiben. Faellt ein
 * Kontrast durch, wird KEIN CSS geschrieben und der Prozess endet mit Code 1.
 *
 * Aufruf: npm run tokens (laeuft auch automatisch via predev/prebuild).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SOURCE_PATH = join(process.cwd(), "tokens", "tokens.json");
const TARGET_PATH = join(process.cwd(), "tokens", "generated", "theme.css");

/** Ab diesem Verhaeltnis gilt Text als AA-lesbar. */
const CONTRAST_THRESHOLD = 4.5;
/** Untergrenze fuer dekorative Flaechen (grosse Schrift, Icons, Deko). */
const DECORATIVE_THRESHOLD = 3;

type TokenValue = string | number | (string | number)[];

type TokenTree = {
  [key: string]: TokenTree | TokenValue | undefined;
  $value?: TokenValue;
  $type?: string;
  $description?: string;
};

type ResolvedToken = {
  /** Pfadsegmente ohne die Tier-Praefixe, z. B. ["surface", "glassStrong"]. */
  segments: string[];
  value: string;
  type: string;
};

// ---------------------------------------------------------------- Tokens lesen

function isTree(node: unknown): node is TokenTree {
  return typeof node === "object" && node !== null && !Array.isArray(node);
}

function isTokenNode(
  node: unknown,
): node is TokenTree & { $value: TokenValue } {
  return isTree(node) && "$value" in node;
}

function readTokens(): TokenTree {
  let raw: string;
  try {
    raw = readFileSync(SOURCE_PATH, "utf8");
  } catch {
    throw new Error(
      `tokens/tokens.json nicht gefunden (${SOURCE_PATH}). Bitte npm run tokens im Projektwurzel-Verzeichnis ausfuehren.`,
    );
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isTree(parsed)) {
    throw new Error(
      "tokens/tokens.json enthaelt kein Objekt auf oberster Ebene.",
    );
  }
  return parsed;
}

const tokens = readTokens();

function nodeAt(path: string): unknown {
  let current: unknown = tokens;
  for (const segment of path.split(".")) {
    if (!isTree(current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Loest "{pfad.zum.token}" rekursiv auf. Referenzen duerfen auch mitten im
 * Wert stehen, damit z. B. Gradients auf Tokens zeigen koennen.
 */
function resolveString(value: string, trail: string[]): string {
  return value.replace(/\{([^}]+)\}/g, (_match, rawPath: string) => {
    const path = rawPath.trim();
    if (trail.includes(path)) {
      throw new Error(
        `Zirkulaere Alias-Kette in tokens.json: ${[...trail, path].join(" -> ")}`,
      );
    }
    const target = nodeAt(path);
    if (!isTokenNode(target)) {
      throw new Error(
        `Alias "{${path}}" zeigt auf kein Token mit $value (referenziert von ${trail.at(-1) ?? "?"}).`,
      );
    }
    return formatValue(target.$value, [...trail, path]);
  });
}

function quoteFontFamily(family: string): string {
  return /^[a-zA-Z-]+$/.test(family) ? family : `"${family}"`;
}

function formatValue(value: TokenValue, trail: string[]): string {
  if (Array.isArray(value)) {
    return value.map((entry) => quoteFontFamily(String(entry))).join(", ");
  }
  if (typeof value === "number") return String(value);
  return resolveString(value, trail);
}

/** Sammelt alle Tokens unterhalb von `path` mit ihren Restsegmenten. */
function collect(path: string): ResolvedToken[] {
  const root = nodeAt(path);
  if (!isTree(root)) {
    throw new Error(`Erwarteter Token-Zweig "${path}" fehlt in tokens.json.`);
  }

  const found: ResolvedToken[] = [];
  const walk = (node: TokenTree, segments: string[]): void => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      const next = [...segments, key];
      if (isTokenNode(child)) {
        found.push({
          segments: next,
          value: formatValue(child.$value, [`${path}.${next.join(".")}`]),
          type: typeof child.$type === "string" ? child.$type : "unknown",
        });
      } else if (isTree(child)) {
        walk(child, next);
      }
    }
  };
  walk(root, []);
  return found;
}

function resolvedValue(path: string): string {
  const node = nodeAt(path);
  if (!isTokenNode(node)) {
    throw new Error(
      `Token "${path}" fehlt in tokens.json oder hat kein $value.`,
    );
  }
  return formatValue(node.$value, [path]);
}

// ------------------------------------------------------------- Variablennamen

function kebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Semantische Tokens heissen einheitlich --color-<gruppe>-<name>. Ausnahmen:
 * Glas-Flaechen und der Canvas-Gradient werden direkt von den Utilities in
 * globals.css konsumiert und behalten ihre kurzen Namen.
 */
const SEMANTIC_NAME_OVERRIDES: Record<string, string> = {
  "background.canvas": "--background-canvas",
  "background.grain": "--background-grain",
  "surface.glass": "--surface-glass",
  "surface.glassStrong": "--surface-glass-strong",
  "surface.glassSubtle": "--surface-glass-subtle",
  "surface.glassBorder": "--surface-glass-border",
};

/** `segments` ist relativ zu semantic.<mode>.color, z. B. ["surface", "glass"]. */
function semanticName(segments: string[]): string {
  const override = SEMANTIC_NAME_OVERRIDES[segments.join(".")];
  if (override !== undefined) return override;
  // Chart-Serien behalten die Namen, die shadcn/Recharts erwarten: --chart-1 …
  if (segments[0] === "chart") {
    return `--chart-${segments.slice(1).map(kebab).join("-")}`;
  }
  return `--color-${segments.map(kebab).join("-")}`;
}

type Section = {
  title: string;
  path: string;
  name: (segments: string[]) => string;
};

const PRIMITIVE_SECTIONS: Section[] = [
  {
    title: "Stufe 1 — Rohpalette. Nie direkt in Komponenten verwenden.",
    path: "primitive.color",
    name: (segments) => `--${segments.map(kebab).join("-")}`,
  },
  {
    title: "Abstaende",
    path: "dimension.space",
    name: (segments) => `--space-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Rundungen",
    path: "dimension.radius",
    name: (segments) => `--radius-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Layout-Breiten",
    path: "dimension.size",
    name: (segments) => `--size-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Schrift-Familien",
    path: "typography.fontFamily",
    name: (segments) => `--font-family-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Schriftgroessen",
    path: "typography.fontSize",
    name: (segments) => `--font-size-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Schriftschnitte",
    path: "typography.fontWeight",
    name: (segments) => `--font-weight-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Schatten",
    path: "shadow",
    name: (segments) => `--shadow-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Blur (Glassmorphism)",
    path: "effect.blur",
    name: (segments) => `--blur-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Nachsaettigung hinter dem Glas",
    path: "effect.saturate",
    name: (segments) => `--saturate-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Kornschicht",
    path: "effect.grain",
    name: (segments) => `--grain-${segments.map(kebab).join("-")}`,
  },
  {
    title: "Uebergaenge",
    path: "effect.transition",
    name: (segments) => `--transition-${segments.map(kebab).join("-")}`,
  },
];

// ------------------------------------------------------------ Farben & Kontrast

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(input: string): Rgba {
  const value = input.trim();

  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(value);
  if (hex) {
    const digits = hex[1] ?? "";
    const expand = (short: string): string =>
      short
        .split("")
        .map((char) => char + char)
        .join("");
    const full =
      digits.length === 3 || digits.length === 4 ? expand(digits) : digits;
    if (full.length !== 6 && full.length !== 8) {
      throw new Error(`Unlesbarer Hex-Farbwert: ${input}`);
    }
    const channel = (index: number): number =>
      Number.parseInt(full.slice(index * 2, index * 2 + 2), 16);
    return {
      r: channel(0),
      g: channel(1),
      b: channel(2),
      a: full.length === 8 ? channel(3) / 255 : 1,
    };
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = (rgb[1] ?? "")
      .split(/[,/\s]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const [r, g, b, a] = parts;
    if (r === undefined || g === undefined || b === undefined) {
      throw new Error(`Unlesbarer rgb()-Farbwert: ${input}`);
    }
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      a: a === undefined ? 1 : Number(a),
    };
  }

  throw new Error(
    `Farbwert "${input}" kann fuer die Kontrastpruefung nicht gelesen werden.`,
  );
}

/** Legt eine (teil-)transparente Farbe ueber einen deckenden Hintergrund. */
function composite(front: Rgba, back: Rgba): Rgba {
  return {
    r: front.r * front.a + back.r * (1 - front.a),
    g: front.g * front.a + back.g * (1 - front.a),
    b: front.b * front.a + back.b * (1 - front.a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(foreground: Rgba, background: Rgba): number {
  const front =
    foreground.a < 1 ? composite(foreground, background) : foreground;
  const a = relativeLuminance(front);
  const b = relativeLuminance(background);
  const [lighter, darker] = a >= b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extremwerte des Mesh-Hintergrunds. Eine transluzente Flaeche nimmt die
 * Helligkeit dessen an, was hinter ihr liegt — der unguenstigste Fall haengt
 * deshalb davon ab, in welche Richtung der Text gegenhaelt:
 *
 *   dunkle Schrift auf hellem Glas  -> DUNKELSTES Feld (Flaeche wird dunkler,
 *                                      der Abstand zum Text schrumpft)
 *   helle Schrift auf Rauchglas     -> HELLSTES Feld (Flaeche wird heller)
 *
 * Beides zu pruefen ist der Grund, warum der Mesh-Hintergrund ueberhaupt eine
 * nennenswerte Helligkeitsspanne haben darf.
 */
function gradientStop(gradient: string, pick: "lightest" | "darkest"): Rgba {
  const stops = gradient.match(/#[0-9a-fA-F]{3,8}/g);
  if (!stops || stops.length === 0) {
    throw new Error(
      `Im Gradient "${gradient}" wurden keine Farbstopps gefunden — Kontrastpruefung fuer Glas nicht moeglich.`,
    );
  }
  return stops.map(parseColor).reduce((chosen, stop) => {
    const isBrighter = relativeLuminance(stop) > relativeLuminance(chosen);
    return isBrighter === (pick === "lightest") ? stop : chosen;
  });
}

/** Deckende Farbe zurueck in eine Zeichenkette, die parseColor wieder liest. */
function toRgbString({ r, g, b }: Rgba): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

type ContrastCase = {
  label: string;
  foreground: string;
  background: string;
  /** Deckende Basis, falls der Hintergrund transparent ist. */
  over?: Rgba;
  decorative?: boolean;
};

type SurfaceCase = { label: string; value: string; over?: Rgba };

function buildContrastCases(): ContrastCase[] {
  const light = (path: string): string =>
    resolvedValue(`semantic.light.${path}`);
  const canvas = light("color.background.canvas");
  const backdropDark = gradientStop(canvas, "darkest");

  /*
   * Die Glasebenen liegen UEBEREINANDER: content auf shell. Geprueft wird gegen
   * die zusammengerechnete Flaeche.
   */
  const stack = (surface: string, base: Rgba): Rgba =>
    composite(parseColor(light(`color.surface.${surface}`)), base);
  /* Helle Flaechen mit dunkler Schrift: ueber dem dunkelsten Feld. */
  const shellOnDark = stack("shell", backdropDark);

  const surfaces: SurfaceCase[] = [
    { label: "background.default", value: light("color.background.default") },
    { label: "background.subtle", value: light("color.background.subtle") },
    // Ebene 3 ist deckend — hier gibt es nichts durchzurechnen.
    { label: "surface.card", value: light("color.surface.card") },
    {
      label: "surface.glass",
      value: light("color.surface.glass"),
      over: backdropDark,
    },
    {
      label: "surface.glassStrong",
      value: light("color.surface.glassStrong"),
      over: backdropDark,
    },
    {
      label: "surface.glassSubtle",
      value: light("color.surface.glassSubtle"),
      over: backdropDark,
    },
    {
      label: "surface.shell",
      value: light("color.surface.shell"),
      over: backdropDark,
    },
    {
      label: "surface.content",
      value: light("color.surface.content"),
      over: shellOnDark,
    },
  ];

  /*
   * Die Kontext-Leiste ist ein eigenes Panel: sie liegt NICHT auf dem
   * Shell-Glas, sondern frei ueber dem Hintergrund — geprueft wird sie deshalb
   * direkt gegen das dunkelste Feld. Ihre Karten sind deckend.
   */
  const railSurfaces: SurfaceCase[] = [
    {
      label: "surface.rail",
      value: light("color.surface.rail"),
      over: backdropDark,
    },
    {
      label: "surface.railCard",
      value: light("color.surface.railCard"),
    },
  ];

  const cases: ContrastCase[] = [];

  /*
   * text.faint ist absichtlich leiser als AA erlaubt und darf nur fuer kurze
   * Beschriftungen stehen, deren Inhalt zusaetzlich als Text zugaenglich ist
   * (Tooltip, aria-label). Fuer diese Stufe gilt deshalb die Deko-Schwelle.
   */
  const texts: { key: string; decorative?: boolean }[] = [
    { key: "default" },
    { key: "muted" },
    { key: "faint", decorative: true },
  ];

  for (const surface of surfaces) {
    for (const text of texts) {
      cases.push({
        label: `text.${text.key} auf ${surface.label}`,
        foreground: light(`color.text.${text.key}`),
        background: surface.value,
        over: surface.over,
        decorative: text.decorative,
      });
    }
  }

  /*
   * on-rail-Rollen gelten auf der Leiste und auf ihren deckenden Karten.
   * onRailFaint ist wie text.faint bewusst Deko-Stufe.
   */
  const railTexts: { key: string; decorative?: boolean }[] = [
    { key: "onRail" },
    { key: "onRailMuted" },
    { key: "onRailFaint", decorative: true },
    { key: "onRailBrand" },
  ];

  for (const surface of railSurfaces) {
    for (const text of railTexts) {
      cases.push({
        label: `text.${text.key} auf ${surface.label}`,
        foreground: light(`color.text.${text.key}`),
        background: surface.value,
        over: surface.over,
        decorative: text.decorative,
      });
    }
  }

  const railCard = railSurfaces[1];
  if (railCard === undefined) {
    throw new Error("surface.railCard fehlt in den Rail-Faellen.");
  }

  /*
   * Status auf der Leiste tritt ausschliesslich INNERHALB einer Rail-Karte auf
   * (Zeile "Antwort gespeichert", Zustand einer Datenquelle) — deshalb wird
   * genau die Flaeche geprueft, auf der die Farbe wirklich steht.
   */
  for (const status of ["successOnRail", "warningOnRail"]) {
    cases.push({
      label: `status.${status} auf surface.railCard`,
      foreground: light(`color.status.${status}`),
      background: railCard.value,
      over: railCard.over,
    });
  }

  /*
   * Der Fokus-Ring ist kein Text, muss aber auf BEIDEN Flaechenebenen sichtbar
   * bleiben — dafuer gilt die Deko-Schwelle von 3:1.
   */
  for (const surface of [...surfaces.slice(0, 1), ...railSurfaces]) {
    cases.push({
      label: `focus${surface.label.startsWith("surface.rail") ? "OnRail" : ""} auf ${surface.label}`,
      foreground: light(
        surface.label.startsWith("surface.rail")
          ? "color.focusOnRail"
          : "color.focus",
      ),
      background: surface.value,
      over: surface.over,
      decorative: true,
    });
  }

  /*
   * Kategorie-Chips: das Icon steht auf seiner getoenten Kreisflaeche. Es ist
   * formal Deko (der Markername steht daneben), wird aber trotzdem gegen AA
   * geprueft — ein Icon, das man erkennen soll, darf nicht am Limit liegen.
   */
  for (const key of ["k1", "k2", "k3", "k4", "k5"]) {
    cases.push({
      label: `category.${key}.icon auf category.${key}.surface`,
      foreground: light(`color.category.${key}.icon`),
      background: light(`color.category.${key}.surface`),
    });
  }

  /*
   * DIE SCORE-KACHEL — die einzige dunkle Flaeche im Produkt. Ihr Grund ist ein
   * Verlauf mit einem Marken-Schein darueber, sie ist also nicht ueberall
   * gleich hell. Geprueft wird die HELLSTE Stelle, denn nur dort kann heller
   * Text zu wenig Abstand bekommen: der dichteste Stopp des Scheins, gelegt
   * ueber den hellsten Stopp des Verlaufs. Die Delta-Pille hellt zusaetzlich
   * auf und bekommt deshalb ihren eigenen Fall.
   */
  const scoreLightest = composite(
    gradientStop(light("color.surface.scoreGlow"), "lightest"),
    gradientStop(light("color.surface.scoreGradient"), "lightest"),
  );
  const scorePill = composite(
    parseColor(light("color.surface.scorePill")),
    scoreLightest,
  );

  for (const text of ["onScore", "onScoreMuted"]) {
    cases.push({
      label: `text.${text} auf surface.score (hellste Stelle)`,
      foreground: light(`color.text.${text}`),
      background: toRgbString(scoreLightest),
    });
  }

  cases.push({
    label: "status.successOnScore auf surface.scorePill",
    foreground: light("color.status.successOnScore"),
    background: toRgbString(scorePill),
  });

  /*
   * Die gestrichelte Ziellinie ist kein Text, muss aber als Linie erkennbar
   * bleiben — dafuer gilt die Deko-Schwelle.
   */
  cases.push({
    label: "border.onScore auf surface.score (hellste Stelle)",
    foreground: light("color.border.onScore"),
    background: toRgbString(scoreLightest),
    decorative: true,
  });

  cases.push({
    label: "text.onBrand auf brand.default",
    foreground: light("color.text.onBrand"),
    background: light("color.brand.default"),
  });

  // brand.secondary ist laut tokens.json ausdruecklich nur Deko/Flaeche.
  cases.push({
    label: "text.onBrand auf brand.secondary",
    foreground: light("color.text.onBrand"),
    background: light("color.brand.secondary"),
    decorative: true,
  });

  /*
   * Status-Farben sind reserviert und treten immer als Text/Icon auf — einmal
   * auf der normalen Flaeche und einmal auf ihrer eigenen zarten Flaeche.
   * Beide Paarungen muessen AA erfuellen.
   */
  for (const status of ["success", "warning", "critical"]) {
    cases.push({
      label: `status.${status} auf background.default`,
      foreground: light(`color.status.${status}`),
      background: light("color.background.default"),
    });
    cases.push({
      label: `status.${status} auf status.${status}Subtle`,
      foreground: light(`color.status.${status}`),
      background: light(`color.status.${status}Subtle`),
    });
    /*
     * Auf der Analyse-Oberflaeche steht jeder Befund auf einer DECKENDEN
     * Karte. Die Flaeche ist heute dieselbe wie background.default — geprueft
     * wird sie trotzdem einzeln, damit ein spaeter getoentes surface.card hier
     * auffliegt und nicht erst auf dem Schirm.
     */
    cases.push({
      label: `status.${status} auf surface.card`,
      foreground: light(`color.status.${status}`),
      background: light("color.surface.card"),
    });
  }

  /*
   * Die beiden tragenden Marken der Kategorie-Ringe sind GRAFIK, kein Text:
   * fuer sie gilt die Deko-Schwelle (WCAG 1.4.11, 3:1). Sie stehen hier, weil
   * am Ring sonst nichts mehr die Aussage traegt — faellt der Strich des
   * letzten Tests unter die Schwelle, verliert der Ring seinen Bezugspunkt.
   */
  for (const mark of ["value", "notch"]) {
    cases.push({
      label: `gauge.${mark} auf surface.card`,
      foreground: light(`color.gauge.${mark}`),
      background: light("color.surface.card"),
      decorative: true,
    });
  }

  /*
   * Dieselbe Deko-Schwelle fuer die Landkarte und die Verlaufskurven: die Marke
   * traegt dort die ganze Aussage, die Trennung der Datenlage ist die einzige
   * Linie mit Inhalt, und eine Verlaufslinie, die unter 3:1 faellt, zeigt eine
   * Messung, die niemand sieht. Der Marken-Akzent ist brand.default — er hebt
   * einzelne Punkte hervor und muss sich dafuer von der Karte abheben, nicht
   * nur von den anderen Marken.
   */
  for (const mark of [
    "mark",
    "divider",
    "series",
    "seriesMuted",
    "crosshair",
    "timelineWindow",
    "timelineNow",
  ]) {
    cases.push({
      label: `plot.${mark} auf surface.card`,
      foreground: light(`color.plot.${mark}`),
      background: light("color.surface.card"),
      decorative: true,
    });
  }
  cases.push({
    label: "brand.default auf surface.card (Marken-Akzent)",
    foreground: light("color.brand.default"),
    background: light("color.surface.card"),
    decorative: true,
  });

  return cases;
}

type ContrastResult = ContrastCase & {
  ratio: number;
  state: "ok" | "warn" | "fail";
};

function evaluateContrast(): ContrastResult[] {
  return buildContrastCases().map((entry) => {
    const backgroundColor = parseColor(entry.background);
    const background =
      backgroundColor.a < 1
        ? composite(
            backgroundColor,
            entry.over ?? { r: 255, g: 255, b: 255, a: 1 },
          )
        : backgroundColor;
    const ratio = contrastRatio(parseColor(entry.foreground), background);

    const floor = entry.decorative ? DECORATIVE_THRESHOLD : CONTRAST_THRESHOLD;
    const state =
      ratio >= CONTRAST_THRESHOLD ? "ok" : ratio >= floor ? "warn" : "fail";
    return { ...entry, ratio, state };
  });
}

function reportContrast(results: ContrastResult[]): void {
  const width = Math.max(...results.map((entry) => entry.label.length));
  const icon = { ok: "OK  ", warn: "WARN", fail: "FAIL" };

  console.log(
    `\nWCAG-Kontraste (Hell-Modus, Schwelle ${CONTRAST_THRESHOLD}:1):`,
  );
  for (const entry of results) {
    const note = entry.state === "warn" ? " (nur Deko/grosse Schrift)" : "";
    console.log(
      `  ${icon[entry.state]}  ${entry.label.padEnd(width)}  ${entry.ratio.toFixed(2)}:1${note}`,
    );
  }

  const failures = results.filter((entry) => entry.state === "fail");
  const warnings = results.filter((entry) => entry.state === "warn");
  console.log(
    `\n  ${results.length - failures.length - warnings.length} ok, ${warnings.length} Warnung(en), ${failures.length} Fehler.`,
  );
}

// ------------------------------------------------------------------ CSS bauen

function declarations(sections: Section[]): string[] {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(`  /* ${section.title} */`);
    for (const token of collect(section.path)) {
      lines.push(`  ${section.name(token.segments)}: ${token.value};`);
    }
    lines.push("");
  }
  return lines;
}

function semanticDeclarations(mode: "light" | "dark"): string[] {
  return collect(`semantic.${mode}.color`).map(
    (token) => `  ${semanticName(token.segments)}: ${token.value};`,
  );
}

function buildCss(): string {
  const lines: string[] = [
    "/* AUTO-GENERATED from tokens/tokens.json — DO NOT EDIT */",
    "/* Neu erzeugen mit: npm run tokens */",
    "",
    ":root {",
    ...declarations(PRIMITIVE_SECTIONS),
    "  /* Stufe 2 — semantische Tokens (Hell ist der Standard-Modus). */",
    ...semanticDeclarations("light"),
    "}",
    "",
    ".dark {",
    "  /* Stufe 2 — semantische Tokens (Dunkel). */",
    ...semanticDeclarations("dark"),
    "}",
    "",
  ];
  return lines.join("\n");
}

// ----------------------------------------------------------------------- Main

function main(): void {
  const results = evaluateContrast();
  reportContrast(results);

  const failures = results.filter((entry) => entry.state === "fail");
  if (failures.length > 0) {
    const detail = failures
      .map(
        (entry) =>
          `  - ${entry.label}: ${entry.ratio.toFixed(2)}:1 (< ${CONTRAST_THRESHOLD}:1)`,
      )
      .join("\n");
    throw new Error(
      `Kontrastpruefung fehlgeschlagen — tokens/generated/theme.css wurde NICHT geschrieben.\n${detail}\n\nBitte die betroffenen Farben in tokens/tokens.json korrigieren.`,
    );
  }

  const css = buildCss();
  mkdirSync(dirname(TARGET_PATH), { recursive: true });
  writeFileSync(TARGET_PATH, css, "utf8");
  console.log(
    `\ntokens/generated/theme.css geschrieben (${css.split("\n").length} Zeilen).`,
  );
}

try {
  main();
} catch (error) {
  console.error(
    `\nnpm run tokens fehlgeschlagen:\n${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
