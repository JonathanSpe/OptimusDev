import Image from "next/image";

import { cn } from "@/lib/utils";

/** "onRail" ist die Fassung fuer die Kontext-Leiste. */
export type ProfileAvatarTone = "default" | "onRail";

export interface ProfileAvatarProps {
  /** Initialen, z. B. "JW". Sie tragen den Avatar, solange kein Bild vorliegt. */
  initials: string;
  /*
   * Profilbild aus dem EIGENEN Projekt (public/…). Fehlt es, bleiben die
   * Initialen stehen — die Kachel darf nie leer wirken.
   *
   * GDPR: ausschliesslich lokale Pfade. Ein Dienst wie Gravatar oder
   * ui-avatars.com waere ein Request an Dritte mit der Kennung einer Person im
   * Anhang und ist damit ausgeschlossen.
   */
  imageSrc?: string;
  size?: "sm" | "md";
  tone?: ProfileAvatarTone;
  className?: string;
}

/** Kantenlaenge in Pixeln je Groesse — next/image braucht ein Mass. */
const AVATAR_PIXELS: Record<NonNullable<ProfileAvatarProps["size"]>, number> = {
  sm: 32,
  md: 44,
};

/**
 * Avatar der angemeldeten Person: Profilbild, sonst Initialen.
 *
 * Er bleibt in jedem Fall DEKORATIV (aria-hidden, leerer Alternativtext) —
 * neben ihm steht ueberall der Name oder eine sr-only-Beschriftung, und ein
 * zweites Mal vorgelesen zu werden hilft niemandem.
 *
 * ENTSCHEIDUNG: Es gibt weiterhin KEINEN Upload und keine externe Bildquelle.
 * Das Bild ist ein Platzhalter aus public/ fuer die Gestaltung; ein echtes
 * Profilfoto ist ein zusaetzliches personenbezogenes Datum und braucht eine
 * eigene Entscheidung samt Rechtsgrundlage, bevor es hochgeladen werden kann.
 */
export function ProfileAvatar({
  initials,
  imageSrc,
  size = "sm",
  tone = "default",
  className,
}: ProfileAvatarProps) {
  const pixels = AVATAR_PIXELS[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        // Auf der Leiste traegt eine neutrale Toenung den Chip, nicht die
        // Markenflaeche — dort ist Rot schon fuer Links vergeben.
        tone === "onRail"
          ? "bg-on-rail/12 text-on-rail"
          : "bg-brand-subtle text-brand-strong",
        size === "sm" ? "size-8 text-xs" : "size-11 text-sm",
        className,
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          width={pixels}
          height={pixels}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
