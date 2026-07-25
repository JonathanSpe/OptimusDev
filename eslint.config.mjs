import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

// tokens/tokens.json -> globals.css is the single source of truth for colors.
const RAW_COLOR = String.raw`#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(`;
const ARBITRARY_TW_VALUE = String.raw`-\[#`;

const RAW_COLOR_MESSAGE =
  "Keine rohen Farbwerte in Komponenten. Verwende die Token-Utilities (z. B. text-foreground, bg-primary) aus tokens/tokens.json.";
const ARBITRARY_TW_MESSAGE =
  "Keine arbitraeren Tailwind-Werte wie bg-[#a32432]. Verwende die Token-Utilities aus tokens/tokens.json.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next already registers the jsx-a11y plugin, so only the
    // recommended rule set is layered on top of it here.
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${RAW_COLOR}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_COLOR}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${ARBITRARY_TW_VALUE}/]`,
          message: ARBITRARY_TW_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${ARBITRARY_TW_VALUE}/]`,
          message: ARBITRARY_TW_MESSAGE,
        },
      ],
    },
  },
  {
    // Von shadcn generiert und nicht von Hand gepflegt. Die Hex-Werte darin
    // sind Recharts-Selektoren ([stroke='#ccc']), keine Design-Entscheidungen —
    // die Farben der Diagramme kommen aus --chart-1 … --chart-5.
    files: ["components/ui/chart.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Must stay last so formatting-related rules lose to Prettier.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
