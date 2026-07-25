import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { themeBootstrapScript } from "@/lib/theme";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Optimus — Deine Gesundheit, messbar besser",
    template: "%s | Optimus",
  },
  description:
    "Optimus verbindet deine Messwerte mit wissenschaftlich fundierten Empfehlungen — verständlich aufbereitet, jeden Tag.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${ibmPlexSans.variable} h-full antialiased`}
      // Das Skript aendert die Klassenliste, bevor React uebernimmt.
      suppressHydrationWarning
    >
      <head>
        {/*
         * Eigenes Inline-Skript, kein Fremdanbieter und keine Netzwerkanfrage:
         * es setzt die gespeicherte Darstellung vor dem ersten Zeichnen. Der
         * Inhalt kommt aus lib/theme.ts — dieselbe Quelle, die der Umschalter
         * schreibt.
         */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
