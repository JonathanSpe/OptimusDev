"use client";

import {
  CalendarClock,
  Check,
  CircleHelp,
  Link2,
  NotebookPen,
  Plug,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ProfileAvatar } from "@/components/common/profile-avatar";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  sampleConnectedApps,
  sampleNextTest,
  sampleOpenQuestions,
  sampleProfile,
  sampleUserContext,
  type ConnectedApp,
  type NextTest,
  type OpenQuestions,
  type ProfileSummary,
  type UserContext,
} from "@/features/context";
import { cn } from "@/lib/utils";

/*
 * KRITISCHE REGEL — nicht aufweichen:
 * Diese Kacheln koennen auf JEDER Seite des eingeloggten Bereichs stehen, also
 * auch auf dem Dashboard. Das Dashboard bleibt frei von Interpretation. Deshalb
 * enthaelt KEINE Kachel dieser Datei einen Score, eine Konfidenz-Anzeige, eine
 * Ampel oder einen Befund. Offene Fragen sind neutral formuliert ("Beantworten
 * verbessert deine Auswertung") und nennen weder eine Kategorie noch einen
 * Wert. Bewertet wird ausschliesslich in der Analyse.
 *
 * DIE ZUSAMMENSTELLUNG IST SEIT NEUEM ROUTENSACHE, die Regel oben nicht.
 * ContextRail unten ist die Normalbesetzung und steht ueber den Catch-all des
 * @rail-Slots auf jeder Seite ausser einer; /empfehlungen stellt sich aus
 * denselben Kacheln eine eigene Leiste zusammen (app/(app)/@rail/empfehlungen).
 * Deshalb sind RailTile, ProfileTile und OpenQuestionsTile exportiert — wer
 * eine weitere Seite eigens bestueckt, nimmt DIESE Kacheln und baut keine
 * zweiten. Was dort dazukommt, faellt trotzdem unter die Regel oben: die
 * Leiste urteilt nirgends.
 *
 * Der Punkt bei "Verknuepfte Apps" beschreibt die technische Verbindung einer
 * Datenquelle — er ist keine Aussage ueber die Gesundheit und wird immer von
 * einem Text begleitet.
 *
 * FLAECHE: Die Leiste hat AB xl KEINE eigene Flaeche — ihre deckenden Kacheln
 * (rail-card) liegen einzeln auf dem Mesh-Hintergrund, weil zwei helle
 * Glasflaechen nebeneinander sich als eine geteilte lasen statt als zwei
 * Spalten; die Begruendung steht am Kopf von app/(app)/layout.tsx. Unter xl
 * faehrt die Leiste als Schublade ueber den Inhalt und bekommt dort weiterhin
 * eine Flaeche (rail-panel in components/ui/sheet.tsx).
 *
 * Fuer die Komponenten hier aendert das NICHTS, und das ist der Sinn der
 * on-rail-Rollen: Text auf der Leiste nutzt ausschliesslich sie — sie decken
 * sich derzeit mit den Text-Rollen der Inhaltsflaeche, bleiben aber eigene
 * Rollen, damit die Leiste ihre Flaeche wechseln kann, ohne dass hier etwas
 * angefasst werden muss. Genau dieser Wechsel ist gerade eingetreten und hat
 * keine einzige Zeile in dieser Datei gekostet. Die Kontraste dieser Rollen
 * prueft npm run tokens gegen BEIDE Stufen.
 *
 * SCHRIFTGRADE — VIER STUFEN, MEHR NICHT:
 *   16px halbfett   Panelname ("Kontext") und der Profilname.
 *   14px panel-title Jede Kachelueberschrift. Dieselbe Kette wie in der
 *                   Inhaltsspalte; siehe die Begruendung an RailTile.
 *   12px            Fliesstext: Fragen, Saetze, App-Namen, Angaben.
 *   11px            Beiwerk: Etiketten, Datumskuerzel, Zeitstempel, Chips.
 * Dazu EIN Wert ausserhalb der Stufen: das Testdatum in 18px. Es ist die
 * groesste Zahl der Leiste und soll das auch sein.
 *
 * Die Leiste hatte vorher sieben Grade, darunter 12,8px aus der Standardgroesse
 * "sm" der Schaltflaechen — zwischen 12px und 14px, also ein Grad, den man
 * nicht als Stufe liest, sondern als Unsauberkeit. Die Schaltflaechen auf der
 * Leiste tragen deshalb text-xs. Und 11px hatte zwei Aufgaben gleichzeitig
 * (Ueberschrift UND Beiwerk); seit die Ueberschriften auf 14px stehen, bedeutet
 * dieser Grad genau eine Sache.
 *
 * ROT: siehe den Block in NextTestTile. Es gibt genau eine akzentuierte Kachel.
 */

