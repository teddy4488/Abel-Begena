# Theme Proposal — Abel Begena, Ethiopian-authentic refresh

## The two problems we're solving

1. **Hard 1-px borders everywhere** — buttons, cards, inputs, tabs all use `border border-border`. They draw a sharp line and feel mechanical. The new approach **never uses a line for separation** — only color intensity, soft shadows, and gradient tints.

2. **Generic religious iconography** — the current Cross icons and decorative marks read as Latin/Western. The reference images all point toward **traditional Ethiopian Orthodox Tewahedo** craft: the diamond-lattice Lalibela cross, habesha textile geometry, and Ge'ez script ornamentation. The new theme replaces foreign motifs with authentic Ethiopian ones.

The yellow-gold accent stays — but everything around it gets warmer, more parchment-like, and more textured (with restraint).

---

## Color palette refinement

Existing primary/secondary stay. Two new accents added; backgrounds warmed toward parchment + wood.

### Light mode
| Role | Current | Proposed | Hex | Why |
|---|---|---|---|---|
| Background | `#ffffff` cold white | **Parchment cream** | `#fbf5e6` | Looks like aged manuscript |
| Background-soft | `rgba(255,255,255,.9)` | `rgba(251,245,230,.92)` | — | Matches parchment |
| Surface | `rgba(255,255,255,.95)` | `rgba(254,250,238,.97)` | — | Slightly lifted |
| Foreground | `#2d0a12` | **Ink walnut** `#2a1810` | — | Warmer black for body text |
| Primary | `#a16207` ✓ | (unchanged) | `#a16207` | Wood-aged gold |
| Secondary | `#eab308` ✓ | (unchanged) | `#eab308` | Saffron — the brand anchor |
| Accent (NEW) | — | **Manuscript red** | `#9b2c2c` | Used sparingly — like the red thread in habesha textile |
| Wood (NEW) | — | **Begena body brown** | `#6b3f1b` | For decorative frames, NOT main surfaces |
| Highlight | — | **Gilt** `#d4a437` | — | The shimmer on a freshly polished cross |

### Dark mode
| Role | Current | Proposed | Hex |
|---|---|---|---|
| Background | `#1f2937` cold slate | **Ink** | `#15100a` (warm near-black, like ink on vellum) |
| Background-elevated | `#374151` | `#23180e` | Warm dark surface |
| Surface | `rgba(31,41,55,.95)` | `rgba(35,24,14,.97)` | — |
| Foreground | (light) | `#fbeed1` | Warm cream text (no pure white) |
| All accents | (same as light) | (same as light) | Saffron + gilt visible against warm dark |

**Net effect:** both modes feel like aged manuscript and polished wood instead of cold tech. The gold reads as authentically gold rather than as one of three Material-design accents.

---

## The borders philosophy — "intensity, not lines"

Throughout the codebase, replace `border border-border` with one of these techniques:

### 1. **Tonal lift** — surface is a slightly lighter/darker shade of its parent
```css
/* Card on parchment background */
background: rgba(255, 250, 235, 0.6);  /* not pure white, just lifted */
```
The card "appears" because it's a different value, not because a line was drawn.

### 2. **Soft outer shadow** — implies elevation
```css
box-shadow:
  0 1px 2px rgba(107, 63, 27, 0.08),    /* close shadow */
  0 6px 20px rgba(107, 63, 27, 0.06);   /* ambient depth */
```
The eye reads the shape via the shadow, not a stroke.

### 3. **Inset highlight + shadow** — the begena-body trick
```css
box-shadow:
  inset 0 1px 0 rgba(255, 240, 195, 0.6),    /* top highlight, like polished wood */
  inset 0 -1px 0 rgba(58, 30, 10, 0.08),     /* bottom shadow */
  0 4px 14px rgba(107, 63, 27, 0.08);
```
Gives a button/card a subtle 3D feel — like burnished metal — without drawing any line.

### 4. **Gradient fade** — for section transitions
```css
background: linear-gradient(180deg,
  transparent 0%,
  rgba(234, 179, 8, 0.06) 50%,
  transparent 100%);
```
No bar, no rule — just a soft glow that hints at separation.

