import { Package } from "lucide-react";
import Image from "next/image";

import { RailTile } from "@/components/common/context-rail";
import tagespacks from "@/public/supplements/tagespacks.webp";

import { DELIVERY_FROM_MONTH } from "../rules";

/*
 * ============================================================================
 * SO KOMMT ES ZU DIR — Versand, Takt und das Produktfoto.
 * ============================================================================
 * ⚠️ DAS FOTO STEHT WIEDER HIER. Es war eine Runde lang im Kopf der Seite, und
 * dort war es Werbung: das erste, was man sah, war die Packung, und die
 * Auswertung kam darunter. In dieser Kachel sagt es etwas anderes und Richtiges
 * — SO kommt das, was in der Liste steht, bei dir an. Es darf nicht an beiden
 * Stellen stehen: zweimal dasselbe Foto in einem Bild macht aus einer Aussage
 * eine Verzierung.
 *
 * ============================================================================
 * ⚠️ TODO: DAS MOTIV FEHLT NOCH.
 * ============================================================================
 * Gebraucht wird EIN EINZELNER TAGESBEUTEL, frontal, im HOCHFORMAT. Das
 * vorhandene Bild zeigt gestapelte Schachteln mit verstreuten Kapseln davor —
 * das ist ein Regal und kein Tagesbeutel, und es beantwortet die Frage der
 * Kachel nicht.
 *
 * Der Rahmen ist deshalb schon auf Hochformat gestellt (aspect-3/4, 96px breit)
 * und schneidet das vorhandene Motiv zu. Wer das richtige Bild einsetzt, tauscht
 * NUR den Import und den alt-Text; das Layout bleibt.
 *
 * ⚠️ KEINE WIRKAUSSAGE, auch hier nicht. Die Kachel spricht ueber Verpackung
 * und Takt, nie ueber Nutzen. Produktangaben ("vegan", "ohne künstliche
 * Zusatzstoffe") brauchen eine Freigabe, die das Projekt nicht hat — sie stehen
 * auf der Schachtel im Foto und bewusst nirgends als Text.
 *
 * ⚠️ PLATZHALTER: 30 Beutel im Monat, der erste Liefermonat und der Versandtext
 * sind Entwurfswerte wie die Preise. Der echte Liefertakt kommt aus der
 * Fulfillment-Seite, die es noch nicht gibt.
 */
export function DeliveryTile() {
  return (
    <RailTile title="So kommt es zu dir" icon={<Package />}>
      <div className="mt-3 flex items-start gap-3">
        {/*
         * Das Foto traegt hier eine Aussage und ist deshalb nicht alt="" —
         * anders als die Kapseln in den Zeilen, die reine Wiedererkennung sind.
         */}
        <span className="relative block aspect-3/4 w-24 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={tagespacks}
            alt="Ein Tagesbeutel mit der Tagesportion darin."
            fill
            className="object-cover"
            sizes="96px"
          />
        </span>

        <p className="text-on-rail min-w-0 flex-1 text-xs">
          Dein Abo kommt als Tagesbeutel: 30 im Monat, einer für jeden Tag.
          Alles, was du an einem Tag nimmst, steckt in einem Beutel — nichts
          abzählen, nichts umfüllen.
        </p>
      </div>

      <ul className="text-on-rail-muted text-2xs mt-3 flex flex-col gap-1">
        <li>Erste Lieferung im {DELIVERY_FROM_MONTH}, dann alle 30 Tage.</li>
        <li>Versand innerhalb Deutschlands, ohne Versandkosten.</li>
        <li>Jederzeit pausierbar. Nach jedem Test wird neu gepackt.</li>
      </ul>
    </RailTile>
  );
}
