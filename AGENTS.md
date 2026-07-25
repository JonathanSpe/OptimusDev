<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Optimus — Project Rules (read before every task)

## What this project is

German-language health-tech web app ("Optimus"). Next.js App Router + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui. All user-facing text is German. Current build scope: site shell, then Dashboard (`/dashboard`) and Analysis (`/analyse`) only — all other pages stay stubs until explicitly requested.

## Architecture rules (do not violate)

- Route groups: `app/(marketing)` = public pages, `app/(app)` = logged-in area, `app/(auth)` = login/register. Route files stay THIN — they only compose; real UI and logic live in `features/<domain>/` (components/, hooks/, index.ts).
- Domain data flows through `contracts/` (TypeScript interfaces + Zod schemas) → repository implementations in `data/mock/` (later `data/http/`). Components NEVER fetch directly or know which implementation is active. Reads go through TanStack Query hooks in the feature folder.
- Shared primitives: `components/ui/` (shadcn, owned). App-wide composed components: `components/common/`. Helpers: `lib/`.
- Never delete or rename existing routes/folders without being asked.

## Design system (single source of truth)

- `tokens/tokens.json` (W3C DTCG format) is the ONLY source for colors, spacing, radii, typography, shadows, blur. Styling goes through the CSS variables / Tailwind theme derived from it (see `app/globals.css`).
- FORBIDDEN in components: raw hex/rgb/hsl values, arbitrary Tailwind values like `w-[437px]` or `bg-[#A32432]`, inline style colors. If a needed value is missing, ADD a token first, then use it.
- Brand palette: crimson — Tint #EBC0C5, Light #C96773, Base #A32432, Dark #6E1822 (already tokenized; never re-hardcode these).
- Red is an ACCENT color only (primary buttons, active states, highlighted values, chart accent) — never large surfaces. Headings are neutral-dark.
- Dashboard uses greyscale plus the brand accent only. Status colours (green/amber/red) are reserved for the Analysis surface, where they carry a verdict. A value is never colour-coded on the Dashboard.
- Look: glassmorphism, built as three surface levels over a fixed mesh-gradient backdrop plus a 3% grain overlay. The `(app)` shell uses `.glass-shell` (floating panel) and `.glass-rail` (detached icon rail), `.surface-content` for the content area, `.surface-card` for the SOLID cards on it, and `.rail-panel` / `.rail-card` for the context rail — its own detached panel next to the content panel, separated by the shell gap (no divider line) and a step matter than the content column so its solid white cards read as distinct objects. Glass surfaces are never opaque — the backdrop must show through. The older `.glass` / `.glass-strong` / `.glass-subtle` utilities remain for marketing pages. Keep the `@supports not (backdrop-filter…)` opaque fallback intact.
- On the context rail use only the on-rail token family (`text-on-rail*`, `border-rail-line*`, `*-on-rail` status colours, `ring-on-rail`) and the `rail*` button variants. They currently match the content-surface roles, but staying inside the family is what lets the rail change its surface without touching every component on it.
- Error/danger UI uses the orange-red danger tokens (NOT brand red) and always pairs color with an icon or text label.
- Font: IBM Plex Sans via `next/font/google` (self-hosted at build). NEVER add Google Fonts `<link>` tags (GDPR).
- Default theme: light. Dark mode tokens exist; keep new styles theme-compatible (use semantic tokens, no literal white/black).

## Quality bar

- TypeScript strict; no `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason if unavoidable).
- Accessibility WCAG AA: semantic HTML, labels on inputs, focus-visible styles, 4.5:1 contrast for body text, color never the only signal. German `lang="de"` stays on `<html>`.
- Every interactive component handles loading, empty, and error states.
- Components small and typed; props interfaces exported. No default exports except Next.js route/layout files.
- All user-facing strings in German, formal product tone, informal address ("du").

## GDPR / health data (non-negotiable)

- No health data in localStorage/sessionStorage, URLs, query params, or console logs.
- No third-party requests at runtime (fonts, analytics, CDNs) without explicit instruction.
- Auth guard will protect `(app)` later; note it in comments where relevant, do not build auth unless asked.
- `/impressum` and `/datenschutz` stay as marked placeholders — never fill with invented legal text.

## Workflow

- Work in small steps; after each task run `npm run dev` mentally: the code must compile with zero TypeScript/ESLint errors.
- Conventional Commits (`feat:`, `fix:`, `chore:`…) if asked to commit.
- When something is ambiguous, choose the smallest reversible implementation and leave a `// ENTSCHEIDUNG:` comment explaining the choice.
