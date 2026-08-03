"use client";

import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { toSupplementImage } from "@/lib/supplement-images";
import { cn } from "@/lib/utils";

import { toEuro, toEvidence, type PendingAction } from "../rules";

/*
 * ============================================================================
 * EINE EMPFEHLUNG — Bild, Name, Begruendung, Preis, eine Handlung.
 * ============================================================================
 * ⚠️ DIE ZEILE MACHT KEINE WIRKAUSSAGE. Sie sagt nirgends, dass ein Praeparat
 * wirkt oder wogegen es hilft. Ihre Begruendung sind MESSWERTE — "25-OH-
 * Vitamin-D 17 → 44 ng/ml" —, und wo es keine gibt, eine knappe Erklaerung
 * dazu, woher die Empfehlung stammt ("aus deinem Fragebogen, nicht aus einem
 * Blutwert"). Das ist HERKUNFT und kein Nutzen; die ausfuehrliche Erklaerung
 * kommt spaeter im Drilldown, und auch dort nur freigegeben.
 *
 * KEINE STATUSFARBE AUF DIESER SEITE. Gruen, bernstein und rot beantworten in
 * diesem Produkt "wo steht dieser Messwert", und das ist die Frage der Analyse.
 * Hier geht es um Empfehlung und Abo — zwei Dinge, die kein Urteil ueber einen
 * Messwert sind. Rot kommt auf dieser Seite genau einmal vor, an der
 * Schaltflaeche, die die Aenderung bestaetigt.
 *
 * ============================================================================
 * VIER SPALTEN, UND DIE BEGRUENDUNG IST EINE DAVON.
 * ============================================================================
 * Bild und Name · Begruendung · Preis · Handlung.
 *
 * Die Begruendung stand frueher UNTER dem Namen, eingerueckt in derselben
 * Spalte. Damit war die wichtigste Angabe der Zeile — der gemessene Verlauf,
 * auf den sich die Empfehlung stuetzt — eine Fussnote zum Produktnamen, und
 * beim Ueberfliegen der Liste lag sie in jeder Zeile woanders, weil ihr Anfang
 * an der Laenge der Zeile darueber hing. Als eigene Spalte fester Breite
 * (w-evidence-column) beginnen alle Begruendungen auf einer Flucht: man liest
 * die Spalte einmal von oben nach unten statt achtmal quer. Sie ist damit
 * auch das, was den Abschnittstitel einloest — "Empfohlen" sagt, DASS etwas
 * empfohlen ist, diese Spalte sagt, WORAUS.
 *
 * DIE SPALTEN LIEGEN AUFEINANDER. Begruendung, Preis und Handlung stehen in
 * Zellen fester Breite, obwohl ihre Inhalte verschieden lang sind. Ohne das
 * wanderte die Preisspalte von Zeile zu Zeile mit der Wortlaenge des Knopfs
 * daneben — dieselbe Regel wie in der Praeparate-Tabelle der Analyse.
 *
 * ⚠️ DIE SCHWELLE IST @2xl UND NICHT @3xl. Das ist aus der echten Karte
 * gemessen und nicht geschaetzt: in der Inhaltsspalte zwischen Icon-Leiste und
 * Kontext-Leiste ist die Liste bei einem 1440er Schirm rund 45rem breit. Bei
 * @3xl (48rem) stapelte sie dort also — die Spalte, um die es geht, gab es auf
 * dem ueblichen Schirm gar nicht. Die drei festen Zellen sind dafuer so schmal
 * wie ihr Inhalt zulaesst; zusammen mit den Abstaenden bleiben bei 42rem noch
 * gut 12rem fuer den Namen.
 */

/* Zwei Zustaende, die dieselbe Zeile annehmen kann. */
type RowState = "unveraendert" | "kommtDazu" | "wirdEntfernt";

function toRowState(pending: PendingAction | undefined): RowState {
  if (pending === "hinzufuegen") return "kommtDazu";
  if (pending === "entfernen") return "wirdEntfernt";
  return "unveraendert";
}

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
  /** Schaltet genau diese Zeile um: rein ins naechste Abo oder raus. */
  onToggle: (prep: Supplement) => void;
  /** Platz in der Auftrittsreihe des Abschnitts. */
  index?: number;
}

