"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";
import { Area, AreaChart, ReferenceArea, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Biomarker, Measurement } from "@/contracts";
import { cn } from "@/lib/utils";

import {
  DELTA_THRESHOLD,
  toChangeReading,
  toCurrentValue,
  toMarkerStanding,
  toOptimalRange,
  type ChangeReading,
  type MarkerStanding,
  type ValueRange,
} from "../rules";

/*
 * Die Form der Daten kommt aus contracts/biomarker.ts. Die Kachel bringt keine
 * eigene Fassung davon mit: der aktuelle Wert ist der LETZTE Eintrag des
 * Verlaufs, ein leerer Verlauf bedeutet "noch nicht gemessen", und die Einheit
 * darf leer sein (die dimensionslosen Verhaeltnis-Indizes).
 */

/** "value" = Wert, Sparkline und Referenzbereich; "trend" = grosses Diagramm. */
export type BiomarkerPanelView = "value" | "trend";

/*
 * ⚠️ HIER SASS EIN ICON-CHIP — ein getoenter Kreis mit einem Symbol je
 * Anzeige-Gruppe, fuenf Toene, ein Symbol pro Abschnitt. Er ist entfernt, und
 * das ist kein Verlust: das Symbol war fuer alle vier Marker eines Abschnitts
 * dasselbe und stand damit unter einer Ueberschrift, die schon dasselbe sagte.
 * Es unterschied also nichts — es fuellte 28px neben jedem Namen.
 *
 * Was dadurch besser wird: der Name bekommt die Breite, die vorher der Kreis
 * hatte, und faengt an derselben Kante an wie Zahl, Kurve und Schiene darunter.
 * Aus fuenf Toenen plus drei Statusfarben werden drei Statusfarben.
 *
 * Wer je wieder ein Symbol auf diese Kachel setzt, sollte begruenden koennen,
 * welche Frage es beantwortet, die der Name nicht beantwortet.
 */

export interface BiomarkerPanelProps {
  marker: Biomarker;
  /*
   * Ansicht der Kachel. Sie wird von aussen gesteuert: ein Umschalter im
   * Seitenkopf stellt ALLE Kacheln gemeinsam um, damit die Kacheln einer Zeile
   * immer gleich hoch bleiben. Die Kachel haelt dazu keinen eigenen Zustand.
   */
  view: BiomarkerPanelView;
  /*
   * ANZEIGENAMEN der Quellmarker eines berechneten Index. Der Contract kennt
   * nur Ids ("hdl-cholesterin"), und eine Id vorzulesen hilft niemandem —
   * aufloesen kann sie nur, wer die ganze Liste hat: das Board.
   */
  derivedFromNames?: readonly string[];
  /** Oeffnet spaeter die Detailansicht des Markers. */
  onOpenDetails?: (markerId: string) => void;
  className?: string;
}

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/*
 * ============================================================================
 * DIE LAGE DES WERTS — eine Aussage, drei Auftritte, EINE Tabelle.
 * ============================================================================
 * Die Kachel traegt zwei Aussagen, und jede hat ihren eigenen Kanal: die Pille
 * deutet die BEWEGUNG (naeher ans Ziel oder weiter weg), Kurve UND Wertmarker
 * zeigen die LAGE (im Ziel, grenzwertig, ausserhalb der Referenz). Beide in
 * dieselbe Farbe zu legen, hiesse eine der beiden aufzugeben — ein Wert kann
 * sich verbessern und trotzdem weit ausserhalb liegen, und genau dieser Fall
 * ist der interessanteste.
 *
 * KURVE UND MARKER TRAGEN DENSELBEN TON, weil sie dasselbe sagen: die Kurve
 * zeichnet den Weg zum aktuellen Wert, der Marker seine Lage auf der Schiene.
 * Der Marker stand frueher im Markenton — das war der letzte Rest aus der Zeit,
 * in der die Kachel nichts bewertete, und es machte aus einer Aussage zwei
 * Farben. Genau ein Wert, genau eine Farbe.
 *
 * Drei Spalten, weil dieselbe Lage an drei Stellen auftritt und keine davon
 * ihre eigene Zuordnung erfinden darf: `line` geht als CSS-Variable an
 * Recharts, `mark` ist eine Utility-Klasse fuer den Strich auf der Schiene
 * (Farbe im style-Attribut ist verboten), `label` ist das Wort.
 *
 * OHNE FARBE BLEIBT DIE AUSSAGE STEHEN (WCAG 1.4.1): dieselbe Lage zeigt die
 * Schiene als POSITION — der Marker sitzt im Band oder daneben, und die Baender
 * darunter bleiben neutral, damit man das sieht. Die Farbe verdoppelt diese
 * Auskunft, sie ersetzt sie nicht. Vorgelesen wird sie ueber das aria-label der
 * Kachel und den Tooltip der Schiene.
 *
 * Die Toene kommen aus den Status-Tokens (success/warning/critical) und nicht
 * aus der Marken- oder Kategorie-Palette.
 */
