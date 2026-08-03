import type { Metadata } from "next";

import {
  BiomarkerBoard,
  sampleMarkerGroups,
  sampleMarkers,
} from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

/*
 * Das Dashboard zeigt BIOMARKER und sonst nichts: Wert, Verlauf, Referenzlage.
 * Seit die Kachel Farbe traegt, deutet es diese Lage auch — die Regel dafuer
 * steht in features/dashboard/rules.ts, und sonst nirgends. Was es weiterhin
 * nicht tut: Empfehlungen geben. Die stehen auf der Analyse-Oberflaeche.
 *
 * Die Route bleibt duenn und serverseitig; den Zustand des Umschalters haelt
 * das Board. Die Daten sind noch ein Mock aus features/dashboard/sample-data.ts
 * (⚠️ Grenzwerte sind Platzhalter) und wandern spaeter hinter eine
 * Repository-Abfrage.
 *
 * ⚠️ Unter der Ueberschrift stand ein Vorspann ("Deine Werte aus dem letzten
 * Bluttest — ohne Bewertung. Alle Zahlen sind Platzhalter."). Er ist entfernt;
 * die Kacheln sagen dasselbe, ohne es anzukuendigen. Damit steht der Hinweis
 * auf die Platzhalter-Grenzwerte nur noch im Code — sobald hier echte
 * Messwerte ankommen, gehoert er sichtbar zurueck auf die Seite.
 *
 * ENTSCHEIDUNG: Die Ueberschrift ist sr-only, wie auf /analyse/snapshot. Die
 * ausfuehrliche Begruendung steht dort; kurz: die 36px-Zeile kostete die erste
 * Bildschirmhoehe und benannte nur, was die Navigation schon markiert. Als h1
 * bleibt sie im Dokument, weil eine Seite ohne h1 fuer Screenreader eine Seite
 * ohne Namen ist.
 *
 * BEIDE SEITEN ODER KEINE. Die zwei einzigen gebauten Seiten stehen in
 * derselben Huelle nebeneinander; traege die eine einen grossen Titel und die
 * andere keinen, laese sich das als Versehen und nicht als Haltung.
 */
export default function DashboardPage() {
  return (
    <BiomarkerBoard groups={sampleMarkerGroups} markers={sampleMarkers}>
      <h1 className="sr-only">Deine Blutwerte</h1>
    </BiomarkerBoard>
  );
}
