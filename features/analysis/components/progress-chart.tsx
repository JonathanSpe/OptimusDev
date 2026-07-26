"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  SCORE_MAX,
  SCORE_MIN,
  type CategorySeries,
  type ScoreSummary,
} from "../sample-data";

/*
 * DIE VERLAUFSUEBERSICHT — der Gesamtscore und seine vier Kategorien ueber
 * alle Tests, in EINEM Feld.
 *
 * Eine Achse, fuenf Linien. Zwei y-Achsen gibt es nicht und kann es nicht
 * geben: alle fuenf Werte sind Punkte auf derselben Skala 0–100, und eine
 * zweite Achse wuerde behaupten, sie waeren es nicht. Ein Zielwert steht auch
 * nicht mehr im Feld — die 75 war eine erfundene Schwelle, und ihre Linie hier
 * wieder einzuziehen waere derselbe Fehler mit anderer Geometrie.
 *
 * Die tragende Linie ist der Gesamtscore: volle Tinte, doppelte Strichstaerke,
 * Punkte an jedem Termin. Die Kategorien laufen darunter in einem einzigen
 * leisen Ton mit — sie sind der Kontext, aus dem die eine Linie entsteht.
 */

/*
 * ENTSCHEIDUNG: EIN gemeinsames Feld mit direkten Beschriftungen am Linienende
 * — keine Small Multiples und keine Legende.
 *
 * Eine Legende zwingt zum Hin- und Herspringen und braucht dafuer einen
 * Farbschluessel; vier gedeckte Toene, die sich sicher unterscheiden lassen,
 * hat diese Palette nicht (schlechtestes Paar ΔE 4). Bleibt die Beschriftung
 * am Ende der Linie.
 *
 * Die Endpunkte liegen eng: vier der fuenf stehen innerhalb von dreizehn
 * Punkten, das engste Paar (Gesamtscore 71, Immunsystem 72) einen Punkt
 * auseinander. Drei Beschriftungen weichen deshalb aus — aber keine weiter als
 * eine Zeilenhoehe, und die tragende bleibt genau auf ihrer Linie stehen. Auf
 * dieser Strecke ist eine Fuehrungslinie noch das, was sie sein soll: eine
 * kurze Zuordnung, kein Wegweiser durch die Karte.
 *
 * GENAU DA LIEGT DIE GRENZE: muss eine Beschriftung weiter wandern als ihre
 * eigene Zeilenhoehe, verbindet die Fuehrungslinie zwei Dinge, die nicht mehr
 * offensichtlich zusammengehoeren. Dann wird gefacetet — dieselbe Achse, vier
 * kleine Felder untereinander, der Gesamtscore als blasse Geisterlinie in
 * jedem davon.
 *
 * Gegen das Faceten spricht heute die Frage, die dieses Bild beantwortet: "wie
 * steht der Gesamtscore zu seinen Kategorien". Die beantwortet nur ein Feld, in
 * dem beide uebereinander liegen. Vier Einzeldiagramme beantworten "wie lief
 * K3" — was hier niemand fragt.
 */

/** Beschriftete Linien der Score-Achse — dasselbe Raster wie in der Landkarte. */
const SCORE_GRID = [0, 25, 50, 75, 100] as const;

/*
 * Die Achse laeuft ueber die VOLLE Skala 0–100, obwohl die Kurven heute
 * zwischen 55 und 84 liegen. Ein zugeschnittener Ausschnitt macht aus drei
 * Punkten Unterschied einen halben Bildschirm — dieselbe Uebertreibung, die
 * eine abgeschnittene Achse in jedem Diagramm erzeugt. So bleibt der Verlauf
 * ausserdem mit Ring und Kachel vergleichbar, die dieselbe Skala zeigen.
 */
const toY = scaleLinear()
  .domain([SCORE_MIN, SCORE_MAX])
  .range([100, 0])
  .clamp(true);

/*
 * Mindestabstand zweier Endbeschriftungen, in PROZENT der Feldhoehe. Prozent
 * statt Pixel, weil dann keine Zahl im Code die Hoehe des Feldes kennen muss:
 * 4,5 % sind bei der Feldhoehe (h-96, 384 px) rund 17 px und damit mehr als
 * eine Zeile Text. Wird das Feld flacher, waechst der Abstand relativ mit.
 */
