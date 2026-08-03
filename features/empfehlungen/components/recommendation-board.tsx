"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PanelExplainer } from "@/components/common/panel-explainer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  EVALUATION_DATE,
  isInNextSubscription,
  PREVIOUS_TEST_MONTH,
  toEvaluationSummary,
  toggleMembership,
  toRecommendationStrength,
  toRecommendedChanges,
  toSubscriptionChange,
  type PendingChanges,
  type RecommendationStrength,
} from "../rules";
import { DroppedRow } from "./dropped-row";
import { EvaluationHeader } from "./evaluation-header";
import { OptionalRow } from "./optional-row";
import { useRailCartTarget } from "./rail-cart-slot";
import { RecommendationRow } from "./recommendation-row";
import { SubscriptionCart } from "./subscription-cart";

/*
 * ============================================================================
 * DIE EMPFEHLUNGEN — links eine AUSWERTUNG, rechts der Warenkorb.
 * ============================================================================
 * ERSTER BLICK   Der Kopf sagt, was der Test ergeben hat. Darunter drei
 *                Abschnitte nach EMPFEHLUNGSSTAERKE, jeder EINE Karte mit
 *                Zeilen und Trennlinien. Am Ende der rechtliche Hinweis.
 *
 * ============================================================================
 * ⚠️ IN DIESER SPALTE STEHT KEIN BETRAG. NIRGENDS.
 * ============================================================================
 * Kein Preis in einer Zeile, keiner im Kopf, keine Summe am Fuss, kein
 * Minusbetrag bei einem Abgang. Die Liste beantwortet "was habe ich, was aendert
 * sich, warum" — Geld beantwortet keine dieser Fragen. Beträge, Bilanz und
 * Bestaetigung stehen im Warenkorb, und der ist die EINE kommerzielle Flaeche
 * dieser Seite.
 *
 * Es hing hier eine Zusammenfassungsleiste am Ende der Liste (alter Preis
 * durchgestrichen, neuer Preis, CTA). Sie ist ausgebaut: sie sagte dasselbe wie
 * der Korb, nur naeher an der Auswertung, und machte damit aus der letzten Zeile
 * der Begruendung den Anfang einer Kasse. Wer sie zurueckholt, holt zwei
 * "Änderungen übernehmen" in einem Dokument zurueck.
 *
 * ⚠️ FOLGE, DIE MAN KENNEN MUSS: unter xl steht der Korb nur in der Schublade
 * der Kontext-Leiste. Solange sie zu ist, gibt es auf dieser Seite keine Summe
 * und keine Bestaetigung — der Weg dorthin ist der Leisten-Knopf in der
 * Kopfzeile. Das ist die Folge der Regel "nur eine kommerzielle Flaeche" und
 * kein Versehen.
 *
 * EINE KARTENEBENE PRO ABSCHNITT. Vorher war jede Zeile eine eigene Flaeche in
 * einer Karte in einer Karte — drei Rahmen um einen Produktnamen. Jetzt traegt
 * der Abschnitt die Karte, und die Zeilen darin sind durch Linien getrennt.
 *
 * ============================================================================
 * DIE UEBERSCHRIFTEN TRAGEN DIE BEGRUENDUNG — und keinen Zaehler.
 * ============================================================================
 * "Basierend auf deinen Blutwerten" sagt, WORAUS ein Abschnitt entsteht — damit
 * braucht keine Zeile darin ein Status-Abzeichen, das dasselbe wiederholt. Die
 * Ziffer, die daneben stand, ist weg: sie zaehlte, was man sieht, und stand in
 * derselben Zeile wie die Aussage.
 *
 * ⚠️ DIE ACHSEN BLEIBEN GETRENNT. Die Abschnitte folgen weiter der
 * Empfehlungsstaerke, nie dem Abo. Ein Abschnitt "weiter nehmen" waere die
 * Verschmelzung, und man merkt den Fehler erst am Erstbesuch: bei leerem Abo
 * saehe die Seite voellig anders aus. Die Probe steht als Test.
 *
 * ============================================================================
 * DIE BEGRUENDUNG KLAPPT IN DER ZEILE AUF.
 * ============================================================================
 * Jede Zeile ist ein `button` mit aria-expanded, und was sie zeigt, steht
 * darunter — keine Navigation, keine erfundene Detailroute. Die ERSTE Zeile ist
 * beim Aufschlagen offen: eine Liste, in der jede Begruendung zugeklappt ist,
 * sieht aus wie eine Liste ohne Begruendung, und genau das war der Anlass.
 *
 * ⚠️ DER OFFENE STAND BLEIBT KOMPONENTENSPEICHER. Welche Praeparate jemand
 * aufklappt, ist eine Angabe zu seiner Gesundheit — sie gehoert nicht in
 * localStorage und nicht in die URL (siehe AGENTS.md). "Persistieren" heisst
 * hier: er ueberlebt jedes Umschalten und Neurendern der Liste, nicht das
 * Neuladen.
 *
 * ============================================================================
 * DIE SCHALTER ERSCHEINEN AUF WUNSCH — "Zeile für Zeile anpassen".
 * ============================================================================
 * Sie standen offen an jeder Zeile und waren fast alle an: acht gleiche Schalter
 * in derselben Stellung tragen keine Information, und in Markenrot waren sie die
 * auffaelligste Flaeche einer Seite, deren Aussage die Messwerte sind.
 *
 * ⚠️ WAS DAS KOSTET: der vorbefuellte Korb bleibt nur sauber, wenn jede
 * vorgeschlagene Zeile leicht zurueckzudrehen ist. In der Leseansicht ist das
 * ein Klick mehr. Ausgeglichen wird es an drei Stellen — der Umschalter steht
 * neben der ersten Ueberschrift und nicht am Fuss, die optionalen Ergaenzungen
 * behalten ihre Schalter (ohne die gaebe es kein Opt-in), und der Korb nennt
 * seinen Vorschlag weiter als Vorschlag. Wer den Umschalter versteckt oder ihn
 * hinter die Liste schiebt, nimmt diesen Ausgleich weg.
 *
 * ============================================================================
 * DER KORB IST BEIM AUFSCHLAGEN SCHON GEFUELLT — mit dem MESSBAREN.
 * ============================================================================
 * Er steht auf dem Vorschlag aus der letzten Auswertung (toRecommendedChanges):
 * was einen Zielmarker hat und empfohlen ist, liegt darin; was nicht mehr
 * empfohlen ist, ist ausgetragen. OPTIONALE ERGAENZUNGEN NICHT — sie sind
 * opt-in, weil "optional" heisst, dass die Auswertung nichts dazu sagen kann.
 *
 * Der Korb steht in einem anderen Teilbaum (die Leiste haengt im (app)-Layout
 * neben dem Panel) und kommt deshalb per Portal dorthin; siehe rail-cart-slot.
 * So bleibt der Zustand gewoehnliche React-Props.
 *
 * ============================================================================
 * DIE FARBREGEL DIESER SEITE — vor jeder Aenderung lesen.
 * ============================================================================
 * KEIN GRUEN, KEIN BERNSTEIN, KEIN ROT ALS URTEIL. Diese drei Toene beantworten
 * im Produkt genau eine Frage: wo steht ein Messwert. Sie gehoeren dem Dashboard
 * und der Analyse. Auf DIESER Seite geht es um zwei andere Fragen — "wie stark
 * ist das empfohlen" und "liegt es im Abo" —, und keine davon ist ein Urteil
 * ueber einen Messwert.
 *
 * ⚠️ AUCH DIE SCHIENE NICHT. BiomarkerBar zeichnet Messwerte und waere die
 * naechstliegende Stelle fuer eine Ampel — sie bleibt grau und arbeitet mit
 * LAGE: Zielbereich als dichteres Grau, Startwert als Strich, heute als Punkt,
 * gefuellt im Ziel und offen davor. Begruendung im Kopf von biomarker-bar.tsx.
 *
 * ⚠️ MARKENROT IST JETZT EINE EINZIGE STELLE: die Bestaetigung im Warenkorb.
 * Dazu kommt die Kuendigungswarnung in den Danger-Token, mit Zeichen UND Wort —
 * ausdruecklich nicht das Markenrot. Alles andere auf dieser Seite ist grau.
 *
 * Was FRUEHER Farbe hatte und sie verloren hat, mit Grund:
 *   - die Flaechentoenung neuer Zeilen. Markenrot in schwacher Deckung, direkt
 *     neben der markenroten Bestaetigung: die groesste Flaeche der Seite war
 *     damit dieselbe Farbe wie ihre wichtigste Handlung.
 *   - die Marke "neu". Sie sagt es mit einem Wort und einem Zeichen.
 *   - die Schalter. Eine Reihe gefuellter markenroter Bahnen sah aus wie acht
 *     Handlungen, obwohl sie einen Zustand zeigten.
 *
 * ============================================================================
 * ⚠️ KEINE WIRKAUSSAGE, NIRGENDS.
 * ============================================================================
 * Kein Text auf dieser Seite sagt, dass ein Praeparat wirkt oder wogegen es
 * hilft — auch die Abschnittstexte nicht, auch nicht in der Verneinung ("kein
 * messbarer Effekt" waere eine). Was hier steht, spricht ueber die DATENLAGE und
 * die HERKUNFT und nie ueber Nutzen. Die Quelle nennen ist erlaubt, ihr THEMA
 * nicht: "aus deinem Fragebogen: Schlaf" waere die Aussage, das Praeparat wirke
 * auf den Schlaf. Es gibt einen Test darauf, aber der kennt nur die Woerter, die
 * uns bisher eingefallen sind.
 */