interface StandingLook {
  /** Farbe der Verlaufskurve — als CSS-Variable fuer die chart-Config. */
  line: string;
  /** Farbe des Wertmarkers auf der Schiene — als Utility-Klasse. */
  mark: string;
  /** Die Lage als Wort, fuer aria-label und Tooltip. */
  label: string | null;
}

const STANDING_LOOK: Readonly<Record<MarkerStanding, StandingLook>> = {
  imZiel: {
    line: "var(--success)",
    mark: "bg-success",
    label: "im Zielbereich",
  },
  grenzwertig: {
    line: "var(--warning)",
    mark: "bg-warning",
    label: "grenzwertig",
  },
  auffaellig: {
    line: "var(--critical)",
    mark: "bg-critical",
    label: "ausserhalb des Referenzbereichs",
  },
  /*
   * Ohne Messwert gibt es nichts zu deuten — dann bleibt die Kurve neutral.
   * Der Marker kommt in diesem Zustand gar nicht erst vor: ohne Wert gibt es
   * keine Lage, die er zeigen koennte.
   */
  unbekannt: {
    line: "var(--chart-1)",
    mark: "bg-muted-foreground",
    label: null,
  },
};

/*
 * Die Schiene zeigt eine ANZEIGE-Skala, die breiter ist als der
 * Referenzbereich: unten 40 %, oben 30 % der Bereichsspanne zusaetzlich. Nur so
 * liegt ein Wert ausserhalb des Bereichs sichtbar neben dem Band statt am Rand
 * zu kleben. Nach unten wird bei 0 gestoppt — negative Messwerte gibt es nicht.
 */
const TRACK_LOWER_REACH = 0.4;
const TRACK_UPPER_REACH = 0.3;
/* Reicht ein Messwert ueber die Anzeige-Skala hinaus, waechst sie um denselben
 * Anteil weiter — der Marker klebt dann nie am Ende der Schiene. */
/* Haelt die Grenz-Beschriftungen vollstaendig innerhalb der Schienenbreite. */
const TRACK_LABEL_INSET = 4;

/* Polster ueber und unter der Kurve, damit sie nicht an der Kante klebt. */
const DOMAIN_PADDING = 0.12;

/* Eine Referenzgrenze wandert nur dann in die Skala, wenn sie hoechstens diesen
 * Anteil der Messspanne entfernt liegt. Sonst wuerde ein weiter Bereich wie
 * 30–300 die Kurve zu einer Geraden zusammendruecken. */
const REFERENCE_REACH = 0.6;

/*
 * Dieselben Zonen-Tokens wie an der Schiene, nur leiser: eine Flaeche ueber die
 * ganze Diagrammhoehe wirkt viel schwerer als ein 6px-Balken. Der Faktor gilt
 * fuer BEIDE Baender, damit ihr Dichteverhaeltnis — und damit die Lesart
 * "Optimalbereich ist der dichtere" — unveraendert bleibt.
 */
const BAND_AREA_OPACITY = 0.45;

type DeltaDirection = "up" | "down" | "flat";

interface BiomarkerDelta {
  /** Relative Veraenderung zur vorherigen Messung, z. B. 0.12 fuer +12 %. */
  ratio: number;
  direction: DeltaDirection;
  /** Ob diese Bewegung dem Zielbereich naeher kam. Kommt aus rules.ts. */
  reading: ChangeReading;
}

interface ChartPoint {
  /** Volles Datum; dient zugleich als X-Kategorie und Tooltip-Titel. */
  label: string;
  value: number;
}

/*
 * ENTSCHEIDUNG: Datum bewusst ohne Date-Objekt formatiert — so rendern Server
 * und Client unabhaengig von der Zeitzone dieselbe Zeichenkette.
 */
function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

interface TrackScale {
  /** Linke und rechte Kante des Referenzbands in Prozent der Schienenbreite. */
  bandStart: number;
  bandEnd: number;
  /** Position eines Messwerts in Prozent der Schienenbreite. */
  position: (value: number) => number;
}

function toTrackScale(
  min: number,
  max: number,
  value: number | null,
): TrackScale {
  const span = max - min || Math.abs(max) || 1;
  let displayMin = Math.max(0, min - span * TRACK_LOWER_REACH);
  let displayMax = max + span * TRACK_UPPER_REACH;

  if (value !== null) {
    displayMin = Math.min(displayMin, value - span * TRACK_LOWER_REACH);
    displayMax = Math.max(displayMax, value + span * TRACK_UPPER_REACH);
  }
  displayMin = Math.max(0, displayMin);

  const width = displayMax - displayMin || 1;
  const position = (point: number): number =>
    Math.min(100, Math.max(0, ((point - displayMin) / width) * 100));

  return { bandStart: position(min), bandEnd: position(max), position };
}

/** Haelt eine Beschriftung an einer Bandkante vollstaendig in der Schiene. */
function toLabelPosition(percent: number): number {
  return Math.min(
    100 - TRACK_LABEL_INSET,
    Math.max(TRACK_LABEL_INSET, percent),
  );
}