### 5. **Ring on focus/hover** — NOT a border
```css
box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.18);
```
Cleaner than `outline:` with the offset issues.

**Buttons specifically:**
- **Rest:** tonal background (gold) + inset highlight + soft drop shadow
- **Hover:** background brightens ~8%, shadow grows
- **Active:** background dims ~5%, shadow flattens (pressed)
- **Focus:** ring glow appears, no border line

---

## Iconography direction — replace generic crosses

Current state: many places use `lucide-react`'s generic `Cross` (a thin Latin plus sign). It's foreign.

**Replace with custom SVGs based on `05-lalibela-cross.jpg`** — the diamond-lattice Ethiopian Orthodox cross. Specifically:
- A `<LalibelaCross />` React component (small SVG) — used wherever the current `<Cross />` appears (nav logo accent, hero badges, section markers)
- An `<EOTCOrnament />` for decorative section dividers (inspired by `08-geez-script-band.jpg`)
- A `<BegenaSilhouette />` for hero watermarks (the 10-string lyre silhouette in subtle gold)

These ship as inline SVG components — no extra HTTP requests, fully theme-able with `currentColor`.

---

## Pattern library — Ethiopian decorative motifs

Three reusable pattern components, used sparingly for visual rhythm:

### `<HabeshaThread />` — horizontal divider
Inspired by `02-textile-thin.jpg` and `07-orange-borders.jpg`. A 16-px-tall SVG strip with the gold/black diamond textile pattern. Replaces every `<hr>` and `border-t` divider on the public site.

### `<GeezBand />` — section break
Inspired by `08-geez-script-band.jpg`. A row of Ge'ez letters (ሀ ለ ሐ መ) interleaved with diamond rows. Used **once** on the landing page between major sections — like a cathedral nave's stone band.

### `<AwdemaTile />` — background pattern
Inspired by `04-awdema-mark.jpg`. A repeating black-on-cream geometric pattern, **set at very low opacity** (4–6%) as a hero or footer background watermark. Never on top — only behind.

These are CSS-positioned, transform: scale-able, and respect dark mode (auto-invert).

---

## Where the new theme lands first

The proposal applies broadly, but the visible impact is heaviest on:

1. **Landing page hero** — parchment background, watermark Lalibela cross, Habesha thread under the hero
2. **Branches map section** — Ethiopian textile divider above
3. **Classes catalog cards** — tonal-lift treatment, no borders, gilt highlight on hover
4. **Sign In / Sign Up buttons in nav** (your screenshot) — intensity-based: filled saffron vs outlined-by-tonal-lift, not by hard stroke
5. **Public Contact form** — parchment textarea backgrounds, ring focus
6. **All admin/student tables and modals** — `.interactive-row` already shipped; this layer removes the remaining lines and replaces them with tonal differentiation

Stretch goals (only if time allows after approval):
- Custom Begena loading spinner (animated string-pluck SVG)
- Footer with a real habesha textile band
- Verification email template restyled with parchment + cross watermark

---

## Implementation phases (after your approval)

| Phase | What | Approx. effort |
|---|---|---|
| 1 | Update `globals.css` color vars + remove all `border-border` from shared utilities | 1 hour |
| 2 | Build the 4 SVG components (LalibelaCross, EOTCOrnament, BegenaSilhouette, HabeshaThread) | 1 hour |
| 3 | Apply to landing page (hero, sections, dividers, CTA buttons) | 2 hours |
| 4 | Sweep all `border border-border` in components → tonal-lift utility | 2 hours |
| 5 | Verify with Playwright on the landing page; capture before/after screenshots | 0.5 hour |
| 6 | Dark-mode pass | 0.5 hour |

**Total ~7 hours** of focused work. Reversible: all changes go through CSS vars + shared utilities, so a single git revert undoes the whole thing.

---

## What I need from you to proceed

1. **Save the reference images** into [client/public/design-refs/](../client/public/design-refs/) with the filenames listed in that folder's README
2. **Approve or amend** this proposal — happy to dial up the boldness (more textile, more red, more Ge'ez script) or dial it down (just colors + borders, skip the decorative SVGs)
3. **Confirm the demo timing** — if the client demo is today, we should hold this implementation until after; the new theme is too big to land mid-demo