/* ------------------------------------------------------------------------- */
/* Die Abschnitte                                                             */
/* ------------------------------------------------------------------------- */

interface SectionLook {
  title: string;
  /** Zeile unter der Ueberschrift, wo der Abschnitt eine braucht. */
  lead?: string;
  /** Text der leeren Karte. Nur gebraucht, wo der Abschnitt stehen bleibt. */
  empty: string;
}

/*
 * DIE REIHENFOLGE IST FEST und haengt NICHT am Abo. Der Kernstack steht immer
 * oben, "Fällt weg" immer unten. Damit sieht die Seite beim Erstbesuch genauso
 * aus wie beim zehnten — nur der letzte Abschnitt fehlt, weil man nichts
 * absetzen kann, was nicht laeuft.
 */
const SECTION_ORDER = [
  "empfohlen",
  "optional",
  "nichtMehrEmpfohlen",
] as const satisfies readonly RecommendationStrength[];

const SECTION_LOOK: Readonly<Record<RecommendationStrength, SectionLook>> = {
  empfohlen: {
    title: "Basierend auf deinen Blutwerten",
    empty:
      "Sobald deine Werte einen Ansatzpunkt zeigen, steht das passende Präparat hier.",
  },
  optional: {
    title: "Optionale Ergänzungen",
    /*
     * ⚠️ DER SATZ NENNT DIE HERKUNFT UND KEIN THEMA. "Aus deinen Angaben zu
     * Schlaf" waere die Wirkaussage, die diese Seite nirgends macht.
     */
    lead: "Nicht aus einem Blutwert abgeleitet, sondern aus deinen Angaben im Fragebogen.",
    empty:
      "Hier stehen Präparate, zu denen deine Messung nichts beitragen kann.",
  },
  nichtMehrEmpfohlen: {
    title: "Fällt weg",
    empty: "",
  },
};