/**
 * Liegen die beiden Grenzen dichter zusammen als das, stehen ihre Zahlen
 * uebereinander. Dann wird daraus EINE Beschriftung ("0,5–2,5") in der Mitte
 * des Bands. Geschaetzt in Prozent der Schienenbreite: die schmalste Kachel ist
 * size.cardMin breit, abzueglich ihrer Innenabstaende bleiben rund 224px fuer
 * die Schiene, und eine Ziffer belegt bei 11px Schrift etwa 6px.
 */
const LABEL_MERGE_PERCENT = (7 * 6 * 100) / 224;

/**
 * Haengt die Einheit an eine Zahl — oder eben nicht: die abgeleiteten
 * Verhaeltnis-Indizes sind dimensionslos und tragen im Contract eine LEERE
 * Einheit. Ohne diese Weiche stuende dort ein Leerzeichen zu viel.
 */
function withUnit(text: string, unit: string): string {
  return unit === "" ? text : `${text} ${unit}`;
}

/** Kurzfassung fuer den Tooltip. Die Einheit steht genau einmal, am Ende. */
function toZoneSummary(marker: Biomarker, optimal: ValueRange | null): string {
  const reference = withUnit(
    `Referenz ${numberFormat.format(marker.referenceLow)}–${numberFormat.format(marker.referenceHigh)}`,
    marker.unit,
  );
  if (!optimal) return reference;

  return `Optimal ${numberFormat.format(optimal.low)}–${numberFormat.format(optimal.high)} · ${reference}`;
}

/**
 * Dieselbe Angabe zum Vorlesen: "bis" statt Gedankenstrich, weil ein Halbgeviert
 * je nach Screenreader verschluckt oder als "minus" gelesen wird.
 */
function toZoneLabel(marker: Biomarker, optimal: ValueRange | null): string {
  const reference = withUnit(
    `Referenzbereich ${numberFormat.format(marker.referenceLow)} bis ${numberFormat.format(marker.referenceHigh)}`,
    marker.unit,
  );
  if (!optimal) return reference;

  return `Optimalbereich ${numberFormat.format(optimal.low)} bis ${numberFormat.format(optimal.high)}, ${reference}`;
}

function toDelta(marker: Biomarker): BiomarkerDelta | null {
  const history: readonly Measurement[] = marker.history;
  const current = history.at(-1);
  const previous = history.at(-2);
  if (!current || !previous || previous.value === 0) return null;

  const ratio = (current.value - previous.value) / previous.value;
  const direction: DeltaDirection =
    ratio >= DELTA_THRESHOLD
      ? "up"
      : ratio <= -DELTA_THRESHOLD
        ? "down"
        : "flat";

  return { ratio, direction, reading: toChangeReading(marker) };
}

/**
 * Skala der Y-Achse: eng um die Messwerte gelegt und nur so weit geoeffnet,
 * dass eine nahe Bereichsgrenze mit ins Bild kommt — erst dadurch liest sich
 * ein Band als Band und nicht als flaechiger Hintergrund. Gemessen wird immer
 * gegen die urspruengliche Messspanne, damit die Reihenfolge der Grenzen das
 * Ergebnis nicht verschiebt.
 */
function toChartDomain(
  points: readonly { value: number }[],
  bounds: readonly number[] = [],
): [number, number] {
  const values = points.map((point) => point.value);
  if (values.length === 0) return [0, 1];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const fallback = Math.max(Math.abs(max) * 0.1, 1);
  const reach = (span === 0 ? fallback : span) * REFERENCE_REACH;

  let lower = min;
  let upper = max;
  for (const bound of bounds) {
    if (bound < min && min - bound <= reach) lower = Math.min(lower, bound);
    if (bound > max && bound - max <= reach) upper = Math.max(upper, bound);
  }

  const spread = upper - lower;
  const padding = spread === 0 ? fallback : spread * DOMAIN_PADDING;

  return [lower - padding, upper + padding];
}

/** Rundet die Achsenenden auf glatte Zahlen — nur so taugen sie als Beschriftung. */
function toNiceDomain([lower, upper]: [number, number]): [number, number] {
  const spread = upper - lower;
  if (spread <= 0) return [lower, upper];

  const magnitude = 10 ** Math.floor(Math.log10(spread));
  const normalized = spread / magnitude;
  const step =
    normalized >= 5
      ? magnitude
      : normalized >= 2
        ? magnitude / 2
        : magnitude / 5;

  return [Math.floor(lower / step) * step, Math.ceil(upper / step) * step];
}

const DELTA_ICONS: Record<DeltaDirection, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
};

