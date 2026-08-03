import type { StaticImageData } from "next/image";

import capsuleBlue from "@/public/supplements/capsule-blue.webp";
import capsuleGreen from "@/public/supplements/capsule-green.webp";
import capsuleRed from "@/public/supplements/capsule-red.webp";
import capsuleSand from "@/public/supplements/capsule-sand.webp";

/*
 * ============================================================================
 * DIE PRODUKTFOTOS — eine Registrierung, kein Zuordnungsverzeichnis.
 * ============================================================================
 * ⚠️ PLATZHALTER: Es sind vier freigestellte Kapseln und keine echten
 * Produktfotos. Sobald es welche gibt, wandern sie hierher (oder das Feld
 * imageKey wird zu einer Bild-Referenz aus dem Katalog) — die Oberflaechen
 * aendern sich dabei nicht.
 *
 * ⚠️ HIER STAND FRUEHER EINE ANDERE TABELLE, in supplement-row.tsx, und sie
 * bildete PRAEPARAT-ID → BILD ab. Das ist der Unterschied, um den es geht:
 * jene Tabelle musste angefasst werden, sobald ein Praeparat dazukam, und eine
 * zweite Oberflaeche haette sie entweder importiert oder eine eigene angelegt.
 *
 * Diese hier bildet BILDSCHLUESSEL → DATEI ab. Welches Bild ein Praeparat
 * traegt, sagen die Daten (contracts/supplement.ts, Feld imageKey). Ein neues
 * Praeparat braucht keinen Eintrag hier, nur einen Schluessel — und ein neues
 * BILD ist genau ein Eintrag, an einer Stelle, fuer alle Oberflaechen.
 *
 * ⚠️ DAS BILD TRAEGT KEINE AUSSAGE. Es sagt nichts ueber Wirkstoff, Dosis oder
 * Zustand; es ist reine Wiedererkennung. Deshalb steht es ueberall mit alt=""
 * und bekommt nie eine Statusfarbe hinterlegt. Und deshalb ist ein
 * Rueckfallbild unproblematisch: zwei Praeparate mit derselben Kapsel behaupten
 * nichts Falsches, sie sind nur weniger unterscheidbar.
 *
 * KEINE FREMDEN HOSTS. Die Bilder werden statisch importiert und liegen in
 * public/ — next/image kennt damit Groesse und Format zur Bauzeit, und zur
 * Laufzeit geht keine Anfrage nach draussen (siehe GDPR-Abschnitt in AGENTS.md).
 */

const SUPPLEMENT_IMAGE: Readonly<Record<string, StaticImageData>> = {
  "capsule-blue": capsuleBlue,
  "capsule-green": capsuleGreen,
  "capsule-red": capsuleRed,
  "capsule-sand": capsuleSand,
};

/**
 * Bild fuer ein Praeparat ohne eigenes Foto. Ein leerer Platz waere schlechter:
 * die Zeilen richten Bild und Name aneinander aus, und eine Zeile ohne Bild
 * bricht die Flucht.
 */
export const SUPPLEMENT_IMAGE_FALLBACK: StaticImageData = capsuleGreen;

/**
 * Loest den Bildschluessel eines Praeparats auf. Ein unbekannter Schluessel
 * faellt still auf das Rueckfallbild zurueck — ein fehlendes Bild soll eine
 * Liste nicht zerlegen.
 */
export function toSupplementImage(imageKey: string | null): StaticImageData {
  if (imageKey === null) return SUPPLEMENT_IMAGE_FALLBACK;
  return SUPPLEMENT_IMAGE[imageKey] ?? SUPPLEMENT_IMAGE_FALLBACK;
}