export function RecommendationRow({
  prep,
  pending,
  inNextSubscription,
  onToggle,
  index = 0,
}: RecommendationRowProps) {
  const motionPreset = useMotionPreset();
  const state = toRowState(pending);
  const evidence = toEvidence(prep);
  const image = toSupplementImage(prep.imageKey);

  return (
    <motion.li
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      className="border-border border-t px-5 py-4 first:border-t-0"
    >
      {/*
       * ZWEI ANORDNUNGEN, EINE ZEILE.
       *
       * Breit stehen die vier Spalten nebeneinander, und Begruendung, Preis und
       * Handlung haben FESTE Breiten — nur so liegen sie ueber alle Zeilen
       * aufeinander.
       *
       * Schmal ist genau das der Fehler: unter 42rem bleibt neben den festen
       * Zellen kein lesbarer Rest fuer den Namen, und
       * "25-OH-Vitamin-D 17 → 44 ng/ml" braeche Wort fuer Wort in eine
       * Kolonne. Begruendung, Preis und Handlung ruecken deshalb unter den
       * Namen, eingerueckt auf die Namensflucht.
       */}
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-4">
        <SupplementButton prep={prep} image={image} state={state} />

        <div className="ml-15 flex flex-col gap-3 @2xl:ml-0 @2xl:shrink-0 @2xl:flex-row @2xl:items-center @2xl:gap-4">
          {/*
           * Die Begruendung: ein Messwert, wo es einen gibt, sonst eine knappe
           * Erklaerung in ganzen Worten (siehe toEvidence). Ziffernschrift nur
           * im ersten Fall — "aus deinem Fragebogen, nicht aus einem Blutwert"
           * in tabular-nums waere eine Kolonne ohne Kolonne.
           */}
          <p
            className={cn(
              "text-foreground @2xl:w-evidence-column text-xs @2xl:shrink-0",
              evidence.measured && "tabular-nums",
            )}
          >
            <span aria-hidden="true">{evidence.text}</span>
            <span className="sr-only">{evidence.spoken}</span>
          </p>

          {/* Breit: zwei feste Spalten am rechten Rand. Schmal: Preis links
           * und Handlung rechts in einer gemeinsamen Zeile. */}
          <div className="flex items-center justify-between gap-4 @2xl:justify-end">
            <p className="text-foreground text-sm tabular-nums @2xl:w-20 @2xl:text-right">
              {toEuro(prep.pricePerMonthCents)}{" "}
              <span className="text-muted-foreground text-2xs @2xl:block">
                im Monat
              </span>
            </p>

            <div className="flex justify-end @2xl:w-28">
              <RowAction
                prep={prep}
                inNextSubscription={inNextSubscription}
                onToggle={onToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/*
 * ============================================================================
 * DAS PRAEPARAT IST DIE SCHALTFLAECHE — und sie fuehrt noch nirgendwo hin.
 * ============================================================================
 * Bild und Name zusammen sind der Zugang zur Detailansicht: dort kommen die
 * Erklaerungen hin, die in der Zeile bewusst fehlen (und auch dort nur
 * freigegebene, siehe der Kopf dieser Datei). Der Winkel rechts am Namen sagt,
 * dass es weitergeht.
 *
 * ⚠️ ENTSCHEIDUNG: SIE HAT HEUTE KEIN ZIEL. Die Detailroute existiert nicht,
 * und eine erfundene waere ein Link ins Leere. Als Schaltflaeche statt als Link
 * ist sichtbar, dass hier noch nicht navigiert wird — dieselbe Loesung wie bei
 * "Alle Fragen" und "Termin verschieben" auf der Kontext-Leiste. Wer die Route
 * baut, haengt sie hier an und macht aus dem button ein Link.
 *
 * NICHT DIE GANZE ZEILE ist die Schaltflaeche: in der Zeile sitzen schon
 * "Hinzufügen" und "Entfernen", und eine Schaltflaeche in einer Schaltflaeche
 * ist weder gueltiges HTML noch bedienbar. Der Zugang ist deshalb das
 * Praeparat selbst, nicht die Flaeche um es herum.
 */
function SupplementButton({
  prep,
  image,
  state,
}: {
  prep: Supplement;
  image: ReturnType<typeof toSupplementImage>;
  state: RowState;
}) {
  return (
    /*
     * KEIN aria-label: der zugaengliche Name entsteht aus dem Inhalt, wie bei
     * der aufklappbaren Zeile der Analyse. Ein aria-label wuerde alles darin
     * ueberschreiben — Dosis und Abo-Marke waeren dann fuer Screenreader nicht
     * mehr Teil dessen, was der Knopf heisst. Was das Label nicht hergibt,
     * naemlich WOHIN es geht, steht als sr-only direkt hinter dem Namen.
     */
    <button
      type="button"
      /*
       * Breit nimmt die Namensspalte, was die drei festen Spalten uebrig
       * lassen. Sie hat KEINE eigene Breite und braucht auch keine: alle Zeilen
       * sind gleich breit, also fallen alle flex-1-Spalten gleich aus — die
       * Begruendungen beginnen weiter auf einer Flucht. Eine feste Breite
       * daraus zu machen hiesse, den ganzen Rest der Zeile an einen Wert zu
       * binden, den kein Inhalt vorgibt.
       */
      className="group/prep focus-visible:outline-ring flex min-w-0 items-center gap-4 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 @2xl:flex-1"
    >
      {/*
       * Freigestellt und ohne Kachel, wie in der Analyse: nur der eigene
       * Schatten hebt die Kapsel von der Karte ab. Der Rahmen traegt die
       * Breite und nicht das Bild — sonst rechnet max-width:100% gegen die
       * Spalte, die sich erst aus dem Bild ergeben soll.
       */}
      <span
        className={cn(
          "w-capsule block shrink-0",
          /* Wird entfernt: das Bild tritt zurueck, der Text bleibt lesbar. */
          state === "wirdEntfernt" && "opacity-40",
        )}
      >
        <Image src={image} alt="" className="capsule-shadow h-auto w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span
            className={cn(
              "text-foreground text-sm font-medium underline-offset-4 group-hover/prep:underline",
              state === "wirdEntfernt" && "line-through",
            )}
          >
            {prep.name}
          </span>
          <span className="sr-only">Details anzeigen</span>
          <ChevronRight
            aria-hidden="true"
            className="text-faint size-3.5 shrink-0 transition-transform group-hover/prep:translate-x-0.5 motion-reduce:transition-none"
          />
          <RowMark state={state} inSubscription={prep.inSubscription} />
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {prep.dose}
        </span>
      </span>
    </button>
  );
}

/*
 * DIE ABO-MARKE — grau, und aus gutem Grund.
 *
 * Sie sagt, ob das Praeparat gerade laeuft. Das ist eine Tatsache ueber den
 * Vertrag und kein Urteil ueber einen Messwert, also traegt sie keine
 * Statusfarbe. Und sie steht in der ZEILE, nicht im Abschnitt: die Gliederung
 * der Seite folgt der Empfehlungsstaerke, und dieselbe Marke kann in jedem der
 * drei Abschnitte vorkommen.
 */
function RowMark({
  state,
  inSubscription,
}: {
  state: RowState;
  inSubscription: boolean;
}) {
  if (state === "kommtDazu") {
    return <Mark icon={Plus}>kommt dazu</Mark>;
  }
  if (state === "wirdEntfernt") {
    return <Mark icon={Minus}>wird entfernt</Mark>;
  }
  if (inSubscription) {
    return <Mark icon={Check}>im Abo</Mark>;
  }
  return null;
}

function Mark({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <span className="bg-muted text-muted-foreground text-3xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tracking-wide uppercase">
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {children}
    </span>
  );
}

/*
 * ============================================================================
 * EINE HANDLUNG, ZWEI RICHTUNGEN — und keine dritte.
 * ============================================================================
 * Die Zeile beantwortet genau eine Frage: liegt das Praeparat im naechsten Abo
 * oder nicht. Also gibt es auch nur einen Knopf, der die Antwort umdreht.
 *
 * ENTSCHEIDUNG (kehrt eine fruehere um): Es gab hier drei Aufschriften —
 * "Hinzufügen", "Entfernen" und "Rückgängig", je nachdem, ob an der Zeile schon
 * eine Vormerkung hing. Seit der Korb auf dem Vorschlag steht, waere
 * "Rückgängig" die haeufigste Aufschrift der ganzen Seite, und zwar BEVOR der
 * Nutzer irgendetwas getan hat. Man kann aber nichts rueckgaengig machen, was
 * man nicht selbst getan hat. Der Unterschied zum laufenden Stand steht
 * weiterhin da, nur als MARKE neben dem Namen und nicht als Aufschrift auf dem
 * Knopf: "kommt dazu" beschreibt den Stand, "Rückgängig" behauptete eine
 * Vorgeschichte.
 *
 * Ein Abgang wird hier NICHT bestaetigt — er wird vorgemerkt und bleibt
 * umschaltbar, bis der Warenkorb die ganze Aenderung bestaetigt. Eine
 * Rueckfrage an jeder einzelnen Zeile waere ein Dialog fuer etwas, das einen
 * Klick weit umzudrehen ist; die Kuendigung selbst wird einmal bestaetigt,
 * dort wo sie wirksam wird.
 */
function RowAction({
  prep,
  inNextSubscription,
  onToggle,
}: {
  prep: Supplement;
  inNextSubscription: boolean;
  onToggle: (prep: Supplement) => void;
}) {
  /*
   * DER NAME DES PRAEPARATS GEHOERT IN DEN KNOPFNAMEN. Vorgelesen steht sonst
   * fuenfmal "Entfernen" untereinander, und welche Zeile gemeint ist, muss man
   * sich merken. Als aria-label und nicht als sr-only-Span: der Span haengt
   * sich an den sichtbaren Text an, und wo dieselbe Zeile den Namen schon
   * traegt, stuende er dann zweimal in derselben Zeile.
   *
   * Das sichtbare Wort bleibt der Anfang des Namens (WCAG 2.5.3, "Label in
   * Name") — wer per Sprache "Entfernen" sagt, trifft den Knopf.
   */
  if (inNextSubscription) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Entfernen: ${prep.name}`}
        onClick={() => onToggle(prep)}
      >
        <Minus aria-hidden="true" />
        Entfernen
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Hinzufügen: ${prep.name}`}
      onClick={() => onToggle(prep)}
    >
      <Plus aria-hidden="true" />
      Hinzufügen
    </Button>
  );
}
