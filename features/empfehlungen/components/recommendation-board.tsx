"use client";

import { motion } from "motion/react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PanelExplainer } from "@/components/common/panel-explainer";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  isInNextSubscription,
  toggleMembership,
  toRecommendationStrength,
  toRecommendedChanges,
  toSubscriptionChange,
  type PendingChanges,
  type RecommendationStrength,
} from "../rules";
import { useRailCartTarget } from "./rail-cart-slot";
import { RecommendationRow } from "./recommendation-row";
import { SubscriptionBar } from "./subscription-bar";
import { SubscriptionCart } from "./subscription-cart";

/*
 * ============================================================================
 * DIE EMPFEHLUNGEN — eine Spalte, drei Abschnitte, ein Korb.
 * ============================================================================
 * ERSTER BLICK   Drei Abschnitte nach EMPFEHLUNGSSTAERKE, jeder eine Karte mit
 *                Zeilen. Der Warenkorb steht in der Kontext-Leiste — ab xl in
 *                der Spalte daneben, darunter in der Schublade. Solange die
 *                Schublade zu ist, meldet eine Leiste am Fuss die Bilanz.
 *
 * ============================================================================
 * DER KORB IST BEIM AUFSCHLAGEN SCHON GEFUELLT.
 * ============================================================================
 * Er steht auf dem VORSCHLAG aus der letzten Auswertung (toRecommendedChanges):
 * Empfohlenes und Optionales liegt darin, nicht mehr Empfohlenes ist
 * ausgetragen. Die Seite fragt damit "uebernimmst du das?" statt "stell dir
 * eines zusammen" — die zweite Frage ist bei acht Zeilen eine Aufgabe und
 * keine Entscheidung.
 *
 * ⚠️ Bestaetigt ist dadurch NICHTS. Der Vorschlag ist eine Vormerkung wie jede
 * andere, jede Zeile ist mit einem Klick umzuschalten, und der Korb sagt, dass
 * er ein Vorschlag ist. Ohne diese drei waere es ein dunkles Muster; die
 * Begruendung steht ausfuehrlich in rules.ts.
 *
 * ============================================================================
 * DER KORB HAT ZWEI PLAETZE UND NUR EINEN ZUSTAND.
 * ============================================================================
 * Diese Tafel haelt beides — die Vormerkungen und den Stand der Bestaetigung —
 * und reicht es an die Fassung durch, die gerade dran ist. Der Korb in der
 * Leiste steht in einem ANDEREN Teilbaum (die Leiste haengt im (app)-Layout
 * neben dem Panel), er kommt deshalb per Portal aus diesem Baum hierher; siehe
 * rail-cart-slot.tsx. So bleibt der Zustand gewoehnliche React-Props, statt
 * fuer zwei Nachbarn im selben Bild in einen globalen Speicher zu wandern.
 *
 * DIE WEICHE STEHT AN GENAU EINER STELLE: gibt es den Platz in der Leiste,
 * geht der Korb dorthin; gibt es ihn nicht, an den Fuss. Nie beides — zwei
 * Bestaetigen-Schaltflaechen im selben Dokument waeren eine zu viel.
 *
 * ============================================================================
 * DIE FARBREGEL DIESER SEITE — vor jeder Aenderung lesen.
 * ============================================================================
 * KEIN GRUEN, KEIN BERNSTEIN, KEIN ROT ALS URTEIL. Diese drei Toene
 * beantworten im Produkt genau eine Frage: wo steht ein Messwert. Sie gehoeren
 * dem Dashboard und der Analyse. Auf DIESER Seite geht es um zwei andere
 * Fragen — "wie stark ist das empfohlen" und "liegt es im Abo" —, und keine
 * davon ist ein Urteil ueber einen Messwert.
 *
 * Eine eingefaerbte Empfehlungsstaerke waere der schlimmste Fall davon: sie
 * saehe aus wie ein Befund. "Optional" in Bernstein liest sich als Warnung,
 * obwohl es das genaue Gegenteil bedeutet — naemlich, dass wir gar nichts
 * beurteilen koennen.
 *
 * WAS FARBE HAT, sind zwei Stellen, und beide sind Handlungen:
 *   - die Schaltflaeche "Änderungen bestätigen" in Marken-Rot (primaere
 *     Handlung, so vorgesehen in AGENTS.md);
 *   - die Kuendigungswarnung in den Danger-Token, mit Zeichen UND Wort.
 * Alles andere ist grau.
 *
 * ============================================================================
 * ⚠️ KEINE WIRKAUSSAGE, NIRGENDS.
 * ============================================================================
 * Kein Text auf dieser Seite sagt, dass ein Praeparat wirkt oder wogegen es
 * hilft — auch die Abschnittstexte nicht. Was hier steht, spricht ueber die
 * DATENLAGE und die HERKUNFT ("Sobald deine Werte einen Ansatzpunkt zeigen…",
 * "Präparate, zu denen deine Messung nichts beitragen kann", "aus deinem
 * Fragebogen, nicht aus einem Blutwert") und nie ueber Nutzen. Die Quelle
 * nennen ist erlaubt, ihr THEMA nicht: "aus deinem Fragebogen: Schlaf" waere
 * die Aussage, das Praeparat wirke auf den Schlaf. Wer hier einen Satz
 * ergaenzt, prueft ihn gegen diese Zeile — es gibt einen Test darauf, aber der
 * kennt nur die Woerter, die uns bisher eingefallen sind.
 */

