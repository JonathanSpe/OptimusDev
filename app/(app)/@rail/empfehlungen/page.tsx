import {
  OpenQuestionsTile,
  ProfileTile,
} from "@/components/common/context-rail";
import { sampleOpenQuestions, sampleProfile } from "@/features/context";
import { DeliveryTile, RailCartSlot } from "@/features/empfehlungen";

/*
 * ============================================================================
 * DIE KONTEXT-LEISTE DER EMPFEHLUNGSSEITE — vier Kacheln statt fuenf.
 * ============================================================================
 * Der genauere Pfad gewinnt: dieser Ordner heisst wie die Route und tritt
 * deshalb an die Stelle des Catch-alls daneben, der ueberall sonst die
 * Normalbesetzung liefert.
 *
 * WAS HIER FEHLT UND WARUM. Naechster Test, verknuepfte Apps und "Dein
 * Kontext" sind Rahmenbedingungen, die man beim Lesen von Befunden braucht.
 * Auf dieser Seite wird nichts befundet, hier wird ein Abo zusammengestellt.
 * Drei Kacheln, die dabei nicht helfen, kosten genau den Platz, den der
 * Warenkorb braucht — und der Warenkorb ist der Gegenstand der Seite.
 *
 * DIE REIHENFOLGE IST EINE RANGFOLGE: das Profil oben, weil es auf jeder Seite
 * oben steht und die Leiste sonst ihren Anfang verloere; der Warenkorb in der
 * Mitte, wo der Blick zuerst hinfaellt; die Lieferung direkt darunter, weil sie
 * zeigt, was aus der Bestaetigung wird; die offenen Fragen zuletzt, weil sie
 * hier Beiwerk sind und nicht die Aufgabe.
 *
 * ⚠️ DIE REGEL DER LEISTE GILT WEITER (siehe components/common/context-rail):
 * kein Score, keine Ampel, kein Befund. Der Warenkorb bricht sie nicht — er
 * rechnet Preise und faellt kein Urteil ueber einen Messwert.
 *
 * Die Beispieldaten kommen wie in der Normalbesetzung direkt aus
 * features/context. Sobald das Repository steht, holen beide sie von dort.
 */
export default function RailEmpfehlungen() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileTile profile={sampleProfile} />
      <RailCartSlot />
      <DeliveryTile />
      <OpenQuestionsTile questions={sampleOpenQuestions} />
    </div>
  );
}
