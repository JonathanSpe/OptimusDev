import { AppIconRail } from "@/components/common/app-icon-rail";
import { AppShellHeader } from "@/components/common/app-shell-header";
import { RailPlacementProvider } from "@/components/common/rail-placement";

/*
 * Diese Routen-Gruppe ist der eingeloggte Bereich. Ein Auth-Guard (Weiterleitung
 * nach /login für nicht angemeldete Nutzer) kommt in einer späteren Stufe hier
 * bzw. in der Proxy-/Middleware-Schicht dazu — aktuell ist alles frei zugänglich.
 *
 * AUFBAU (siehe app/globals.css), von hinten nach vorn:
 *   Hintergrund   Mesh-Verlauf + Korn am body — unscharf, nur zum Brechen da
 *   Icon-Leiste   eigene, schwebende Glasfläche LINKS neben dem Panel
 *   App-Panel     schwebendes Glas, vom Fensterrand abgesetzt, radius 24px
 *     Inhalt      helle, gefrostete Fläche · darauf DECKENDE Karten
 *   Kontext       KEINE eigene Fläche — die Kacheln liegen einzeln auf dem Mesh
 *
 * DIE KONTEXT-LEISTE HAT IHR PANEL VERLOREN, und das ist der Punkt. Sie trug
 * vorher rail-panel: eine zweite helle Glasfläche, nur eine Spur matter als die
 * Inhaltsfläche, mit 16px Spalt daneben. Zwei fast gleiche Flächen so dicht
 * nebeneinander lesen sich nicht als zwei Spalten, sondern als eine geteilte —
 * der Spalt war zu schmal, um zu trennen, und die Flächen zu ähnlich, um es
 * selbst zu tun. Jetzt steht zwischen Inhalt und Leiste der Hintergrund selbst,
 * und der trennt: dunkler, bewegter, sichtbar eine Ebene tiefer.
 *
 * Die Trennung leisten damit die Kacheln allein — deckendes Weiss direkt auf
 * dem Grund, mit dem tieferen Schatten (rail-card in globals.css), weil ein
 * Objekt auf blankem Mesh mehr Abhebung braucht als eines auf einer Fläche.
 *
 * Unter xl gilt das NICHT: dort wandert die Leiste in eine Schublade, und die
 * ist eine Fläche über dem Inhalt. rail-panel bleibt dafür bestehen (sheet.tsx).
 *
 * py-5 statt p-5: der senkrechte Einzug bleibt, weil er die Oberkante der
 * ersten Kachel mit xl:pt-5 der Inhaltsspalte bündig hält. Seitlich gibt es
 * nichts mehr einzurücken — ohne Panel gäbe es nur Kacheln, die schmaler wären
 * als ihre Spalte.
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
 *
 * WAS IN DER LEISTE STEHT, ENTSCHEIDET DIE ROUTE — ueber den Parallel-Slot
 * @rail. Das Layout kennt den Inhalt nicht mehr, es kennt nur den Platz: es
 * bekommt ihn als rail-Prop und setzt ihn an zwei Stellen ein, in die Spalte ab
 * xl und in die Schublade darunter. Die Normalbesetzung liefert
 * app/(app)/@rail/[...alleAnderen], /empfehlungen bestueckt sich selbst.
 *
 * Der Slot taucht in der URL NICHT auf — Slots sind keine Routensegmente.
 * LayoutProps kennt die rail-Prop aus der Ordnerstruktur; sie entsteht bei
 * next dev / next build / next typegen.
 */

export default function AppLayout({ children, rail }: LayoutProps<"/">) {
  return (
    <div className="flex h-dvh gap-0 p-3 md:p-4 lg:gap-4 xl:p-6">
      <AppIconRail />

      <div className="glass-shell rounded-panel flex min-w-0 flex-1 overflow-hidden md:max-lg:rounded-l-none md:max-lg:border-l-0">
        {/* Inhaltsspalte: eigene Scrollfläche, damit das Panel stehen bleibt. */}
        <div className="surface-content flex min-w-0 flex-1 flex-col">
          {/* Dieselbe Leiste wie rechts, nur in der Schublade — sonst haette
           * eine Seite unter xl eine andere Bestueckung als darueber. */}
          <AppShellHeader rail={rail} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 lg:px-8">
            {/*
             * KEINE Lesebreite auf der Inhaltsspalte: sie füllt den Platz
             * zwischen den beiden Leisten, abzüglich ihres Innenabstands. Die
             * Obergrenze ist nur die Notbremse für Ultrawide-Schirme. Begrenzt
             * wird ausschliesslich Fliesstext (max-w-measure), nie ein Raster —
             * sonst entsteht wieder der leere Streifen rechts und links.
             */}
            {/*
             * xl:pt-5 IST DIE BUENDIGKEIT MIT DER KONTEXT-LEISTE, kein
             * gerundeter Wert. Beide Spalten haengen am selben Rahmen (p-6);
             * die Leiste setzt ihren Inhalt mit py-5 ab. Bekommt die
             * Inhaltsspalte oben denselben Einzug, beginnen die erste Kachel
             * hier und die erste Kachel dort auf EINER Linie — zwei Spalten,
             * eine Oberkante. Vorher standen hier pt-8 gegen p-5, also 12px
             * Versatz: zu wenig, um Absicht zu sein, genug, um schief
             * auszusehen. Wer py-5 an der Leiste aendert, aendert das hier mit.
             *
             * Unter xl steht die Leiste in einer Schublade und es gibt nichts
             * auszurichten; dort gilt weiter der kleine Einzug unter der
             * Kopfzeile.
             */}
            <main className="max-w-content mx-auto w-full pt-2 xl:pt-5">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/*
       * Für Screenreader steht die Leiste hinter dem Inhalt, weil sie ihn
       * begleitet. Sie scrollt eigenständig — eine Spalte ohne eigene Fläche,
       * siehe den Block am Kopf dieser Datei.
       */}
      <aside
        aria-label="Kontext"
        // 400px: die Profilkacheln atmen, die Inhaltsspalte behaelt bei 1440px
        // noch Platz fuer zwei Kacheln pro Zeile.
        className="hidden w-100 shrink-0 overflow-y-auto py-5 xl:block"
      >
        {/* Welcher der beiden Plaetze das hier ist, muss der Inhalt wissen
         * koennen: die Spalte steht unter xl per display:none im Dokument, die
         * Schublade gibt es nur geoeffnet. Siehe rail-placement.tsx. */}
        <RailPlacementProvider placement="column">{rail}</RailPlacementProvider>
      </aside>
    </div>
  );
}
