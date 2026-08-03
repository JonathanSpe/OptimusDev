"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useId, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { toSupplementImage } from "@/lib/supplement-images";
import { cn } from "@/lib/utils";

import {
  toBiomarkerReading,
  toEvidence,
  toInterpretation,
  type PendingAction,
} from "../rules";
import { BiomarkerBarFromReading } from "./biomarker-bar";
import { ReasonLink, ReasonPanel } from "./reason-panel";

/*
 * ============================================================================
 * EINE EMPFEHLUNG DES KERNSTACKS — Praeparat, Messwert, Begruendung.
 * ============================================================================
 * DREI SPALTEN, und dieselben drei hat die optionale Ergaenzung darunter. Was
 * hier nicht mehr steht, ist ein BETRAG: die linke Spalte dieser Seite ist eine
 * Auswertung, und Preise, Bilanz und Bestaetigung stehen im Warenkorb. Eine
 * Zeile mit Preis liest sich als Angebot; eine Zeile mit Messwert als Befund.
 *
 * ⚠️ DIE ZEILE MACHT KEINE WIRKAUSSAGE. Sie sagt nirgends, dass ein Praeparat
 * wirkt oder wogegen es hilft. Ihre Begruendung sind MESSWERTE: die Schiene
 * zeigt die Lage, der Satz darunter sagt sie in Worten, und beide kommen aus
 * derselben Rechnung.
 *
 * ============================================================================
 * DIE GANZE ZEILE KLAPPT AUF — kein Ziel, keine Navigation.
 * ============================================================================
 * Vorher waren Bild und Name eine Schaltflaeche ohne Ziel, mit einem Chevron als
 * Versprechen auf eine Detailansicht, die es nicht gibt. Jetzt ist die ganze
 * Zeile der Ausloeser (`button` mit aria-expanded), und was sie zeigt, ist da:
 * der ganze Satz und die Felder, die die Daten hergeben.
 *
 * DER ANGESCHNITTENE SATZ IST ABSICHT. Er steht unter der Schiene, auf eine
 * Zeile geklemmt, und laeuft in die Ellipse — das ist das Signal, dass hier mehr
 * ist. Bricht er um, ist es weg.
 *
 * ============================================================================
 * KEIN SCHALTER IN DER LESEANSICHT.
 * ============================================================================
 * Sie standen an jeder Zeile und waren fast alle an: acht gleiche Schalter in
 * derselben Stellung tragen keine Information, und in Markenrot waren sie die
 * auffaelligste Flaeche der Seite. Sie erscheinen jetzt im Modus "Zeile für
 * Zeile anpassen" (siehe recommendation-board.tsx) und sind dort neutral
 * eingefaerbt — Markenrot gehoert auf dieser Seite nur noch der Bestaetigung im
 * Warenkorb.
 *
 * ⚠️ WAS DAS KOSTET, und wo es ausgeglichen wird: der vorbefuellte Korb bleibt
 * nur sauber, wenn jede vorgeschlagene Zeile leicht zurueckzudrehen ist (siehe
 * rules.ts). In der Leseansicht ist das ein Klick mehr — deshalb steht der
 * Umschalter direkt neben der Abschnittsueberschrift, sichtbar ohne Scrollen,
 * und der Korb nennt seinen Vorschlag weiter als Vorschlag.
 */

export interface RecommendationRowProps {
  prep: Supplement;
  /** Vorgemerkte Aenderung an dieser Zeile, falls es eine gibt. */
  pending: PendingAction | undefined;
  /**
   * Liegt das Praeparat in der naechsten Fassung des Abos? Kommt fertig aus der
   * Tafel (isInNextSubscription) — die Zeile leitet nichts selbst ab, sonst
   * gaebe es zwei Stellen, die dieselbe Frage beantworten.
   */
  inNextSubscription: boolean;
  onToggle: (prep: Supplement) => void;
  /** Zeigt die Liste gerade ihre Schalter? */
  adjustable: boolean;
  /** Ist die Begruendung dieser Zeile aufgeklappt? */
  open: boolean;
  onOpenChange: (id: string) => void;
  /** Platz in der Auftrittsreihe des Abschnitts. */
  index?: number;
}