/* ------------------------------------------------------------------------- */
/* Die Abschnitte                                                             */
/* ------------------------------------------------------------------------- */

interface SectionLook {
  title: string;
  /** Text der leeren Karte. Nur gebraucht, wo der Abschnitt stehen bleibt. */
  empty: string;
}

/*
 * ENTFERNT: die Zeile unter jeder Abschnittsueberschrift ("Es gibt einen
 * Zielmarker, an dem sich eine Veränderung ablesen lässt.").
 *
 * Sie nannte das Kriterium des Abschnitts. Das steht jetzt an jeder ZEILE, seit
 * die Begruendung eine eigene Spalte hat — dort als der konkrete Messwert
 * ("25-OH-Vitamin-D 17 → 44 ng/ml") statt als Regel im Allgemeinen. Was die
 * Gliederung angeht, erklaert das ⓘ am ersten Abschnitt. Damit sagte die Zeile
 * dreimal nichts, was nicht daneben oder darunter schon stand, und kostete
 * dafuer pro Abschnitt rund 40px vor der ersten Karte.
 *
 * Wer sie zurueckholen will, prueft zuerst, ob die Begruendungsspalte den Fall
 * nicht abdeckt — sonst steht dieselbe Aussage wieder zweimal da.
 */

/*
 * DIE REIHENFOLGE IST FEST und haengt NICHT am Abo. "Empfohlen" steht immer
 * oben, auch wenn nichts davon laeuft; "nicht mehr empfohlen" immer unten.
 * Damit sieht die Seite beim Erstbesuch genauso aus wie beim zehnten — nur der
 * letzte Abschnitt fehlt, weil man nichts absetzen kann, was nicht laeuft.
 */
const SECTION_ORDER = [
  "empfohlen",
  "optional",
  "nichtMehrEmpfohlen",
] as const satisfies readonly RecommendationStrength[];

/*
 * ⚠️ DER ERSTE ABSCHNITT HEISST NACH DEM ERGEBNIS, NICHT NACH DER REGEL.
 *
 * "Empfohlen" benannte das Kriterium, "Dein individueller Nahrungsergänzungs-
 * Stack" benennt, was dabei herauskommt — und genau das ist der Gegenstand der
 * Seite. Die ACHSE ist unveraendert: hier steht weiterhin alles, was
 * toRecommendationStrength auf "empfohlen" setzt, und die Reihenfolge der drei
 * Abschnitte ist dieselbe Rangfolge wie vorher.
 *
 * ⚠️ DER NAME DARF NIE "WAS DU NIMMST" BEDEUTEN. Genau dann waere er die
 * Verschmelzung der zwei Achsen, vor der rules.ts warnt: der Stack ist der
 * VORSCHLAG aus der Auswertung, nicht der Inhalt des laufenden Abos. Was im Abo
 * liegt, sagt weiterhin allein die graue Marke an der Zeile — deshalb steht ein
 * laufendes Praeparat auch unter "Optional", wenn wir es nicht beurteilen
 * koennen. Die Probe bleibt der Erstbesuch mit leerem Abo: der Stack ist dann
 * voll und das Abo leer. Es gibt einen Test darauf.
 */