/*
 * ============================================================================
 * DIE VERAENDERUNG — Richtung UND Deutung, in einer Pille.
 * ============================================================================
 * ⚠️ HIER STAND EINMAL DAS GEGENTEIL: "Die Veraenderung ist auf dem Dashboard
 * bewusst NEUTRAL gefaerbt, niemals gruen oder rot." Diese Regel ist bewusst
 * aufgehoben — siehe features/dashboard/rules.ts und AGENTS.md.
 *
 * ZWEI ANGABEN, ZWEI KANAELE, und sie duerfen nicht durcheinandergeraten:
 *
 *   RICHTUNG DER ZAHL — der Pfeil und das Vorzeichen. "+12 %" heisst gestiegen,
 *   sonst nichts.
 *   DEUTUNG DER BEWEGUNG — die Farbe UND das Wort dahinter. Ob ein Anstieg gut
 *   ist, haengt am Marker: derselbe Pfeil nach oben ist bei Ferritin guenstig
 *   und bei TSH ungueenstig. Deshalb steht die Deutung NEBEN dem Pfeil und
 *   nicht in ihm.
 *
 * DAS WORT IST PFLICHT, nicht Beiwerk (WCAG 1.4.1): zwei Pillen mit demselben
 * Pfeil und derselben Zahl, die sich nur im Farbton unterscheiden, sind fuer
 * jeden ununterscheidbar, der Rot und Gruen nicht trennt. Neutral traegt kein
 * Wort — dort gibt es nichts zu deuten, und "neutral" hinzuschreiben waere eine
 * Aussage ueber Rauschen.
 */
const CHANGE_LOOK: Readonly<
  Record<ChangeReading, { label: string | null; className: string }>
> = {
  guenstig: {
    label: "günstig",
    className: "bg-success-subtle text-success",
  },
  unguenstig: {
    label: "ungünstig",
    className: "bg-critical-subtle text-critical",
  },
  neutral: {
    label: null,
    className: "bg-foreground/5 text-muted-foreground",
  },
};

function DeltaPill({ delta }: { delta: BiomarkerDelta }) {
  const Icon = DELTA_ICONS[delta.direction];
  const look = CHANGE_LOOK[delta.reading];

  return (
    <span
      className={cn(
        "text-2xs inline-flex shrink-0 items-center gap-0.5 rounded-full py-0.5 pr-1.5 pl-1 font-medium whitespace-nowrap tabular-nums",
        look.className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {percentFormat.format(delta.ratio)}
      {look.label === null ? null : (
        <span className="ml-0.5 font-semibold">{look.label}</span>
      )}
      <span className="sr-only">gegenüber der vorherigen Messung</span>
    </span>
  );
}

interface BiomarkerChartProps {
  data: ChartPoint[];
  gradientId: string;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  optimal: ValueRange | null;
  /** Lage des aktuellen Werts — sie faerbt Linie, Flaeche und letzten Punkt. */
  standing: MarkerStanding;
  /** Grosse Ansicht: mit Datumsachse, Bereichsbaendern und Tooltip. */
  expanded: boolean;
}

function BiomarkerChart({
  data,
  gradientId,
  unit,
  referenceLow,
  referenceHigh,
  optimal,
  standing,
  expanded,
}: BiomarkerChartProps) {
  /*
   * Die Farbe reist als chart-Config, nicht als Attribut an jedem Element:
   * ChartContainer legt sie als --color-value an, und Linie, Flaeche und Punkt
   * greifen dieselbe Variable ab. Ein zweiter Weg dorthin waere ein zweiter Ort,
   * an dem eine Kurve ihre Farbe bekommt.
   */
  const chartConfig = {
    value: { label: "Messwert", color: STANDING_LOOK[standing].line },
  } satisfies ChartConfig;

  const lastIndex = data.length - 1;
  // Nur die aufgeklappte Ansicht zeigt die Baender — die Sparkline nicht.
  const rawDomain = toChartDomain(
    data,
    expanded
      ? [
          referenceLow,
          referenceHigh,
          ...(optimal ? [optimal.low, optimal.high] : []),
        ]
      : [],
  );
  const [domainMin, domainMax] = expanded ? toNiceDomain(rawDomain) : rawDomain;

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full w-full"
      initialDimension={{ width: 240, height: expanded ? 168 : 48 }}
    >
      <AreaChart
        data={data}
        /*
         * Recharts macht seine Flaeche sonst per tabIndex fokussierbar — in
         * einem aria-hidden-Wrapper landet der Fokus dann auf einem fuer
         * Screenreader unsichtbaren Element. Die Messwerte stehen stattdessen
         * als Liste unter dem Diagramm.
         */
        accessibilityLayer={false}
        margin={
          expanded
            ? // Rechts bleibt Platz, damit die letzte Datumsbeschriftung nicht
              // an der Kachelkante abgeschnitten wird.
              { top: 6, right: 18, bottom: 0, left: 0 }
            : { top: 5, right: 4, bottom: 3, left: 4 }
        }
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-value)"
              stopOpacity={0.18}
            />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <YAxis
          domain={[domainMin, domainMax]}
          hide={!expanded}
          // Nur die beiden Enden — die Skala soll begrenzen, nicht rastern.
          ticks={[domainMin, domainMax]}
          tickLine={false}
          axisLine={false}
          width={30}
          tickMargin={3}
          tickFormatter={(bound: number) => numberFormat.format(bound)}
        />
        <XAxis
          dataKey="label"
          hide={!expanded}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          /* Jede Messung bekommt ihr Datum; erst bei vielen Punkten ausduennen.
           * Auf der schmaleren Karte faengt das eine Messung frueher an. */
          interval={data.length > 5 ? "preserveStartEnd" : 0}
          minTickGap={8}
          // Auf der Achse reicht Tag und Monat, das Jahr steht im Tooltip.
          tickFormatter={(label: string) => label.slice(0, 6)}
        />
        {/*
         * Dieselbe Idee wie an der Schiene: ein Farbton, zwei Dichten. Das
         * Referenzband liegt unten, der Optimalbereich dichter darueber — beide
         * nur so weit, wie sie die sichtbare Skala schneiden (ifOverflow).
         */}
        {expanded ? (
          <ReferenceArea
            y1={referenceLow}
            y2={referenceHigh}
            ifOverflow="hidden"
            fill="var(--track-reference)"
            fillOpacity={BAND_AREA_OPACITY}
            stroke="none"
          />
        ) : null}
        {expanded && optimal ? (
          <ReferenceArea
            y1={optimal.low}
            y2={optimal.high}
            ifOverflow="hidden"
            fill="var(--track-optimal)"
            fillOpacity={BAND_AREA_OPACITY}
            stroke="none"
          />
        ) : null}
        <Area
          dataKey="value"
          /*
           * Sanft geglaettet — aber NIEMALS ohne die Punkte darunter: die
           * Messungen sind die Daten, die Kurve ist nur Darstellung. Wer die
           * Punkte weglaesst, behauptet einen Verlauf zwischen den Messungen,
           * den es nicht gibt. Der dot-Renderer unten ist deshalb Pflicht.
           */
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          // Jede Messung ist ein Punkt; die juengste ist der Bezug und traegt Marke.
          dot={(dot) => {
            const isLatest = dot.index === lastIndex;
            return (
              <circle
                key={`messpunkt-${dot.index}`}
                cx={dot.cx}
                cy={dot.cy}
                r={isLatest ? 3 : 1.75}
                fill={
                  isLatest ? "var(--color-value)" : "var(--muted-foreground)"
                }
                fillOpacity={isLatest ? 1 : 0.55}
                stroke={isLatest ? "var(--background)" : "none"}
                strokeWidth={isLatest ? 1.75 : 0}
              />
            );
          }}
          activeDot={
            expanded
              ? {
                  r: 3,
                  fill: "var(--color-value)",
                  stroke: "var(--background)",
                  strokeWidth: 1.75,
                }
              : false
          }
        />
        {expanded ? (
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(measured) => (
                  <span className="text-foreground font-medium tabular-nums">
                    {numberFormat.format(Number(measured))} {unit}
                  </span>
                )}
              />
            }
          />
        ) : null}
      </AreaChart>
    </ChartContainer>
  );
}