export function RecommendationRow({
  prep,
  pending,
  inNextSubscription,
  onToggle,
  adjustable,
  open,
  onOpenChange,
  index = 0,
}: RecommendationRowProps) {
  const motionPreset = useMotionPreset();
  const reading = toBiomarkerReading(prep);
  const evidence = toEvidence(prep);
  const panelId = useId();

  /* Ohne Zielmarker traegt die knappe Erklaerung aus toEvidence — eine leere
   * Schiene zu zeichnen waere eine Grafik ohne Daten. */
  const interpretation = reading === null ? null : toInterpretation(reading);

  return (
    <motion.li
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      /*
       * ⚠️ KEINE FLAECHENTOENUNG MEHR fuer neue Zeilen. Sie war Markenrot in
       * schwacher Deckung, und Markenrot ist auf dieser Seite die Bestaetigung
       * im Warenkorb — eine Flaeche in derselben Farbe zieht mehr
       * Aufmerksamkeit als die Handlung. Die Marke "neu" am Namen sagt dasselbe
       * mit einem Wort.
       */
      className="border-border border-t px-5 py-3 first:border-t-0"
    >
      <div className="flex items-start gap-3">
        {/*
         * DIE GANZE ZEILE IST DER AUSLOESER. Der Schalter steht ausserhalb
         * dieses Knopfes: ein Bedienelement in einem Bedienelement ist weder
         * gueltiges HTML noch bedienbar.
         */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => onOpenChange(prep.id)}
          className="group/row focus-visible:outline-ring min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex flex-col gap-2.5 @2xl:flex-row @2xl:items-start @2xl:gap-4">
            <SupplementName prep={prep} pending={pending} />

            {/*
             * Die Begruendung. Sie nimmt denselben Anteil wie der Name, statt
             * hinter einer festen Spaltenbreite zu warten — vorher nahm der
             * Name allen freien Platz, und zwischen einem kurzen Namen und der
             * Schiene stand eine Leerflaeche ueber die halbe Zeile.
             */}
            <span className="ml-14 block min-w-0 flex-1 @2xl:ml-0">
              {reading === null ? (
                <span className="text-muted-foreground block h-4 truncate text-xs">
                  <span aria-hidden="true">{evidence.text}</span>
                  <span className="sr-only">{evidence.spoken}</span>
                </span>
              ) : (
                <BiomarkerBarFromReading reading={reading} />
              )}

              {/*
               * DER ANSCHNITT IST DAS SIGNAL: eine Zeile, Ellipse, kein
               * Umbruch. truncate statt line-clamp, damit die Hoehe fest
               * bleibt — die Schienen der Liste liegen sonst wieder auf
               * verschiedenen Linien.
               */}
              {interpretation === null || open ? (
                <span className="block h-4" />
              ) : (
                <span className="text-muted-foreground mt-1.5 block h-4 truncate text-xs">
                  {interpretation}
                </span>
              )}
            </span>

            <span className="ml-14 flex items-center @2xl:mt-0.5 @2xl:ml-0">
              <ReasonLink open={open} />
            </span>
          </span>
        </button>

        {adjustable ? (
          <div className="flex shrink-0 items-center pt-0.5">
            <MembershipSwitch
              prep={prep}
              inNextSubscription={inNextSubscription}
              onToggle={onToggle}
            />
          </div>
        ) : null}
      </div>

      {open ? (
        <ReasonPanel prep={prep} interpretation={interpretation} id={panelId} />
      ) : null}
    </motion.li>
  );
}

/*
 * ============================================================================
 * NAME, DOSIS, BILD — und kein Chevron mehr.
 * ============================================================================
 * Der Chevron am Namen versprach eine Navigation, die es nicht gibt. Das
 * Versprechen steht jetzt dort, wo es eingeloest wird: als "Begründung" am Ende
 * derselben Zeile, mit einem Chevron, der sich dreht.
 */
function SupplementName({
  prep,
  pending,
}: {
  prep: Supplement;
  pending: PendingAction | undefined;
}) {
  const image = toSupplementImage(prep.imageKey);

  return (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      {/* Freigestellt und ohne Kachel: nur der eigene Schatten hebt die Kapsel
       * von der Karte ab. Der Rahmen traegt die Breite, nicht das Bild. */}
      <span
        className={cn(
          "w-capsule block shrink-0",
          /* Wird entfernt: das Bild tritt zurueck, der Text bleibt lesbar. */
          pending === "entfernen" && "opacity-40",
        )}
      >
        <Image src={image} alt="" className="capsule-shadow h-auto w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {/* Lange Namen brechen um, statt abzuschneiden. */}
          <span
            className={cn(
              "text-foreground text-sm font-medium underline-offset-4 group-hover/row:underline",
              pending === "entfernen" && "line-through",
            )}
          >
            {prep.name}
          </span>
          <RowMark pending={pending} />
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {prep.dose}
        </span>
      </span>
    </span>
  );
}

/*
 * ============================================================================
 * DIE MARKE AN DER ZEILE — nur noch fuer AENDERUNGEN.
 * ============================================================================
 * "im Abo" ist weg. Sie stand an fast jeder Zeile und war damit die haeufigste
 * Marke der Seite, obwohl sie den Normalfall beschrieb: was hier steht, laeuft
 * meistens schon. Was man SEHEN muss, ist der Unterschied — was dazukommt und
 * was abgeht. Der laufende Stand steht vollstaendig im Warenkorb und, sobald man
 * anpasst, in der Stellung der Schalter.
 *
 * ⚠️ BEIDE SIND GRAU, auch "neu". Sie war in Markenrot getoent, und Markenrot
 * ist auf dieser Seite die Bestaetigung im Korb — eine Marke in derselben Farbe
 * macht aus einer Hinweisfarbe eine Verzierung. Die Aussage traegt das WORT,
 * dazu ein Zeichen; in Graustufen und vorgelesen bleibt sie dieselbe.
 */
function RowMark({ pending }: { pending: PendingAction | undefined }) {
  if (pending === "hinzufuegen") {
    return (
      <Mark>
        <Plus aria-hidden="true" className="size-3 shrink-0" />
        neu
      </Mark>
    );
  }
  if (pending === "entfernen") {
    return (
      <Mark>
        <Minus aria-hidden="true" className="size-3 shrink-0" />
        wird entfernt
      </Mark>
    );
  }
  return null;
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground text-3xs inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium">
      {children}
    </span>
  );
}

/**
 * Der Schalter einer Zeile: liegt das Praeparat in der naechsten Fassung des
 * Abos oder nicht.
 *
 * DER NAME DES PRAEPARATS GEHOERT IN DEN SCHALTERNAMEN. Vorgelesen stuenden
 * sonst fuenf gleichlautende Schalter untereinander, und welche Zeile gemeint
 * ist, muesste man sich merken.
 */
function MembershipSwitch({
  prep,
  inNextSubscription,
  onToggle,
}: {
  prep: Supplement;
  inNextSubscription: boolean;
  onToggle: (prep: Supplement) => void;
}) {
  return (
    <Switch
      checked={inNextSubscription}
      onCheckedChange={() => onToggle(prep)}
      aria-label={`Im Abo: ${prep.name}`}
    />
  );
}