const SECTION_LOOK: Readonly<Record<RecommendationStrength, SectionLook>> = {
  empfohlen: {
    title: "Dein individueller Nahrungsergänzungs-Stack",
    empty:
      "Sobald deine Werte einen Ansatzpunkt zeigen, steht das passende Präparat hier.",
  },
  optional: {
    title: "Optional",
    empty:
      "Hier stehen Präparate, zu denen deine Messung nichts beitragen kann.",
  },
  nichtMehrEmpfohlen: {
    title: "Nicht mehr empfohlen",
    empty: "",
  },
};

/*
 * DIE ERKLAERUNG DER SEITE — hinter dem ⓘ, einmal im Code.
 *
 * Sie beschreibt die GLIEDERUNG, weil genau die eine Erklaerung braucht: dass
 * die Abschnitte nach Empfehlungsstaerke gehen und die Abo-Marke etwas anderes
 * ist, sieht man den Zeilen nicht an. Was in den Zeilen steht, erklaert sich
 * dagegen selbst und gehoert nicht hinter ein Symbol.
 */
const BOARD_EXPLAINER =
  "Die Abschnitte richten sich danach, wie stark ein Präparat empfohlen wird: oben dein Stack, darunter Präparate, zu denen deine Messung nichts beitragen kann, und zuletzt, was du absetzen kannst. Ob etwas schon in deinem Abo liegt, ist etwas anderes und steht als Marke an der Zeile — deshalb kann in jedem Abschnitt beides vorkommen. Jede Zeile nennt den Messwert, auf den sie sich stützt; wo es keinen gibt, steht dort, woher die Empfehlung sonst kommt.";

/*
 * ============================================================================
 * DER RECHTLICHE HINWEIS — er sagt, was diese Seite NICHT ist.
 * ============================================================================
 * Drei Aussagen, jede aus einem anderen Grund:
 *   1. Der Pflichthinweis der NemV: Nahrungsergaenzung ersetzt keine
 *      ausgewogene Ernaehrung und keine gesunde Lebensweise.
 *   2. Woher die Empfehlungen kommen und dass sie ohne Gewaehr gelten.
 *   3. Wer vorher fragen sollte.
 *
 * ⚠️ ER SAGT NICHT, DASS NAHRUNGSERGAENZUNG HELFEN KANN. Das war die Bitte, und
 * es waere genau die unspezifische Gesundheitsaussage, die diese Seite sonst
 * ueberall vermeidet (Art. 10 Abs. 3 HCVO braucht dafuer eine zugelassene
 * Angabe daneben). In einem HINWEIS waere sie am schlimmsten: er soll
 * Erwartungen daempfen und wuerde eine aufbauen. Der Pflichtsatz sagt dieselbe
 * Sache von der anderen Seite — Ergaenzung bleibt Ergaenzung.
 *
 * ⚠️ PLATZHALTER: Der Text ist fachlich nicht freigegeben. Er steht hier, weil
 * eine Empfehlungsseite ohne Hinweis schlechter ist als eine mit einem
 * vorlaeufigen — anders als /impressum und /datenschutz, die bewusst leer
 * bleiben, weil dort erfundener Rechtstext als der echte gelesen wuerde.
 *
 * ER STEHT AM FUSS und nicht unter der ersten Ueberschrift: dort waere er das
 * Erste, was man auf der Seite liest, und die ersten 90px gehoeren dem Stack.
 * Am Ende der Liste steht er da, wo man ihn sucht — und in Lesereihenfolge vor
 * der Bestaetigung, die als Fussleiste oder in der Leiste daneben liegt.
 */
const LEGAL_NOTE =
  "Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene, abwechslungsreiche Ernährung und eine gesunde Lebensweise. Diese Empfehlungen entstehen aus deinen Messwerten und deinen Angaben im Fragebogen; sie gelten ohne Gewähr und ersetzen keine ärztliche Diagnose oder Behandlung. Wenn du Medikamente einnimmst, schwanger bist oder stillst, sprich vorher mit deiner Ärztin oder deinem Arzt.";

/* ------------------------------------------------------------------------- */
/* Die Tafel                                                                  */
/* ------------------------------------------------------------------------- */

export interface RecommendationBoardProps {
  supplements: readonly Supplement[];
  /** Die unsichtbare Ueberschrift der Route — siehe app/(app)/empfehlungen. */
  children?: ReactNode;
  className?: string;
}