interface ReferenceTrackProps {
  marker: Biomarker;
  optimal: ValueRange | null;
  /** Lage des Werts — sie faerbt den Wertmarker wie die Kurve darueber. */
  standing: MarkerStanding;
  /** Gedimmter Zustand "nicht gemessen" — dort wird jede Stufe kraeftiger. */
  dimmed: boolean;
  onOpenDetails?: (markerId: string) => void;
}

/**
 * Drei verschachtelte Zonen in EINEM neutralen Ton, unterschieden durch Dichte
 * und Hoehe: nackte Schiene (4px) · Referenzband (4px) · Optimalsockel (8px,
 * ragt oben und unten heraus).
 *
 * DIE ZONEN BLEIBEN NEUTRAL, auch jetzt, wo Kurve und Wertmarker Farbe tragen —
 * und das ist kein Rest von frueher, sondern die Bedingung dafuer: die Baender
 * sind die farbfreie Fassung derselben Aussage, denn erst an ihnen liest man,
 * dass der Marker drinsteht oder daneben. Wer sie einfaerbte, naehme der Kachel
 * genau den Kanal, der ohne Farbe funktioniert (WCAG 1.4.1).
 *
 * Das einzige farbige Element ist der Wertmarker, und er traegt den Ton SEINER
 * Lage — denselben, den die Kurve darueber zeigt (STANDING_LOOK). Der Markenton
 * stand hier, solange die Kachel nichts bewertete; neben einer roten Kurve war
 * er nur eine zweite Farbe fuer dieselbe Zahl.
 *
 * Die Schiene ist mit der Kachel geschrumpft, ihre BESCHRIFTUNGEN nicht: die
 * Zahlen darunter sind schon auf der kleinsten Stufe, und eine Bereichsgrenze,
 * die man nicht mehr liest, kann man auch weglassen.
 */
