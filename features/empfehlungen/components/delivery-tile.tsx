import { Package } from "lucide-react";
import Image from "next/image";

import { RailTile } from "@/components/common/context-rail";
import tagespacks from "@/public/supplements/tagespacks.webp";

/*
 * ============================================================================
 * SO KOMMT ES ZU DIR — die Kachel, die aus einer Liste eine Lieferung macht.
 * ============================================================================
 * Die Seite stellt ein Abo zusammen und zeigte davon bisher nur Zeilen, Preise
 * und eine Summe. Was jemand tatsaechlich in die Hand bekommt — Beutel, einer
 * pro Tag, statt acht Dosen — stand nirgends. Das Foto beantwortet das in einem
 * Blick; drei Saetze koennten es nicht.
 *
 * SIE STEHT IN DER LEISTE UND NICHT AUF DER SEITE, weil sie Rahmen ist und kein
 * Gegenstand: die Inhaltsspalte gehoert den Empfehlungen, die Leiste dem, was
 * man beim Zusammenstellen wissen muss. Und sie steht dort UNTER dem Warenkorb —
 * erst die Handlung, dann was daraus wird.
 *
 * ⚠️ KEINE WIRKAUSSAGE, auch hier nicht. Die Kachel spricht ueber Verpackung
 * und Takt, nie ueber Nutzen. "Vegan & ohne künstliche Zusatzstoffe" steht auf
 * der Schachtel im Foto und bewusst nicht als Text daneben: Produktangaben
 * gehoeren an das Produkt und brauchen eine Freigabe, die wir hier nicht haben.
 *
 * ⚠️ PLATZHALTER: 30 Beutel im Monat ist ein Entwurfswert wie die Preise. Der
 * echte Liefertakt kommt aus der Fulfillment-Seite, die es noch nicht gibt.
 *
 * Das Foto wird STATISCH importiert und liegt in public/ — next/image kennt
 * Groesse und Format zur Bauzeit, und zur Laufzeit geht keine Anfrage nach
 * draussen (siehe GDPR-Abschnitt in AGENTS.md).
 */
export function DeliveryTile() {
  return (
    <RailTile title="So kommt es zu dir" icon={<Package />}>
      {/*
       * DAS FOTO TRAEGT HIER EINE AUSSAGE und ist deshalb NICHT alt="" — anders
       * als die Kapseln in den Zeilen, die reine Wiedererkennung sind. Wer es
       * nicht sieht, muss trotzdem erfahren, dass es Beutel sind.
       *
       * Nicht auf Leistenbreite: das Bild ist fast quadratisch und waere sonst
       * 350px hoch, also hoeher als der Warenkorb darueber. Es ist freigestellt
       * auf Weiss, liegt also ohne eigene Flaeche auf der Kachel.
       */}
      <Image
        src={tagespacks}
        alt="Eine Schachtel „Tagespacks“ mit einzelnen Beuteln darin, davor ein Tagesbeutel und lose Kapseln."
        className="mx-auto mt-3 h-auto w-full max-w-48"
      />

      <p className="text-on-rail mt-3 text-xs">
        Dein Abo kommt als Tagesbeutel: 30 im Monat, einer für jeden Tag. Alles,
        was du an einem Tag nimmst, steckt in einem Beutel — nichts abzählen,
        nichts umfüllen.
      </p>
      <p className="text-on-rail-muted text-2xs mt-2">
        Nach jedem Test wird neu gepackt.
      </p>
    </RailTile>
  );
}
