# Design — CSDL Bảo tàng Hải dương học

Locked design system. Future Hallmark runs read this file first; pages defer to
it. Amend intentionally — this file is the rule.

## System

- Genre · atmospheric
- Tone · technical-scientific, visitor-first
- Macrostructure · Map / Diagram for public discovery; restrained dashboard for admin
- Theme · Midnight
- Axes · dark / geometric-sans / cool cyan
- Audience · khách tham quan khám phá và tra cứu bộ sưu tập

## Tokens

`tokens.css` is the canonical source of truth. It provides OKLCH dark-ocean
surfaces, ocean-cyan focus/action color, Space Grotesk display, Be Vietnam Pro
body copy, JetBrains Mono for specimen IDs, a 4px-derived space scale and named
easing/duration tokens. Page styles must consume named tokens, not inline colors.

## Type and layout

- Display · `var(--font-display)`, roman only, compact tracking; never italic headings.
- Body · `var(--font-body)`; scientific names may remain italic in running metadata.
- Maps and collection discovery lead the public information hierarchy.
- Image grids use `minmax(0, 1fr)` and collapse to one column below 48rem.
- `html, body` use `overflow-x: clip`; controls and primary navigation never wrap.

## CTA voice

- Primary · cyan fill, white text, concise action verb.
- Secondary · dark elevated surface with cyan-outline/focus state.
- Motion · transform/opacity only; reduced motion is a short opacity crossfade.

## Exports

- CSS · [`tokens.css`](tokens.css) is active in this project.
- Tailwind v4 · translate `--color-*`, `--font-*`, `--space-*`, `--text-*` and `--ease-*` directly inside `@theme` when Tailwind is introduced.
- DTCG · map the same semantic groups to `color`, `font`, `space`, `size`, `duration` and `radius`; do not introduce a parallel palette.
- shadcn/ui · map `--color-paper` → `--background`, `--color-ink` → `--foreground`, `--color-accent` → `--primary`, `--color-focus` → `--ring` if that stack is adopted.

## Guardrails

- Preserve Vietnamese public copy, real database metrics and Hoàng Sa/Trường Sa overlays.
- Do not use fabricated proof, fake device/browser chrome, gradient text or glassmorphism.
- Public and admin may have distinct density, but share color, typography, radius, focus and motion tokens.