function ReferenceTrack({
  marker,
  optimal,
  standing,
  dimmed,
  onOpenDetails,
}: ReferenceTrackProps) {
  const look = STANDING_LOOK[standing];
  const value = toCurrentValue(marker);
  const track = toTrackScale(marker.referenceLow, marker.referenceHigh, value);
  const optimalStart = optimal ? track.position(optimal.low) : 0;
  const optimalEnd = optimal ? track.position(optimal.high) : 0;

  /* Unter der 65-%-Dimmung reicht die leiseste Stufe nicht mehr — dort steigt
   * die Beschriftung eine Stufe auf. */
  const boundsTone = dimmed ? "text-foreground" : "text-muted-foreground";

  /*
   * IN RUHE STEHEN HOECHSTENS ZWEI ZAHLEN. Beschriftet wird der
   * Optimalbereich — das ist die Zone, die den Nutzer angeht. Fehlt er, treten
   * die Referenzgrenzen an seine Stelle. Die jeweils andere Zone und die
   * Einheit stehen im Tooltip und im aria-label; wer sie dauerhaft hinschreibt,
   * bekommt vier Zahlen unter einem 6px-Balken und damit Rauschen.
   */
  const bounds = optimal ?? {
    low: marker.referenceLow,
    high: marker.referenceHigh,
  };
  const boundsStart = optimal ? optimalStart : track.bandStart;
  const boundsEnd = optimal ? optimalEnd : track.bandEnd;
  const isMerged = boundsEnd - boundsStart < LABEL_MERGE_PERCENT;

  const labels = isMerged
    ? [
        {
          percent: toLabelPosition((boundsStart + boundsEnd) / 2),
          text: `${numberFormat.format(bounds.low)}–${numberFormat.format(bounds.high)}`,
        },
      ]
    : [
        {
          percent: toLabelPosition(boundsStart),
          text: numberFormat.format(bounds.low),
        },
        {
          percent: toLabelPosition(boundsEnd),
          text: numberFormat.format(bounds.high),
        },
      ];

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            /*
             * Die Schiene liegt ueber der Kachelflaeche (z-10), sonst faengt
             * diese Hover und Fokus ab und der Tooltip erscheint nie. Damit ein
             * Klick auf die Schiene nicht ins Leere geht, loest sie dieselbe
             * Aktion aus wie die Kachel — das steht auch im aria-label.
             */
            <button
              type="button"
              onClick={() => onOpenDetails?.(marker.id)}
              aria-label={`${toZoneLabel(marker, optimal)}. Details öffnen`}
              className="focus-visible:outline-ring relative z-10 block w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span aria-hidden="true" className="relative block h-2 w-full">
                <span className="bg-track-base absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
                <span
                  className="bg-track-reference absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${track.bandStart}%`,
                    width: `${track.bandEnd - track.bandStart}%`,
                  }}
                />
                {optimal ? (
                  <span
                    className="bg-track-optimal absolute inset-y-0 rounded-full"
                    style={{
                      left: `${optimalStart}%`,
                      width: `${optimalEnd - optimalStart}%`,
                    }}
                  />
                ) : null}
                {value !== null ? (
                  /* Derselbe Ton wie die Kurve darueber — im style-Attribut
                   * steht nur die Position, nie die Farbe. Der Ring in der
                   * Hintergrundfarbe trennt den Strich vom Band, damit er auch
                   * mitten im Sockel als eigenes Zeichen lesbar bleibt. */
                  <span
                    className={cn(
                      "ring-background absolute top-1/2 h-3.5 w-0.75 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
                      look.mark,
                    )}
                    style={{ left: `${track.position(value)}%` }}
                  />
                ) : null}
              </span>

              {/*
               * Die Zahlen stehen unter der Kante, die sie meinen. Die Einheit
               * fehlt hier bewusst — sie steht oben beim Messwert.
               */}
              <span aria-hidden="true" className="relative mt-1 block h-3">
                {labels.map((label) => (
                  <span
                    key={label.text}
                    className={cn(
                      "text-2xs absolute -translate-x-1/2 leading-3 tabular-nums",
                      boundsTone,
                    )}
                    style={{ left: `${label.percent}%` }}
                  >
                    {label.text}
                  </span>
                ))}
              </span>
            </button>
          }
        />
        {/* Die Lage zuerst, dann die Zahlen dahinter: wer die Schiene ansteuert,
         * will wissen, was die Farbe der Kurve behauptet — und bekommt sie hier
         * als Wort. */}
        <TooltipContent side="top" className="text-2xs tabular-nums">
          {look.label === null
            ? toZoneSummary(marker, optimal)
            : `${look.label} · ${toZoneSummary(marker, optimal)}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BiomarkerPanel({
  marker,
  view,
  derivedFromNames,
  onOpenDetails,
  className,
}: BiomarkerPanelProps) {
  // Verlaufs-Praefix, weil eine rein hexadezimale ID die Lint-Regel gegen rohe
  // Farbwerte ausloesen wuerde ("#abc" in url(#…)).
  const gradientId = `verlauf-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const value = toCurrentValue(marker);
  const hasValue = value !== null;
  /* Ein berechneter Index wird nicht gemessen — das steht sichtbar an der
   * Kachel und im aria-label, sonst liest sich eine Rechnung wie ein Befund. */
  const isDerived = marker.isDerived === true;
  /* Ein Verlauf entsteht erst ab der zweiten Messung — vorher gibt es weder
   * eine Kurve noch eine Veraenderung. */
  const hasTrend = marker.history.length > 1;
  const isTrendView = view === "trend";
  /* Gross gezeichnet wird nur, wo es auch einen Verlauf gibt. Die HOEHE der
   * Kachel haengt trotzdem allein an der Ansicht — sonst stehen in einer Zeile
   * unterschiedlich hohe Kacheln. */
  const isExpanded = hasTrend && isTrendView;
  const delta = hasTrend ? toDelta(marker) : null;
  const standing = toMarkerStanding(marker);
  const standingLabel = STANDING_LOOK[standing].label;

  const chartData: ChartPoint[] = marker.history.map((reading) => ({
    label: formatFullDate(reading.date),
    value: reading.value,
  }));

  const readingCount = marker.history.length;
  const lastReading = marker.history.at(-1);
  const optimal = toOptimalRange(marker);
  /* Quellen eines Index werden vorgelesen, nicht hingeschrieben: auf der Kachel
   * waeren drei Markernamen mehr Text als Zahl. */
  const derivedSources = (derivedFromNames ?? []).join(", ");

  /*
   * Im Zustand "nicht gemessen" ist der Inhalt gedimmt. Damit der Text dabei
   * AA-konform bleibt, wird er eine Stufe kraeftiger gewaehlt — gedimmtes
   * text-foreground entspricht optisch etwa text-muted-foreground.
   * ENTSCHEIDUNG: 65 % statt der gewuenschten 55 % Deckkraft — bei 55 % faellt
   * der Text auf 3.9:1 und damit unter die AA-Schwelle von 4.5:1.
   */
  const quietText = hasValue ? "text-muted-foreground" : "text-foreground";

  return (
    <div
      className={cn(
        // DECKENDE Karte auf der gefrosteten Inhaltsflaeche: ein Messwert wird
        // auf ruhigem Grund gelesen, nicht durch Glas hindurch.
        "surface-card group relative flex flex-col rounded-2xl p-4 transition",
        /*
         * Die Hoehe haengt an der ANSICHT, nicht am Inhalt: alle Kacheln einer
         * Zeile schalten gemeinsam um und bleiben dadurch gleich hoch. Das Mass
         * ist ein Mindestmass — im Raster streckt eine hoehere Kachel ihre
         * Zeile, und der Zugewinn geht in die Verlaufsgruppe.
         *
         * KOMPAKTER ALS FRUEHER (256/380px). Die Kachel ist ein Eintrag in
         * einer Uebersicht von zwanzig Markern und kein Schaustueck: bei der
         * alten Groesse standen drei Stueck pro Reihe, und wer den zwoelften
         * Wert sehen wollte, scrollte. Kleiner geworden ist dabei alles im
         * gleichen Verhaeltnis — Kachel, Kopf, Zahl und Kurve. Nur die
         * Schiene und ihre Beschriftungen behalten ihre Lesbarkeit.
         */
        isTrendView ? "min-h-74" : "min-h-52",
        "hover:shadow-lift motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        className,
      )}
    >
      {/*
       * Die ganze Kachel ist EIN Klickziel. Sie liegt als Flaeche ueber dem
       * Inhalt statt ihn zu umschliessen: Diagramme bringen eigene <div>s mit,
       * die in einem <button> ungueltiges HTML waeren.
       *
       * TODO(L2-Detailansicht): Hier wird spaeter die Detailansicht des Markers
       * geoeffnet (Verlauf ueber alle Messungen, Referenzlage, Empfehlungen).
       * Bis dahin bleibt die Schaltflaeche ohne Ziel — Fokusring und
       * Hover-Anhebung zeigen aber schon, dass die Kachel anklickbar ist.
       */}
      <button
        type="button"
        onClick={() => onOpenDetails?.(marker.id)}
        /*
         * Die LAGE steht im Label, weil sie sonst nur als Farbe existierte:
         * die Kurve ist aria-hidden, und ein Farbton wird nicht vorgelesen.
         */
        aria-label={[
          `Details zu ${marker.name} öffnen`,
          ...(isDerived && derivedSources !== ""
            ? [`berechnet aus ${derivedSources}`]
            : []),
          ...(standingLabel === null ? [] : [standingLabel]),
        ].join(" — ")}
        className="focus-visible:outline-ring absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
      />

      {/*
       * ZWEI GRUPPEN, ein Abstand dazwischen: oben die Identitaet mit dem Wert,
       * unten Verlauf und Schiene als Paar an der Unterkante. Der Zwischenraum
       * ist fest (gap-4); alles, was die Kachel an Hoehe dazubekommt, nimmt die
       * Kurve auf. Dadurch entsteht in keinem Zustand eine lose Flaeche in der
       * Mitte — auch nicht bei "Nicht gemessen".
       */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3",
          !hasValue && "opacity-65",
        )}
      >
        <div>
          {/*
           * Kopf: nur noch der Name. Die feste Hoehe bleibt, obwohl der Chip
           * weg ist — sie haelt die Kacheln einer Reihe auf einer Linie,
           * gleich ob unter dem Namen "berechnet" steht oder nicht. Ohne sie
           * saessen Zahl und Kurve der Nachbarkachel zwei Zeilen versetzt.
           */}
          <div className="flex h-7 min-w-0 flex-col justify-center">
            <h3 className="text-foreground truncate text-sm font-medium">
              {marker.name}
            </h3>
            {isDerived ? (
              /* Kein Badge, kein Rahmen: die Herkunft ist eine Fussnote zum
               * Namen, keine Auszeichnung. Vorgelesen wird sie samt Quellen
               * ueber das aria-label der Kachel. */
              <p className="text-2xs text-muted-foreground leading-3">
                berechnet
              </p>
            ) : null}
          </div>

          {/* Der Messwert mit seiner Veraenderung. Steht in beiden Ansichten. */}
          <div className="mt-2 flex h-8 items-baseline justify-between gap-2">
            <p className="flex min-w-0 items-baseline gap-1">
              {hasValue ? (
                <>
                  <span className="text-foreground text-metric leading-none font-semibold tracking-tight tabular-nums">
                    {numberFormat.format(value)}
                  </span>
                  {/* Dimensionslose Indizes tragen keine Einheit — dann steht
                   * hier auch kein leerer Platz. */}
                  {marker.unit === "" ? null : (
                    <span className={cn("truncate text-sm", quietText)}>
                      {marker.unit}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {/* Rein visueller Platzhalter — vorgelesen wird "Nicht gemessen". */}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground text-metric leading-none"
                  >
                    —
                  </span>
                  <span className={cn("truncate text-sm", quietText)}>
                    Nicht gemessen
                  </span>
                </>
              )}
            </p>
            {delta ? <DeltaPill delta={delta} /> : null}
          </div>

          {/* Kontextzeile — wann zuletzt und wie oft gemessen wurde. */}
          <p className={cn("text-2xs mt-1 truncate tabular-nums", quietText)}>
            {lastReading ? (
              <>
                Zuletzt {formatFullDate(lastReading.date)} · {readingCount}{" "}
                {readingCount === 1 ? "Messung" : "Messungen"}
              </>
            ) : (
              "Noch keine Messung erfasst"
            )}
          </p>
        </div>

        {/*
         * Verlauf und Schiene: ein Paar an der Unterkante (mt-auto). Die Kurve
         * nimmt die freie Hoehe auf (flex-1), die Schiene sitzt darunter — so
         * liegen die Schienen aller Kacheln einer Zeile auf einer Linie.
         */}
        <div className="mt-auto flex min-h-0 flex-1 flex-col gap-2">
          {hasTrend ? (
            <div className={cn("min-h-12 flex-1", isExpanded && "min-h-24")}>
              <div
                aria-hidden="true"
                className={cn(
                  "h-full w-full",
                  // Aufgeklappt liegt das Diagramm ueber der Kachel-Flaeche,
                  // sonst faengt sie den Hover fuer den Tooltip ab.
                  isExpanded ? "relative z-10" : "pointer-events-none",
                )}
              >
                <BiomarkerChart
                  data={chartData}
                  gradientId={gradientId}
                  unit={marker.unit}
                  referenceLow={marker.referenceLow}
                  referenceHigh={marker.referenceHigh}
                  optimal={optimal}
                  standing={standing}
                  expanded={isExpanded}
                />
              </div>
              {isExpanded ? (
                // Das Diagramm ist rein visuell — hier die gleichen Daten als Text.
                <ul className="sr-only">
                  {marker.history.map((reading) => (
                    <li key={reading.date}>
                      {formatFullDate(reading.date)}:{" "}
                      {numberFormat.format(reading.value)} {marker.unit}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            /* Kein Verlauf: ein leichter gestrichelter Umriss haelt den Platz
             * der Kurve, ohne sich wie eine aufzufuehren. Er FUELLT die Hoehe —
             * sonst bliebe genau hier die lose Flaeche. */
            <div className="border-border flex min-h-12 flex-1 items-center justify-center rounded-lg border border-dashed px-3 text-center">
              <p className={cn("text-xs", quietText)}>
                {hasValue
                  ? "Noch kein Verlauf – ab dem zweiten Test"
                  : "Verlauf ab der ersten Messung"}
              </p>
            </div>
          )}

          {/*
           * Die Schiene. Objektive Flaeche: neutral, ohne Urteil, und in beiden
           * Ansichten sichtbar — sie ist die Bezugslinie zum Wert, nicht ein
           * Ersatz fuer die Kurve.
           */}
          <ReferenceTrack
            marker={marker}
            optimal={optimal}
            standing={standing}
            dimmed={!hasValue}
            onOpenDetails={onOpenDetails}
          />
        </div>
      </div>
    </div>
  );
}
