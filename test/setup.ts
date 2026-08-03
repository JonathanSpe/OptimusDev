import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Vitest runs without globals, so RTL's automatic cleanup has to be wired up.
afterEach(cleanup);

/*
 * jsdom bringt kein matchMedia mit — ohne diesen Ersatz wirft jeder Test, der
 * useMediaQuery beruehrt (lib/use-media-query.ts), beim ersten Render.
 *
 * Er antwortet auf JEDE Abfrage mit `false`, also mit der Anordnung fuer
 * SCHMALE Schirme. Das ist Absicht und deckt sich mit dem Serverstand des
 * Hooks: die Tests pruefen damit durchgehend dieselbe Fassung, und zwar die
 * ohne Kontext-Spalte — auf der Empfehlungsseite steht der Warenkorb dort also
 * in der klebenden Fussleiste. Wer die breite Fassung pruefen will, ersetzt
 * matchMedia im einzelnen Test.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