const LABEL_MIN_GAP = 4.5;

/*
 * Ab diesem Versatz bekommt eine Beschriftung ihre Fuehrungslinie. Ein Prozent
 * sind knapp vier Pixel — darunter steht die Beschriftung praktisch auf ihrer
 * Linie, und ein Strich dorthin erklaerte nichts.
 */
const LEADER_THRESHOLD = 1;

/** Id der tragenden Reihe. Sie ist keine Kategorie und steht ueber ihnen. */
const LEAD_ID = "gesamt";

/** "2026-05-26" wird zu "26.05." — ohne Date-Objekt, also ohne Zeitzone. */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}.` : isoDate;
}

function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

interface ChartSeries {
  id: string;
  name: string;
  /** Ein Eintrag je Testtermin; null heisst: an diesem Termin nicht erhoben. */
  values: readonly (number | null)[];
  /** Die tragende Linie. Genau eine Reihe traegt sie. */
  isLead: boolean;
}

/*
 * Die Termine des GESAMTSCORES sind das Rueckgrat der Achse — ein Test ohne
 * Gesamtscore ist keiner. Fehlt eine Kategorie an einem dieser Termine, bleibt
 * ihre Linie dort unterbrochen (line.defined), statt ueber die Luecke hinweg
 * eine Messung zu behaupten, die es nicht gibt.
 */
function toChartSeries(
  score: ScoreSummary,
  categories: readonly CategorySeries[],
  dates: readonly string[],
): readonly ChartSeries[] {
  const valuesAt = (history: readonly { date: string; value: number }[]) =>
    dates.map(
      (date) => history.find((point) => point.date === date)?.value ?? null,
    );

  return [
    {
      id: LEAD_ID,
      name: "Gesamtscore",
      values: valuesAt(score.history),
      isLead: true,
    },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      values: valuesAt(category.history),
      isLead: false,
    })),
  ];
}

interface EndLabel {
  id: string;
  /** Hoehe des letzten Messpunkts, in Prozent der Feldhoehe. */
  dataY: number;
  /** Hoehe der Beschriftung — gleich dataY, solange nichts kollidiert. */
  labelY: number;
}

/**
 * Schiebt Beschriftungen auseinander, die uebereinander laegen. Die
 * REIHENFOLGE bleibt dabei die der Messwerte — keine Beschriftung wandert an
 * einer anderen vorbei, sonst zeigte ihre Fuehrungslinie auf die falsche Linie.
 *
 * Die tragende Reihe steht dabei FEST: sie ist die Aussage der Karte, und ihre
 * Beschriftung soll genau auf der Hoehe ihrer Linie stehen. Ausgewichen wird um
 * sie herum, nach oben und nach unten. Am Feldrand endet das Ausweichen — dort
 * gaebe es nichts mehr zu verschieben; bei fuenf Reihen auf voller Feldhoehe
 * ist der Fall nicht erreichbar.
 */
function toEndLabels(
  points: readonly { id: string; y: number }[],
  anchorId: string,
): readonly EndLabel[] {
  const slots: EndLabel[] = points
    .toSorted((left, right) => left.y - right.y)
    .map((point) => ({ id: point.id, dataY: point.y, labelY: point.y }));

  const anchor = slots.findIndex((slot) => slot.id === anchorId);
  const start = anchor === -1 ? 0 : anchor;

  for (let index = start - 1; index >= 0; index -= 1) {
    const current = slots[index];
    const below = slots[index + 1];
    if (!current || !below) continue;
    current.labelY = Math.max(
      0,
      Math.min(current.labelY, below.labelY - LABEL_MIN_GAP),
    );
  }

  for (let index = start + 1; index < slots.length; index += 1) {
    const current = slots[index];
    const above = slots[index - 1];
    if (!current || !above) continue;
    current.labelY = Math.min(
      100,
      Math.max(current.labelY, above.labelY + LABEL_MIN_GAP),
    );
  }

  return slots;
}

export interface ProgressChartProps {
  /** Der Gesamtverlauf. Seine Termine spannen die Achse auf. */
  score: ScoreSummary;
  categories: readonly CategorySeries[];
  className?: string;
}

/** Leerzustand: eine Entwicklung entsteht erst zwischen zwei Messungen. */
function EmptyProgress({ className }: { className?: string }) {
  return (
    <section
      aria-label="Entwicklung"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Entwicklung
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch kein Verlauf
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Ein Verlauf braucht zwei Tests. Nach deinem nächsten Bluttest steht hier
        die Entwicklung deines Gesamtscores und der vier Kategorien.
      </p>
    </section>
  );
}

export function ProgressChart({
  score,
  categories,
  className,
}: ProgressChartProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  const tooltipId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  /*
   * Das Feld wird GEMESSEN, obwohl alles andere hier in Prozent rechnet. Grund
   * ist die Zeichenbewegung: sie laeuft ueber stroke-dasharray, und ein
   * gestrichelter Strich in einem verzerrten Koordinatensystem wird von
   * non-scaling-stroke nicht mitgerechnet — die Linie erscheint dann in
   * Stuecken. In echten Pixeln gezeichnet, gibt es die Verzerrung nicht: die
   * Bewegung stimmt, die Strichstaerke stimmt ueberall.
   *
   * Das Raster braucht die Messung nicht und steht deshalb schon im ersten
   * Frame; die Linien kommen einen Frame spaeter und zeichnen sich dann.
   */
  const fieldRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setField({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const dates = score.history.map((point) => point.date);

  if (dates.length < 2) {
    return <EmptyProgress className={className} />;
  }

  const series = toChartSeries(score, categories, dates);

  /*
   * Die Termine sind eine ORDINALE Achse: zwischen zwei Tests liegt kein
   * halber Test, und ungleiche Abstaende zwischen den Terminen wuerden hier
   * eine Geschwindigkeit behaupten, die der Score nicht hat.
   */
  const toX = scalePoint<string>().domain(dates).range([0, 100]);
  const positions = dates.map((date) => toX(date) ?? 0);

  /*
   * Gerade Verbindungen, keine Glaettung: eine Spline erfindet zwischen zwei
   * Tests Werte, die niemand gemessen hat, und laeuft dabei ueber den hoechsten
   * Messwert hinaus.
   */
  const toPath = line<number | null>()
    .defined((value) => value !== null)
    .x((_, index) => ((positions[index] ?? 0) / 100) * field.width)
    .y((value) => (toY(value ?? 0) / 100) * field.height);

  const endPoints = series.flatMap((entry) => {
    const lastIndex = entry.values.findLastIndex((value) => value !== null);
    const value = lastIndex === -1 ? null : entry.values[lastIndex];
    return value === null || value === undefined
      ? []
      : [{ id: entry.id, name: entry.name, value, y: toY(value) }];
  });
  const endLabels = toEndLabels(endPoints, LEAD_ID);

  const activeDate = activeIndex === null ? null : dates[activeIndex];

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <h2
        id={titleId}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Entwicklung
      </h2>
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Die kräftige Linie ist der Gesamtscore, die vier leisen sind die
        Kategorien — alle auf derselben Skala. Fahre über einen Testtermin, um
        die Werte dieses Tages zu sehen.
      </p>

      <p className="text-muted-foreground text-2xs mt-6">Score</p>

      <div className="mt-1 flex gap-2">
        <div aria-hidden="true" className="relative h-96 w-8 shrink-0">
          {SCORE_GRID.map((value) => (
            <span
              key={value}
              className="text-faint text-3xs absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${toY(value)}%` }}
            >
              {value}
            </span>
          ))}
        </div>

        <div ref={fieldRef} className="relative h-96 flex-1">
          {/*
           * Raster und Achsen stehen ab dem ersten Frame — sie sind das Feld,
           * nicht der Inhalt. preserveAspectRatio="none" dehnt die Geometrie
           * auf das Feld, non-scaling-stroke haelt jeden Strich dabei ueberall
           * gleich duenn.
           */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            {SCORE_GRID.map((value) => (
              <line
                key={value}
                x1={0}
                x2={100}
                y1={toY(value)}
                y2={toY(value)}
                vectorEffect="non-scaling-stroke"
                className="stroke-map-grid"
              />
            ))}
            {positions.map((x, index) => (
              <line
                key={dates[index]}
                x1={x}
                x2={x}
                y1={0}
                y2={100}
                vectorEffect="non-scaling-stroke"
                className="stroke-map-grid"
              />
            ))}
          </svg>

          {/*
           * Die Linien zeichnen sich von links nach rechts, in der Richtung der
           * Zeit, und einmal. Die tragende Linie laeuft zuerst los, die
           * Kategorien folgen ihr — die Geschichte steht vor ihrem Kontext.
           */}
          {field.width > 0 ? (
            <svg
              aria-hidden="true"
              width={field.width}
              height={field.height}
              className="absolute inset-0"
            >
              {series.map((entry, position) => (
                <motion.path
                  key={entry.id}
                  d={toPath(entry.values) ?? ""}
                  fill="none"
                  strokeWidth={entry.isLead ? 2 : 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    entry.isLead ? "stroke-line-lead" : "stroke-line-muted"
                  }
                  variants={motionPreset.drawPath}
                  custom={position}
                />
              ))}
            </svg>
          ) : null}

          {/*
           * Punkte nur an der tragenden Linie: zwanzig Punkte im Feld waeren
           * ein Muster, vier sind die vier Tests. Die Werte der Kategorien
           * holt das Fadenkreuz.
           */}
          {series
            .filter((entry) => entry.isLead)
            .map((entry) =>
              entry.values.map((value, index) =>
                value === null ? null : (
                  <span
                    key={`${entry.id}-${dates[index]}`}
                    aria-hidden="true"
                    className="bg-line-lead absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${positions[index] ?? 0}%`,
                      top: `${toY(value)}%`,
                    }}
                  />
                ),
              ),
            )}

          {activeIndex !== null && activeDate ? (
            <>
              <span
                aria-hidden="true"
                className="bg-line-crosshair pointer-events-none absolute inset-y-0 w-px"
                style={{ left: `${positions[activeIndex] ?? 0}%` }}
              />
              {series.map((entry) => {
                const value = entry.values[activeIndex];
                return value === null || value === undefined ? null : (
                  <span
                    key={`kreuz-${entry.id}`}
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                      entry.isLead
                        ? "bg-line-lead size-2"
                        : "bg-line-muted size-1.5",
                    )}
                    style={{
                      left: `${positions[activeIndex] ?? 0}%`,
                      top: `${toY(value)}%`,
                    }}
                  />
                );
              })}

              <div
                id={tooltipId}
                role="tooltip"
                className={cn(
                  "border-border bg-popover shadow-card pointer-events-none absolute top-0 z-20 w-max rounded-lg border px-3 py-2",
                  /* Auf der rechten Feldhaelfte klappt die Karte nach links,
                   * sonst stuende sie ueber den Beschriftungen. */
                  (positions[activeIndex] ?? 0) > 50
                    ? "-ml-2 -translate-x-full"
                    : "ml-2",
                )}
                style={{ left: `${positions[activeIndex] ?? 0}%` }}
              >
                <p className="text-popover-foreground text-2xs font-medium tabular-nums">
                  {toLongDate(activeDate)}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {series.map((entry) => {
                    const value = entry.values[activeIndex];
                    return (
                      <li
                        key={`wert-${entry.id}`}
                        className="text-2xs flex justify-between gap-6"
                      >
                        <span
                          className={
                            entry.isLead
                              ? "text-popover-foreground font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {entry.name}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            entry.isLead
                              ? "text-popover-foreground font-medium"
                              : "text-popover-foreground",
                          )}
                        >
                          {value ?? "–"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : null}

          {/*
           * Ein Griff je Testtermin, so breit wie sein Abschnitt: mit der Maus
           * muss niemand eine Linie treffen, mit der Tastatur laeuft man die
           * Termine der Reihe nach ab. Die Beschriftung nennt alle fuenf Werte
           * des Tages — damit steht die Kurve auch vorgelesen vollstaendig da.
           */}
          {dates.map((date, index) => {
            const previous = positions[index - 1];
            const current = positions[index] ?? 0;
            const next = positions[index + 1];
            const start = previous === undefined ? 0 : (previous + current) / 2;
            const end = next === undefined ? 100 : (current + next) / 2;

            return (
              <button
                key={`griff-${date}`}
                type="button"
                aria-describedby={activeIndex === index ? tooltipId : undefined}
                aria-label={`${toLongDate(date)}: ${series
                  .map((entry) => {
                    const value = entry.values[index];
                    return `${entry.name} ${value ?? "nicht erhoben"}`;
                  })
                  .join(", ")}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="focus-visible:outline-ring absolute inset-y-0 rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ left: `${start}%`, width: `${end - start}%` }}
              />
            );
          })}
        </div>

        {/*
         * Die Fuehrungslinien liegen in einer eigenen schmalen Spalte zwischen
         * Feld und Beschriftung: nur dort, wo eine Beschriftung ausweichen
         * musste, laeuft ein Strich schraeg auf sie zu.
         */}
        <div aria-hidden="true" className="relative h-96 w-3 shrink-0">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {endLabels.map((label) =>
              Math.abs(label.labelY - label.dataY) < LEADER_THRESHOLD ? null : (
                <line
                  key={`fuehrung-${label.id}`}
                  x1={0}
                  y1={label.dataY}
                  x2={100}
                  y2={label.labelY}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-line-muted"
                />
              ),
            )}
          </svg>
        </div>

        {/*
         * Die Identitaet der Linien: jede sagt am Ende selbst, wer sie ist.
         * aria-hidden, weil derselbe Text in der Tabelle und in jedem Griff
         * schon vorgelesen wird — hier stuende er ein drittes Mal.
         */}
        <div aria-hidden="true" className="relative h-96 w-52 shrink-0">
          {endLabels.map((label) => {
            const point = endPoints.find((entry) => entry.id === label.id);
            if (!point) return null;
            const isLead = point.id === LEAD_ID;

            return (
              <p
                key={`name-${label.id}`}
                className={cn(
                  "absolute flex w-full -translate-y-1/2 items-baseline justify-between gap-2 text-xs leading-4",
                  isLead
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
                style={{ top: `${label.labelY}%` }}
              >
                <span className="text-2xs">{point.name}</span>
                <span className="shrink-0 tabular-nums">{point.value}</span>
              </p>
            );
          })}
        </div>
      </div>

      <div aria-hidden="true" className="mt-2 flex gap-2">
        <div className="w-8 shrink-0" />
        <div className="relative h-4 flex-1">
          {dates.map((date, index) => (
            <span
              key={`achse-${date}`}
              className={cn(
                "text-faint text-3xs absolute tabular-nums",
                /* Die aeusseren Beschriftungen stehen buendig statt mittig —
                 * zentriert liefen sie in die Nachbarspalten hinein. */
                index === 0
                  ? "left-0"
                  : index === dates.length - 1
                    ? "right-0"
                    : "-translate-x-1/2",
              )}
              style={
                index === 0 || index === dates.length - 1
                  ? undefined
                  : { left: `${positions[index] ?? 0}%` }
              }
            >
              {toShortDate(date)}
            </span>
          ))}
        </div>
        <div className="w-3 shrink-0" />
        <div className="w-52 shrink-0" />
      </div>

      {/*
       * Die Tabelle steht zugeklappt darunter statt unsichtbar im Quelltext:
       * eine sr-only-Tabelle hilft nur Screenreadern, und die Werte will auch
       * lesen, wer sie abschreiben oder nachrechnen will. Aufgeklappt zeigt sie
       * dieselben Zahlen wie die Kurven — keine zweite Quelle.
       */}
      <details className="mt-6">
        <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
          Alle Werte als Tabelle
        </summary>
        <table className="mt-3 w-full text-left">
          <caption className="text-muted-foreground text-2xs sr-only">
            Gesamtscore und Kategorie-Scores je Testtermin, Punkte von{" "}
            {SCORE_MIN} bis {SCORE_MAX}.
          </caption>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="text-muted-foreground text-2xs pb-2 font-medium"
              >
                Reihe
              </th>
              {dates.map((date) => (
                <th
                  key={`kopf-${date}`}
                  scope="col"
                  className="text-muted-foreground text-2xs pb-2 text-right font-medium tabular-nums"
                >
                  {toLongDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((entry) => (
              <tr key={`zeile-${entry.id}`} className="border-border border-b">
                <th
                  scope="row"
                  className={cn(
                    "py-2 text-xs font-medium",
                    entry.isLead ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {entry.name}
                </th>
                {entry.values.map((value, index) => (
                  <td
                    key={`zelle-${entry.id}-${dates[index]}`}
                    className={cn(
                      "py-2 text-right text-xs tabular-nums",
                      entry.isLead
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {value ?? "nicht erhoben"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </motion.section>
  );
}