/*
 * DIE ERKLAERUNG DER SEITE — hinter dem ⓘ, einmal im Code.
 *
 * Sie ist kuerzer als vorher: die Gliederung erklaeren jetzt die Ueberschriften
 * selbst. Was sie nicht erklaeren, ist der Unterschied zwischen "empfohlen" und
 * "liegt im Abo" — den sieht man den Zeilen nicht an, und er ist der Grund,
 * warum in jedem Abschnitt beides vorkommen kann.
 */
const BOARD_EXPLAINER =
  "Die Abschnitte richten sich danach, woraus eine Empfehlung entsteht. Ob etwas schon in deinem Abo liegt, ist etwas anderes: das steht im Warenkorb und, sobald du „Zeile für Zeile anpassen“ öffnest, in der Stellung der Schalter — deshalb kann in jedem Abschnitt beides vorkommen. Jede Zeile nennt den Messwert, auf den sie sich stützt; wo es keinen gibt, steht dort, woher die Empfehlung sonst kommt. Ein Klick auf eine Zeile öffnet ihre Begründung.";

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
 * ⚠️ ER SAGT NICHT, DASS NAHRUNGSERGAENZUNG HELFEN KANN. Das waere genau die
 * unspezifische Gesundheitsaussage, die diese Seite sonst ueberall vermeidet.
 * In einem HINWEIS waere sie am schlimmsten: er soll Erwartungen daempfen und
 * wuerde eine aufbauen.
 *
 * ⚠️ PLATZHALTER: Der Text ist fachlich nicht freigegeben.
 *
 * ER IST ZUGEKLAPPT, ABER NICHT WEG. Die Kurzform bleibt in einer Zeile
 * sichtbar — ein Pflichthinweis, von dem nur eine Klappe uebrig bleibt, ist
 * keiner. Der Panel-Inhalt bleibt ausserdem fuer die Seitensuche des Browsers
 * findbar (hiddenUntilFound in collapsible.tsx).
 */
