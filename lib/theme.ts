/*
 * Hell/Dunkel-Umschaltung. Diese Datei ist bewusst OHNE "use client": sie wird
 * von einer Server-Komponente (app/layout.tsx, fuer das Inline-Skript) UND von
 * einer Client-Komponente (ThemeToggle) gelesen. Exporte eines
 * "use client"-Moduls kommen in einer Server-Komponente nur als
 * Client-Referenz an — eine dort importierte Zeichenkette waere `undefined`,
 * und das Inline-Skript wuerde still den falschen Schluessel lesen.
 *
 * Gespeichert wird ausschliesslich die Darstellung. Das ist eine
 * Oberflaechen-Einstellung und KEIN Gesundheitsdatum; sie darf deshalb im
 * localStorage liegen.
 */

export const THEME_STORAGE_KEY = "optimus-darstellung";
export const THEME_DARK = "dunkel";
export const THEME_LIGHT = "hell";

/** Klasse, an der Tailwind den Dunkelmodus erkennt (siehe app/globals.css). */
export const THEME_DARK_CLASS = "dark";

/**
 * Setzt die Klasse, BEVOR der Browser zeichnet. Laeuft als Inline-Skript im
 * <head> und damit vor React: kein Aufblitzen der hellen Fassung, kein
 * Hydration-Konflikt. Standard bleibt hell — ohne gespeicherte Wahl passiert
 * nichts.
 */
export const themeBootstrapScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})===${JSON.stringify(THEME_DARK)})document.documentElement.classList.add(${JSON.stringify(THEME_DARK_CLASS)})}catch(e){}})()`;
