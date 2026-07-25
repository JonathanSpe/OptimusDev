import { AppIconRail } from "@/components/common/app-icon-rail";
import { AppShellHeader } from "@/components/common/app-shell-header";
import { ContextRail } from "@/components/common/context-rail";

/*
 * Diese Routen-Gruppe ist der eingeloggte Bereich. Ein Auth-Guard (Weiterleitung
 * nach /login für nicht angemeldete Nutzer) kommt in einer späteren Stufe hier
 * bzw. in der Proxy-/Middleware-Schicht dazu — aktuell ist alles frei zugänglich.
 *
 * AUFBAU (Glas in vier Ebenen, siehe app/globals.css):
 *   Hintergrund   Mesh-Verlauf + Korn am body — unscharf, nur zum Brechen da
 *   Icon-Leiste   eigene, schwebende Glasfläche LINKS neben dem Panel
 *   App-Panel     schwebendes Glas, vom Fensterrand abgesetzt, radius 24px
 *     Inhalt      helle, gefrostete Fläche · darauf DECKENDE Karten
 *   Kontext       eigenes Panel RECHTS neben dem App-Panel — etwas matter als
 *                 die Inhaltsfläche, damit die weissen Kacheln darauf abspringen
 *
 * Alle drei Flächen sind Geschwister derselben Flex-Zeile: der Abstand (gap)
 * zwischen ihnen ist die Trennung — dazwischen bleibt der Hintergrund sichtbar,
 * keine Linie. Die Kontext-Leiste hat denselben senkrechten Einzug wie das
 * Panel, damit beide auf einer Ebene schweben.
 *
 * Der Rahmen ist genau fensterhoch (h-dvh) und scrollt nicht: gescrollt wird
 * INNERHALB der Inhaltsspalte und innerhalb der Kontext-Leiste. Nur so bleibt
 * das Panel eine Scheibe mit festen Kanten — und die Icon-Leiste kann sich mit
 * self-center wirklich am Fenster ausrichten, ohne feste Positionierung.
 *
 * Breiten: ab xl steht die Kontext-Leiste neben dem Panel, darunter wandert sie
 * in eine Schublade (Kopfzeile). Ab lg schwebt die Icon-Leiste frei, zwischen md
 * und lg dockt sie an die Panel-Kante, unter md wird sie zur Schublade. Die
 * Inhaltsspalte hat KEINE feste Breite: sie nimmt, was die beiden Leisten
 * uebrig lassen.
 */

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-dvh gap-0 p-3 md:p-4 lg:gap-4 xl:p-6">
      <AppIconRail />

      <div className="glass-shell rounded-panel flex min-w-0 flex-1 overflow-hidden md:max-lg:rounded-l-none md:max-lg:border-l-0">
        {/* Inhaltsspalte: eigene Scrollfläche, damit das Panel stehen bleibt. */}
        <div className="surface-content flex min-w-0 flex-1 flex-col">
          <AppShellHeader />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 lg:px-8">
            {/*
             * KEINE Lesebreite auf der Inhaltsspalte: sie füllt den Platz
             * zwischen den beiden Leisten, abzüglich ihres Innenabstands. Die
             * Obergrenze ist nur die Notbremse für Ultrawide-Schirme. Begrenzt
             * wird ausschliesslich Fliesstext (max-w-measure), nie ein Raster —
             * sonst entsteht wieder der leere Streifen rechts und links.
             */}
            <main className="max-w-content mx-auto w-full pt-2 xl:pt-8">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/*
       * Für Screenreader steht die Leiste hinter dem Inhalt, weil sie ihn
       * begleitet. Sie scrollt eigenständig.
       */}
      <aside
        aria-label="Kontext"
        // 400px: die Profilkacheln atmen, die Inhaltsspalte behaelt bei 1440px
        // noch Platz fuer zwei Kacheln pro Zeile.
        className="rail-panel rounded-panel hidden w-100 shrink-0 overflow-y-auto p-5 xl:block"
      >
        <ContextRail />
      </aside>
    </div>
  );
}