export function RecommendationBoard({
  supplements,
  children,
  className,
}: RecommendationBoardProps) {
  /*
   * ⚠️ ALLES HIER IST KOMPONENTENSPEICHER — und bleibt es.
   *
   * Die vorgemerkten Aenderungen gehen nicht in localStorage, nicht in die URL
   * und in kein Protokoll. Es sind Angaben zu Gesundheit und Einnahme; die
   * Regel steht in AGENTS.md. Ein Neuladen verwirft sie, und das ist richtig
   * so, solange es keine Ablage gibt, die dafuer gedacht ist.
   */
  /*
   * DER KORB STARTET AUF DEM VORSCHLAG, nicht leer — siehe toRecommendedChanges.
   * Die Seite beantwortet damit beim Aufschlagen schon "was waere jetzt richtig"
   * und laesst den Nutzer zustimmen, statt ihn ein Abo aus acht Zeilen selbst
   * zusammensetzen zu lassen.
   *
   * Es bleibt eine VORMERKUNG: bestaetigt ist nichts, und jede Zeile ist mit
   * einem Klick umzuschalten.
   */
  const [pending, setPending] = useState<PendingChanges>(() =>
    toRecommendedChanges(supplements),
  );
  const [isConfirming, setIsConfirming] = useState(false);

  const change = useMemo(
    () => toSubscriptionChange(supplements, pending),
    [supplements, pending],
  );

  const sections = useMemo(() => {
    const byStrength = new Map<RecommendationStrength, Supplement[]>();
    for (const prep of supplements) {
      const strength = toRecommendationStrength(prep);
      const list = byStrength.get(strength);
      if (list) list.push(prep);
      else byStrength.set(strength, [prep]);
    }
    return byStrength;
  }, [supplements]);

  const toggle = (prep: Supplement) =>
    setPending((current) => toggleMembership(prep, current));

  /*
   * BESTAETIGEN IST HEUTE EIN LEERLAUF: es gibt keine Schreibschicht, und eine
   * Bestaetigung, die tut, als haette sie etwas geaendert, waere schlimmer als
   * eine, die nichts tut. Die Vormerkungen werden verworfen — die Liste steht
   * danach wieder auf dem Stand der Daten.
   *
   * ⚠️ Hier haengt spaeter der Schreibaufruf des Repositories. Danach kaeme der
   * neue Stand aus den Daten zurueck, und der Vorschlag waere leer — heute
   * faellt die Seite stattdessen auf den alten Stand zurueck und schlaegt
   * dasselbe noch einmal vor. Das ist im Attrappen-Betrieb sichtbar und mit
   * echter Schreibschicht von selbst weg.
   */
  const confirm = () => {
    setPending(new Map());
    setIsConfirming(false);
  };

  const cancels = change.removed.length > 0;

  /*
   * Die Rueckfrage haengt an ihrem ANLASS, statt ihn nur einmal geprueft zu
   * haben: wer den letzten Abgang zurueckholt, waehrend die Frage offen steht,
   * saehe sonst eine Kuendigungswarnung ohne Kuendigung. Deshalb abgeleitet und
   * nicht im Zustand korrigiert.
   */
  const showConfirm = isConfirming && cancels;
  const requestConfirm = () => (cancels ? setIsConfirming(true) : confirm());

  /*
   * Der Platz in der Kontext-Leiste — oder null, wenn gerade keiner sichtbar
   * ist: unter xl bei geschlossener Schublade, auf dem Server und ueberall, wo
   * diese Tafel ohne die Leiste steht. Genau diese eine Frage entscheidet, wo
   * der Korb erscheint; die Fussleiste ist der Fall "nirgends sonst".
   */
  const railCartTarget = useRailCartTarget();

  const cartProps = {
    change,
    showConfirm,
    onRequestConfirm: requestConfirm,
    onBack: () => setIsConfirming(false),
    onConfirm: confirm,
  };

  return (
    <div className={cn("space-y-8", className)}>
      {children}

      {SECTION_ORDER.map((strength, position) => {
        const preps = sections.get(strength) ?? [];

        /*
         * "Nicht mehr empfohlen" verschwindet, wenn es leer ist — es KANN nur
         * existieren, wenn etwas laeuft, und eine leere Karte mit der
         * Ueberschrift "Nicht mehr empfohlen" waere beim Erstbesuch eine
         * Warnung ohne Anlass. Die anderen beiden bleiben mit Leerzustand
         * stehen: sie sind die Gliederung der Seite, und die haengt nicht am
         * Abo.
         */
        if (preps.length === 0 && strength === "nichtMehrEmpfohlen") {
          return null;
        }

        return (
          <Section
            key={strength}
            strength={strength}
            preps={preps}
            index={position}
            pending={pending}
            onToggle={toggle}
            /* Nur der erste Abschnitt traegt das ⓘ: die Erklaerung gilt der
             * ganzen Seite, und dreimal dasselbe Symbol waere drei Angebote
             * fuer einen Text. */
            explained={position === 0}
          />
        );
      })}

      <LegalNote />

      {railCartTarget === null ? (
        <SubscriptionBar {...cartProps} />
      ) : (
        createPortal(
          <SubscriptionCart
            supplements={supplements}
            pending={pending}
            {...cartProps}
          />,
          railCartTarget,
        )
      )}
    </div>
  );
}