export interface RailTileProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Die Kachel der Leiste: Ueberschrift plus Inhalt. Grundlage aller unten. */
export function RailTile({ title, icon, children, className }: RailTileProps) {
  return (
    <section className={cn("rail-card rounded-2xl p-4", className)}>
      {/*
       * ENTSCHEIDUNG (kehrt eine fruehere um): DIE KACHELUEBERSCHRIFT IST
       * panel-title, dieselbe Kette wie auf jeder Kachel der Inhaltsspalte.
       *
       * Hier stand, die Ueberschrift bleibe bewusst klein — "die Grosschreibung
       * traegt die Auszeichnung, nicht der Schriftgrad". Die Inhaltsspalte hat
       * genau dieses Argument schon verworfen; im Kopf von panel-title in
       * globals.css steht, warum: als 11px-Versalie war der Titel kleiner als
       * jede Zahl unter ihm und wurde beim Ueberfliegen uebersehen. Auf dieser
       * Leiste galt das doppelt — vier Kacheln uebereinander, deren
       * Ueberschriften leiser waren als ihr eigener Inhalt.
       *
       * Die Leiste hatte die Aenderung damals nur nicht mitbekommen. Jetzt
       * traegt sie dieselbe Kette, und der Schriftgrad hat auf beiden Flaechen
       * dieselbe Bedeutung.
       */}
      <h2 className="text-on-rail panel-title flex items-center gap-2">
        {icon ? (
          <span
            aria-hidden="true"
            className="text-on-rail-muted [&_svg]:size-4"
          >
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Zurueckhaltender Textlink am Fuss einer Kachel. */
function TileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-on-rail-brand focus-visible:outline-ring-on-rail mt-3 inline-block rounded-sm text-xs font-medium underline underline-offset-4 transition-colors hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
    >
      {children}
    </Link>
  );
}

export interface ProfileTileProps {
  profile: ProfileSummary;
}

export function ProfileTile({ profile }: ProfileTileProps) {
  const stats = [
    { label: "Alter", value: `${profile.age} Jahre` },
    { label: "Geschlecht", value: profile.sex },
    { label: "Sportart", value: profile.sport },
  ];

  /*
   * DIESE KACHEL BAUT JETZT AUF RailTile WIE DIE ANDEREN VIER. Vorher war sie
   * ein Sonderfall, und man sah es: "DEIN PROFIL" stand als Versal-Label UNTER
   * dem Namen. Damit war es die einzige Kachel, deren Ueberschrift nicht oben
   * stand — und der Name darueber war groesser als jede echte Ueberschrift der
   * Leiste. Eine umgedrehte Rangfolge, die den ganzen Stapel schief aussehen
   * liess.
   *
   * Jetzt gilt ueberall dasselbe: die Ueberschrift benennt die Kachel, was
   * darunter steht, ist ihr Inhalt. Dass der Name GROESSER ist als seine
   * Ueberschrift, ist dabei kein Widerspruch, sondern die Regel dieser Leiste —
   * Werte stehen ueber ihren Etiketten (siehe auch das Datum in NextTestTile).
   */
  return (
    <RailTile title="Dein Profil" icon={<UserRound />}>
      <div className="mt-3 flex items-center gap-3">
        <ProfileAvatar
          initials={profile.initials}
          imageSrc={profile.imageSrc}
          size="md"
          tone="onRail"
        />
        <p className="text-on-rail min-w-0 truncate text-base font-semibold">
          {profile.name}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-on-rail-muted text-2xs">{stat.label}</dt>
            <dd className="text-on-rail truncate text-xs font-medium tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </RailTile>
  );
}

function NextTestTile({ test }: { test: NextTest }) {
  return (
    <RailTile title="Nächster Test" icon={<CalendarClock />}>
      {/*
       * DER EINE AKZENT DIESER LEISTE, und er sitzt in dieser Kachel.
       *
       * Die Leiste war bis eben vollstaendig grau bis auf zwei Textlinks. Rot
       * steht in diesem Produkt fuer Akzente — betonte Werte und aktive
       * Zustaende (AGENTS.md) — und der naechste Test ist das EINZIGE in der
       * Leiste, das beides ist: der Countdown ist der einzige Wert hier, der
       * sich jeden Tag aendert, und der geplante Punkt ist der einzige aktive
       * Zustand in einer Reihe erledigter.
       *
       * ⚠️ BEIDE ROTS MEINEN DASSELBE und stehen deshalb in derselben Kachel:
       * der Punkt sagt WELCHER Termin, die Zahl sagt WANN. Verteilt auf zwei
       * Kacheln waeren es zwei Akzente; hier ist es einer, zweimal gezeigt.
       *
       * Was hier ausdruecklich NICHT rot wird: die offenen Fragen. Rot an einer
       * unbeantworteten Frage waere eine Wertung, und die kritische Regel im
       * Kopf dieser Datei verbietet der Leiste jedes Urteil.
       *
       * Das DATUM bleibt ebenfalls neutral. Es ist die groesste Zahl der
       * Leiste; rot waere es kein Akzent mehr, sondern eine Warnung.
       */}
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-on-rail text-lg font-semibold tabular-nums">
          {test.date}
        </span>
        <span className="text-on-rail-brand text-xs font-semibold tabular-nums">
          in {test.daysUntil} Tagen
        </span>
      </p>

      {/* Schlanke Zeitleiste: erledigte Tests als Punkt, der geplante in der
       * Marke. Der Ton steht nie allein — der Punkt ist groesser, traegt einen
       * Ring, und daneben liest der Screenreader "geplant". */}
      <ol className="relative mt-4 flex items-start justify-between">
        <span
          aria-hidden="true"
          className="bg-on-rail/20 absolute inset-x-1 top-1 h-px"
        />
        {test.timeline.map((entry) => (
          <li
            key={entry.date}
            className="relative flex flex-col items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                /* Beide Punkte bleiben size-2, damit ihre Mitten auf der Linie
                 * bei top-1 liegen. Das Gewicht kommt aus dem Ring, der nach
                 * aussen zeichnet und die Mitte nicht verschiebt. */
                "size-2 rounded-full",
                entry.state === "erledigt"
                  ? "bg-on-rail/50"
                  : "bg-on-rail-brand ring-on-rail-brand/25 ring-3",
              )}
            />
            <span
              className={cn(
                "text-2xs tabular-nums",
                entry.state === "erledigt"
                  ? "text-on-rail-muted"
                  : "text-on-rail font-semibold",
              )}
            >
              {entry.label}
            </span>
            <span className="sr-only">
              {entry.date} {entry.state}
            </span>
          </li>
        ))}
      </ol>

      {/* Ohne Funktion: die Terminverwaltung kommt in einer spaeteren Stufe. */}
      <Button variant="railGhost" size="sm" className="mt-4 w-full text-xs">
        Termin verschieben
      </Button>
    </RailTile>
  );
}