const LEGAL_SHORT =
  "Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung.";

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
  const [pending, setPending] = useState<PendingChanges>(() =>
    toRecommendedChanges(supplements),
  );
  const [isConfirming, setIsConfirming] = useState(false);

  /*
   * DER MODUS "ZEILE FUER ZEILE ANPASSEN". Standard ist LESEN: die Schalter des
   * Kernstacks sind aus dem Bild, weil sie fast alle in derselben Stellung
   * stehen und nichts erzaehlen. Die optionalen Ergaenzungen behalten ihre
   * Schalter unabhaengig davon — ohne die gaebe es kein Opt-in.
   */
  const [adjustable, setAdjustable] = useState(false);

  /*
   * WELCHE BEGRUENDUNGEN OFFEN SIND. Die erste Zeile der Liste ist es beim
   * Aufschlagen: eine Liste, in der jede Begruendung zugeklappt ist, sieht aus
   * wie eine ohne. Mehrere duerfen offen stehen — es sind Begruendungen, die man
   * vergleicht, und ein Akkordeon, das die vorige zuklappt, macht das Vergleichen
   * unmoeglich.
   *
   * ⚠️ KOMPONENTENSPEICHER, wie die Vormerkungen. Welche Praeparate jemand
   * aufklappt, ist eine Angabe zu seiner Gesundheit und gehoert nicht in
   * localStorage (siehe AGENTS.md und der Block am Kopf dieser Datei).
   */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const first = supplements.find(
      (prep) => toRecommendationStrength(prep) === "empfohlen",
    );
    return new Set(first === undefined ? [] : [first.id]);
  });

  const toggleOpen = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const change = useMemo(
    () => toSubscriptionChange(supplements, pending),
    [supplements, pending],
  );

  /* Die Zahlen des Kopfes: was der TEST ergeben hat. Sie haengen an den
   * Messwerten und nicht am Korb — ein Schalter aendert keinen Blutwert. */
  const evaluation = useMemo(
    () => toEvaluationSummary(supplements),
    [supplements],
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
   * eine, die nichts tut. Die Vormerkungen werden verworfen.
   *
   * ⚠️ Hier haengt spaeter der Schreibaufruf des Repositories.
   */
  const confirm = () => {
    setPending(new Map());
    setIsConfirming(false);
  };

  const cancels = change.removed.length > 0;

  /*
   * Die Rueckfrage haengt an ihrem ANLASS, statt ihn nur einmal geprueft zu
   * haben: wer den letzten Abgang zurueckholt, waehrend die Frage offen steht,
   * saehe sonst eine Kuendigungswarnung ohne Kuendigung.
   */
  const showConfirm = isConfirming && cancels;
  const requestConfirm = () => (cancels ? setIsConfirming(true) : confirm());

  /*
   * Der Platz in der Kontext-Leiste — oder null, wenn gerade keiner sichtbar
   * ist: unter xl bei geschlossener Schublade, auf dem Server und ueberall, wo
   * diese Tafel ohne die Leiste steht. Genau diese eine Frage entscheidet, WO
   * bestaetigt wird.
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
    <div className={cn("space-y-6", className)}>
      {children}

      <EvaluationHeader
        summary={evaluation}
        testedOn={EVALUATION_DATE}
        comparedTo={PREVIOUS_TEST_MONTH}
      />

      {SECTION_ORDER.map((strength, position) => {
        const preps = sections.get(strength) ?? [];

        /*
         * "Fällt weg" verschwindet, wenn es leer ist — es KANN nur existieren,
         * wenn etwas laeuft, und eine leere Karte mit dieser Ueberschrift waere
         * beim Erstbesuch eine Warnung ohne Anlass. Die anderen beiden bleiben
         * mit Leerzustand stehen: sie sind die Gliederung der Seite, und die
         * haengt nicht am Abo.
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
            open={open}
            onOpenChange={toggleOpen}
            /* Nur der erste Abschnitt traegt das ⓘ und den Umschalter: die
             * Erklaerung gilt der ganzen Seite, und die Schalter, die der Modus
             * einblendet, stehen im Kernstack. */
            explained={position === 0}
            adjust={
              strength === "empfohlen" && preps.length > 0
                ? { on: adjustable, toggle: () => setAdjustable((on) => !on) }
                : null
            }
          />
        );
      })}

      <LegalNote />

      {railCartTarget === null
        ? null
        : createPortal(
            <SubscriptionCart
              supplements={supplements}
              pending={pending}
              {...cartProps}
            />,
            railCartTarget,
          )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Der Hinweis am Fuss                                                        */
/* ------------------------------------------------------------------------- */

/**
 * Text und Begruendung siehe LEGAL_NOTE. GRAU und ohne Zeichen: es ist kein
 * Fehler und keine Warnung, sondern eine Einordnung — die Danger-Token dieser
 * Seite gehoeren der Kuendigung.
 */
function LegalNote() {
  return (
    <Collapsible className="border-border border-t pt-4">
      <CollapsibleTrigger className="group/legal text-muted-foreground flex w-full items-baseline gap-1.5 text-xs">
        <span className="min-w-0 flex-1 text-left">
          <span className="text-foreground font-medium">Hinweis: </span>
          {LEGAL_SHORT}
        </span>
        <span className="text-foreground shrink-0 underline underline-offset-4">
          Mehr
        </span>
        <ChevronDown
          aria-hidden="true"
          className="text-faint size-3.5 shrink-0 self-center transition-transform group-data-[panel-open]/legal:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="text-muted-foreground max-w-measure pt-2 text-xs">
          {LEGAL_NOTE}
        </p>
      </CollapsiblePanel>
    </Collapsible>
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
  open: ReadonlySet<string>;
  onOpenChange: (id: string) => void;
  explained: boolean;
  /** Der Umschalter, wenn dieser Abschnitt ihn traegt. */
  adjust: { on: boolean; toggle: () => void } | null;
}

function Section({
  strength,
  preps,
  index,
  pending,
  onToggle,
  open,
  onOpenChange,
  explained,
  adjust,
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
           * SENTENCE CASE und deshalb NICHT panel-title: das Hilfsmittel setzt
           * Versalien, und auf einer durchgehend gemischt gesetzten Seite waere
           * die Ueberschrift das einzige in Grossbuchstaben. Die Stufe ist
           * dieselbe wie dort (text-sm, semibold) — es fehlt nur das uppercase.
           *
           * ⚠️ OHNE ZAEHLER. Die Ziffer daneben zaehlte, was direkt darunter
           * steht, und teilte sich die Zeile mit der Aussage des Abschnitts.
           */}
          <h2
            id={titleId}
            className="text-foreground text-sm font-semibold tracking-wide"
          >
            {look.title}
          </h2>
          {look.lead ? (
            <p className="text-muted-foreground max-w-measure mt-1 text-xs">
              {look.lead}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/*
           * DER UMSCHALTER STEHT HIER und nicht am Fuss der Liste: er blendet
           * die Schalter DIESER Zeilen ein, und wer eine Zeile aendern will,
           * sucht die Handlung bei den Zeilen. Ein aria-pressed-Knopf und kein
           * Schalter — er schaltet die Ansicht um und nicht ein Abo.
           */}
          {adjust === null ? null : (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={adjust.on}
              onClick={adjust.toggle}
              className="text-muted-foreground text-xs"
            >
              <Settings2 aria-hidden="true" />
              {adjust.on ? "Fertig" : "Zeile für Zeile anpassen"}
            </Button>
          )}
          {explained ? (
            <PanelExplainer
              label="Wie diese Seite gegliedert ist"
              className="-mt-1 -mr-1"
            >
              {BOARD_EXPLAINER}
            </PanelExplainer>
          ) : null}
        </div>
      </div>

      {preps.length === 0 ? (
        <div className="surface-card mt-3 rounded-2xl px-5 py-6">
          <p className="text-muted-foreground max-w-measure text-sm">
            {look.empty}
          </p>
        </div>
      ) : (
        /* EINE Karte fuer den ganzen Abschnitt, Zeilen darin durch Linien
         * getrennt. Sie ist ihr eigener Container: ob eine Zeile ihre Spalten
         * nebeneinander stellt oder bricht, entscheidet IHRE Breite und nicht
         * die des Fensters — die Inhaltsspalte ist zwischen Icon-Leiste und
         * Kontext-Leiste deutlich schmaler als der Schirm. */
        <ul className="surface-card @container mt-3 overflow-hidden rounded-2xl">
          {preps.map((prep, position) => (
            <SectionRow
              key={prep.id}
              strength={strength}
              prep={prep}
              pending={pending}
              onToggle={onToggle}
              adjustable={adjust?.on ?? false}
              open={open.has(prep.id)}
              onOpenChange={onOpenChange}
              index={position}
            />
          ))}
        </ul>
      )}
    </motion.section>
  );
}

/**
 * Jeder Abschnitt hat seine eigene Zeilenfassung, und das ist der Punkt: eine
 * optionale Ergaenzung, die genauso aussieht wie eine Empfehlung aus einem
 * Blutwert, LIEST sich wie eine — mit demselben Anspruch, obwohl ihr die
 * Grundlage fehlt.
 */
function SectionRow({
  strength,
  prep,
  pending,
  onToggle,
  adjustable,
  open,
  onOpenChange,
  index,
}: {
  strength: RecommendationStrength;
  prep: Supplement;
  pending: PendingChanges;
  onToggle: (prep: Supplement) => void;
  adjustable: boolean;
  open: boolean;
  onOpenChange: (id: string) => void;
  index: number;
}) {
  const action = pending.get(prep.id);

  if (strength === "nichtMehrEmpfohlen") {
    return (
      <DroppedRow
        prep={prep}
        pending={action}
        onToggle={onToggle}
        index={index}
      />
    );
  }

  if (strength === "optional") {
    return (
      <OptionalRow
        prep={prep}
        pending={action}
        inNextSubscription={isInNextSubscription(prep, pending)}
        onToggle={onToggle}
        open={open}
        onOpenChange={onOpenChange}
        index={index}
      />
    );
  }

  return (
    <RecommendationRow
      prep={prep}
      pending={action}
      inNextSubscription={isInNextSubscription(prep, pending)}
      onToggle={onToggle}
      adjustable={adjustable}
      open={open}
      onOpenChange={onOpenChange}
      index={index}
    />
  );
}
