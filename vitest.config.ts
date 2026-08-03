import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

/*
 * Statische Bildimporte, wie next/image sie erwartet.
 *
 * Im Build macht der Next-Loader aus `import bild from "@/public/…webp"` ein
 * Objekt mit src, width und height. Vite kennt diesen Loader nicht und liefert
 * nur den Pfad — <Image> wirft dann `missing required "width" property`, und
 * zwar in jedem Test, der eine Praeparate-Zeile rendert.
 *
 * Die Masse hier sind Attrappen: kein Test misst ein Bild, sie brauchen nur
 * eine Zahl, damit die Komponente ueberhaupt rendert.
 */
const nextStaticImages: Plugin = {
  name: "next-static-images",
  enforce: "pre",
  load(id) {
    if (!/\.(webp|avif|png|jpe?g|gif)(\?.*)?$/.test(id)) return null;
    const src = JSON.stringify(id.split("?")[0]);
    return `export default { src: ${src}, width: 44, height: 44, blurWidth: 0, blurHeight: 0 };`;
  },
};

export default defineConfig({
  plugins: [nextStaticImages, react()],
  // Resolves the "@/*" alias from tsconfig.json so tests import like app code.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
