import { redirect } from "next/navigation";

/*
 * /analyse ist nur das Kapitel, keine eigene Seite: der Einstieg ist der
 * Snapshot. Die Weiterleitung passiert im Server-Rendering, damit die Adresse
 * in der Leiste sofort stimmt und die Navigation den Unterpunkt markieren kann.
 */
export default function AnalysePage() {
  redirect("/analyse/snapshot");
}