function QuestionRow({
  text,
  answer,
  onAnswer,
}: {
  text: string;
  answer: "ja" | "nein" | null;
  onAnswer: (answer: "ja" | "nein") => void;
}) {
  return (
    <li className="border-rail-line border-t pt-3 first:border-t-0 first:pt-0">
      <p className="text-on-rail text-xs">{text}</p>
      {answer ? (
        <p className="text-on-rail-muted text-2xs mt-2 flex items-center gap-1.5">
          <Check aria-hidden="true" className="text-success-on-rail size-3.5" />
          Antwort gespeichert: {answer === "ja" ? "Ja" : "Nein"}
        </p>
      ) : (
        <div className="mt-2 flex gap-2">
          {(["ja", "nein"] as const).map((option) => (
            <Button
              key={option}
              variant="railOutline"
              size="xs"
              className="rounded-full px-3"
              onClick={() => onAnswer(option)}
            >
              {option === "ja" ? "Ja" : "Nein"}
              <span className="sr-only"> — {text}</span>
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}

export interface OpenQuestionsTileProps {
  questions: OpenQuestions;
}

export function OpenQuestionsTile({ questions }: OpenQuestionsTileProps) {
  /*
   * Antworten liegen nur im Speicher der Komponente. Sie landen bewusst NICHT
   * in localStorage oder in der URL — es sind Gesundheitsangaben. Die
   * Speicherung uebernimmt spaeter das Repository.
   */
  const [answers, setAnswers] = useState<Record<string, "ja" | "nein">>({});
  const answered = questions.answered + Object.keys(answers).length;
  const open = Math.max(0, questions.total - answered);

  return (
    <RailTile title="Offene Fragen" icon={<CircleHelp />}>
      <p className="text-on-rail-muted mt-3 text-xs">
        {open === 0
          ? "Alle Fragen beantwortet — danke."
          : `${open} offen. Beantworten verbessert deine Auswertung.`}
      </p>

      <ul className="mt-3 flex flex-col gap-3">
        {questions.urgent.map((question) => (
          <QuestionRow
            key={question.id}
            text={question.text}
            answer={answers[question.id] ?? null}
            onAnswer={(answer) =>
              setAnswers((current) => ({ ...current, [question.id]: answer }))
            }
          />
        ))}
      </ul>

      <Progress
        value={(answered / questions.total) * 100}
        tone="rail"
        className="mt-4 gap-1.5"
      >
        <ProgressLabel className="text-on-rail-muted text-2xs font-normal tabular-nums">
          {answered} von {questions.total} beantwortet
        </ProgressLabel>
      </Progress>

      {/*
       * ENTSCHEIDUNG: "Alle Fragen" bleibt vorerst ohne Ziel — die Route dafuer
       * existiert noch nicht. Als Schaltflaeche statt Link ist klar, dass hier
       * noch keine Navigation passiert.
       */}
      <Button variant="railLink" className="mt-3 h-auto p-0 text-xs">
        Alle Fragen
      </Button>
    </RailTile>
  );
}

function ConnectedAppsTile({ apps }: { apps: readonly ConnectedApp[] }) {
  return (
    <RailTile title="Verknüpfte Apps" icon={<Link2 />}>
      <ul className="mt-3 flex flex-col gap-2.5">
        {apps.map((app) => (
          <li key={app.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                app.state === "aktiv"
                  ? "bg-success-on-rail"
                  : "bg-warning-on-rail",
              )}
            />
            <span className="text-on-rail min-w-0 truncate text-xs font-medium">
              {app.name}
            </span>
            {/* Der Punkt allein traegt nichts — der Zustand steht als Text daneben. */}
            <span className="text-on-rail-muted text-2xs ml-auto shrink-0">
              {app.lastSync}
            </span>
            <span className="sr-only">
              {app.state === "aktiv"
                ? "Verbindung aktiv"
                : "Synchronisierung ausstehend"}
            </span>
          </li>
        ))}
      </ul>

      {/* Ohne Funktion: das Verbinden von Quellen kommt spaeter. */}
      <Button variant="railGhost" size="sm" className="mt-4 w-full text-xs">
        <Plug aria-hidden="true" />
        Quelle verbinden
      </Button>
    </RailTile>
  );
}

function ContextChips({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="bg-on-rail/10 text-on-rail text-2xs rounded-full px-2 py-0.5"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function UserContextTile({ context }: { context: UserContext }) {
  return (
    /* Das Symbol fehlte hier als einziger Kachel — vier Ueberschriften mit
     * Zeichen und eine ohne lasen sich wie ein Versehen. */
    <RailTile title="Dein Kontext" icon={<NotebookPen />}>
      <div className="mt-3">
        <p className="text-on-rail-muted text-2xs">Ernährung & Training</p>
        <ContextChips items={[context.diet, context.trainingPhase]} />
      </div>
      <div className="mt-3">
        <p className="text-on-rail-muted text-2xs">Supplements</p>
        <ContextChips items={context.supplements} />
      </div>
      <TileLink href="/einstellungen">Angaben bearbeiten</TileLink>
    </RailTile>
  );
}

export interface ContextRailProps {
  className?: string;
}

/**
 * Die NORMALBESETZUNG der Kontext-Leiste — sie zeigt Rahmenbedingungen, nie
 * Ergebnisse. Sie steht ueber den Catch-all des @rail-Slots auf jeder Seite des
 * eingeloggten Bereichs, ausser wo eine Seite sich eigens bestueckt.
 */
export function ContextRail({ className }: ContextRailProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ProfileTile profile={sampleProfile} />
      <NextTestTile test={sampleNextTest} />
      <OpenQuestionsTile questions={sampleOpenQuestions} />
      <ConnectedAppsTile apps={sampleConnectedApps} />
      <UserContextTile context={sampleUserContext} />
    </div>
  );
}
