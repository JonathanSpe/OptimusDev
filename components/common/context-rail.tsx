"use client";

import { CalendarClock, Check, CircleHelp, Link2, Plug } from "lucide-react";
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
 * Diese Leiste steht auf JEDER Seite des eingeloggten Bereichs, also auch auf
 * dem Dashboard. Das Dashboard bleibt frei von Interpretation. Deshalb enthaelt
 * die Leiste KEINEN Score, KEINE Konfidenz-Anzeige, KEINE Ampel und KEINEN
 * Befund. Offene Fragen sind neutral formuliert ("Beantworten verbessert deine
 * Auswertung") und nennen weder eine Kategorie noch einen Wert. Bewertet wird
 * ausschliesslich in der Analyse.
 *
 * Der Punkt bei "Verknuepfte Apps" beschreibt die technische Verbindung einer
 * Datenquelle — er ist keine Aussage ueber die Gesundheit und wird immer von
 * einem Text begleitet.
 *
 * FLAECHE: Die Leiste ist ein eigenes Panel auf derselben hellen Flaeche wie
 * die Inhaltsspalte (rail-panel), ihre Kacheln sind deckend (rail-card). Text
 * darauf nutzt ausschliesslich die on-rail-Rollen — sie decken sich derzeit mit
 * den Text-Rollen der Inhaltsflaeche, bleiben aber eigene Rollen, damit die
 * Leiste ihre Flaeche wechseln kann, ohne dass hier etwas angefasst werden
 * muss. Die Kontraste dieser Rollen prueft npm run tokens gegen BEIDE Stufen.
 */

function RailTile({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rail-card rounded-2xl p-4", className)}>
      {/*
       * Blockueberschrift als kleines Versal-Label: klein, gesperrt und
       * halbfett. Es ordnet die Kachel ein, ohne mit den Angaben darin um
       * Aufmerksamkeit zu konkurrieren — die Grosschreibung traegt die
       * Auszeichnung, nicht der Schriftgrad.
       */}
      <h2 className="text-on-rail text-2xs flex items-center gap-2 font-semibold tracking-wide uppercase">
        {icon ? (
          <span
            aria-hidden="true"
            className="text-on-rail-muted [&_svg]:size-3.5"
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

function ProfileTile({ profile }: { profile: ProfileSummary }) {
  const stats = [
    { label: "Alter", value: `${profile.age} Jahre` },
    { label: "Geschlecht", value: profile.sex },
    { label: "Sportart", value: profile.sport },
  ];

  return (
    <section className="rail-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <ProfileAvatar
          initials={profile.initials}
          imageSrc={profile.imageSrc}
          size="md"
          tone="onRail"
        />
        <div className="min-w-0">
          <h2 className="text-on-rail truncate text-sm font-semibold">
            {profile.name}
          </h2>
          <p className="text-on-rail-muted text-2xs font-semibold tracking-wide uppercase">
            Dein Profil
          </p>
        </div>
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
    </section>
  );
}

function NextTestTile({ test }: { test: NextTest }) {
  return (
    <RailTile title="Nächster Test" icon={<CalendarClock />}>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-on-rail text-lg font-semibold tabular-nums">
          {test.date}
        </span>
        <span className="text-on-rail-muted text-xs tabular-nums">
          in {test.daysUntil} Tagen
        </span>
      </p>

      {/* Schlanke Zeitleiste: erledigte Tests als Punkt, der geplante als Ring. */}
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
                "size-2 rounded-full",
                entry.state === "erledigt"
                  ? "bg-on-rail/50"
                  : "bg-on-rail ring-on-rail/40 ring-2",
              )}
            />
            <span className="text-on-rail-muted text-2xs tabular-nums">
              {entry.label}
            </span>
            <span className="sr-only">
              {entry.date} {entry.state}
            </span>
          </li>
        ))}
      </ol>

      {/* Ohne Funktion: die Terminverwaltung kommt in einer spaeteren Stufe. */}
      <Button variant="railGhost" size="sm" className="mt-4 w-full">
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

function OpenQuestionsTile({ questions }: { questions: OpenQuestions }) {
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
      <p className="text-on-rail-muted mt-2 text-xs">
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
      <Button variant="railLink" className="mt-2 h-auto p-0 text-xs">
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
      <Button variant="railGhost" size="sm" className="mt-4 w-full">
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
    <RailTile title="Dein Kontext">
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
 * Kontext-Leiste des eingeloggten Bereichs. Inhalt ist auf jeder Seite gleich —
 * sie zeigt Rahmenbedingungen, nie Ergebnisse.
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
