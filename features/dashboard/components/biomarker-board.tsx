"use client";

import {
  Dna,
  Droplets,
  Filter,
  Flame,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import type { Biomarker, MarkerGroup, MarkerGroupId } from "@/contracts";
import { cn } from "@/lib/utils";

import {
  BiomarkerPanel,
  type BiomarkerCategory,
  type BiomarkerPanelView,
} from "./biomarker-panel";

/*
 * Alle Biomarker, in Abschnitte nach Anzeige-Gruppe gegliedert, mit EINEM
 * Umschalter im Kopf. Die Ansicht liegt hier und nicht in der einzelnen Kachel:
 * waere jede Kachel fuer sich umklappbar, stuenden in einer Zeile
 * unterschiedlich hohe Kacheln und unter den flachen klaffte eine Luecke. Ein
 * gemeinsamer Umschalter haelt jede Zeile geschlossen — und die Kachel selbst
 * bleibt ein einziges Klickziel fuer die spaetere Detailansicht.
 */

const VIEW_OPTIONS: readonly SegmentedControlOption<BiomarkerPanelView>[] = [
  { value: "value", label: "Werte" },
  { value: "trend", label: "Verläufe" },
];

/*
 * Toenung und Symbol haengen an der GRUPPE, nicht am einzelnen Marker.
 *
 * ENTSCHEIDUNG: zwanzig einzeln gewaehlte Symbole waeren willkuerlich und
 * wuerden eine Bedeutung suggerieren, die es nicht gibt — die Identitaet einer
 * Kachel traegt ihr Name. Beides ist Darstellung und steht deshalb hier, nicht
 * im Contract: die Daten wissen nichts von Icons und nichts von Farbtoenen.
 */
const GROUP_CHIP: Record<MarkerGroupId, BiomarkerCategory> = {
  hormone: "k1",
  herz: "k2",
  stoffwechsel: "k3",
  schilddruese: "k4",
  "leber-niere": "k5",
};

const GROUP_ICON: Record<MarkerGroupId, LucideIcon> = {
  hormone: Dna,
  herz: HeartPulse,
  stoffwechsel: Flame,
  schilddruese: Droplets,
  "leber-niere": Filter,
};

export interface BiomarkerBoardProps {
  /** Reihenfolge der Abschnitte = Reihenfolge dieser Liste. */
  groups: readonly MarkerGroup[];
  /** Alle Marker; die Zuordnung zum Abschnitt macht marker.group. */
  markers: readonly Biomarker[];
  /** Ansicht beim ersten Rendern. */
  defaultView?: BiomarkerPanelView;
  /**
   * Seitenkopf — Titel und Vorspann kommen aus der Route, damit die Ueberschrift
   * dort bleibt, wo sie hingehoert. Der Umschalter stellt sich rechts daneben.
   */
  children?: ReactNode;
  className?: string;
}

export function BiomarkerBoard({
  groups,
  markers,
  defaultView = "value",
  children,
  className,
}: BiomarkerBoardProps) {
  const [view, setView] = useState<BiomarkerPanelView>(defaultView);

  /* Namen zu Ids: die Kachel eines berechneten Index nennt seine Quellen im
   * aria-label, und der Contract kennt dort nur Ids. */
  const namesById = new Map(markers.map((marker) => [marker.id, marker.name]));

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Nur der Text bekommt eine Lesebreite — die Raster darunter nicht. */}
        <div className="max-w-measure">{children}</div>
        <SegmentedControl
          label="Ansicht der Kacheln"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
        />
      </div>

      {groups.map((group) => {
        const groupMarkers = markers.filter(
          (marker) => marker.group === group.id,
        );
        if (groupMarkers.length === 0) return null;

        const Icon = GROUP_ICON[group.id];

        return (
          <section
            key={group.id}
            /* Ein <section> bekommt seinen zugaenglichen Namen nicht aus der
             * Ueberschrift darin — er muss verknuepft werden. */
            aria-labelledby={`gruppe-${group.id}`}
            className="space-y-4"
          >
            {/* Kleine Versalien mit Sperrung: der Abschnitt ordnet, er ruft
             * nicht — die Ueberschrift der Seite bleibt die einzige grosse. */}
            <div className="max-w-measure">
              <h2
                id={`gruppe-${group.id}`}
                className="text-foreground text-sm font-semibold tracking-wide uppercase"
              >
                {group.name}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {group.subtitle}
              </p>
            </div>

            {/* Intrinsisches Raster: die Spaltenzahl folgt dem Platz, nicht umgekehrt. */}
            <div className="panel-grid">
              {groupMarkers.map((marker) => (
                <BiomarkerPanel
                  key={marker.id}
                  marker={marker}
                  icon={<Icon />}
                  category={GROUP_CHIP[group.id]}
                  view={view}
                  derivedFromNames={(marker.derivedFrom ?? []).map(
                    (id) => namesById.get(id) ?? id,
                  )}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