/*
 * ENTFERNT: SubscriptionStanding — die Zeile "Dein Abo: 5 Präparate · 69,10 €
 * im Monat" ueber der Seite.
 *
 * Sie war die Antwort auf "was laeuft gerade", und diese Frage beantwortet
 * jetzt der Korb: mit den Positionen einzeln, mit der Summe und mit dem, was
 * sich daran aendern soll. Eine Kopfzeile, die dieselbe Summe noch einmal
 * nennt, kostete die erste Bildschirmhoehe fuer eine Wiederholung.
 */

/* ------------------------------------------------------------------------- */
/* Der Hinweis am Fuss                                                        */
/* ------------------------------------------------------------------------- */

/**
 * Text und Begruendung siehe LEGAL_NOTE. GRAU und ohne Zeichen: es ist kein
 * Fehler und keine Warnung, sondern eine Einordnung — die Danger-Token dieser
 * Seite gehoeren der Kuendigung im Warenkorb, und ein zweites rotes Feld nebenan
 * machte aus beidem Dekoration.
 */
function LegalNote() {
  return (
    <div className="border-border border-t pt-5">
      <p className="text-muted-foreground max-w-measure text-xs">
        <span className="text-foreground font-medium">Hinweis: </span>
        {LEGAL_NOTE}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Ein Abschnitt                                                              */
/* ------------------------------------------------------------------------- */

interface SectionProps {
  strength: RecommendationStrength;
  preps: readonly Supplement[];
  index: number;
  pending: PendingChanges;
  onToggle: (prep: Supplement) => void;
  explained: boolean;
}

function Section({
  strength,
  preps,
  index,
  pending,
  onToggle,
  explained,
}: SectionProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  const look = SECTION_LOOK[strength];

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/*
           * Dieselbe Ueberschriftenstufe wie die Kacheltitel der anderen
           * Seiten (panel-title). Die Empfehlungsstaerke steht im WORT und in
           * der Reihenfolge — nicht in einer Farbe und nicht in einer Pille.
           */}
          <h2 id={titleId} className="text-foreground panel-title">
            {look.title}
            <span className="text-muted-foreground ml-2 tabular-nums">
              {preps.length}
            </span>
          </h2>
        </div>
        {explained ? (
          <PanelExplainer
            label="Wie diese Seite gegliedert ist"
            className="-mt-1 -mr-1"
          >
            {BOARD_EXPLAINER}
          </PanelExplainer>
        ) : null}
      </div>

      {preps.length === 0 ? (
        <div className="surface-card mt-3 rounded-2xl px-5 py-6">
          <p className="text-muted-foreground max-w-measure text-sm">
            {look.empty}
          </p>
        </div>
      ) : (
        /* Die Liste ist ihr eigener Container: ob eine Zeile ihre vier Spalten
         * nebeneinander stellt oder auf zwei Zeilen bricht, entscheidet IHRE
         * Breite und nicht die des Fensters — die Inhaltsspalte ist zwischen
         * Icon-Leiste und Kontext-Leiste deutlich schmaler als der Schirm. */
        <ul className="surface-card @container mt-3 overflow-hidden rounded-2xl">
          {preps.map((prep, position) => (
            <RecommendationRow
              key={prep.id}
              prep={prep}
              pending={pending.get(prep.id)}
              inNextSubscription={isInNextSubscription(prep, pending)}
              onToggle={onToggle}
              index={position}
            />
          ))}
        </ul>
      )}
    </motion.section>
  );
}
