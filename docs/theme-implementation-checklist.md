# Theme Implementation — Checklist ✅

Approved theme: see [theme-preview.html](./theme-preview.html) and [theme-proposal.md](./theme-proposal.md).
**Implementation complete on 2026-06-08.** Both server and client typecheck pass.
Landing page, login, classes, and branches verified via Playwright.

---

## Phase 1 — Tokens & Utilities (`globals.css`) ✅

- [x] Replace light-mode CSS variables with parchment/wood/gilt palette
- [x] Replace dark-mode CSS variables with warm-ink palette
- [x] Add new accent tokens: `--color-wood`, `--color-gilt`, `--color-accent-red`, `--color-accent-green`
- [x] Reduce `--color-border` to near-transparent
- [x] Add new utility classes:
  - [x] `.tonal-lift` — card without a border
  - [x] `.recessed` — input/textarea sunken treatment
  - [x] `.ornate-frame` — hero/section wrapper with subtle inset highlight
  - [x] `.divider-gradient` — soft gradient line
- [x] Add CSS-only pattern utilities: `.habesha-thread`, `.habesha-wide-strip`, `.awdema-bg`

## Phase 2 — Reusable SVG components ✅

Folder: `client/src/components/icons/ethiopian/`

- [x] `LalibelaCross.tsx` — diamond-lattice cross (38 diamonds, faithful to reference)
- [x] `BegenaGlyph.tsx` — yoke + posts + strings + resonator silhouette
- [x] `EOTCOrnament.tsx` — inline 3-diamond divider
- [x] `HabeshaThread.tsx` — thin gold/wood horizontal divider
- [x] `HabeshaWideStrip.tsx` — vivid colorful divider
- [x] `GeezBand.tsx` — Ge'ez letters + diamond rows (configurable)
- [x] `AwdemaWash.tsx` — low-opacity background pattern wrapper
- [x] `VerticalTextileColumn.tsx` — side-edge decorative column
- [x] `index.ts` re-exports

## Phase 3 — Landing page (`client/src/app/page.tsx`) ✅

- [x] **Hero → Manuscript Frame composition:**
  - [x] Ge'ez script band as top header strip
  - [x] Awdema tile background wash
  - [x] Vertical textile column rules on left + right edges
  - [x] Lalibela cross watermark behind the text
  - [x] Habesha-wide colorful strip at the bottom edge
  - [x] Small Begena glyph as corner accent (top-left)
- [x] **Services section → Trinity Cards** (centered Lalibela + Habesha-flanked kicker + 3 cards)
- [x] Sign-In / Sign-Up CTAs converted to intensity-based (no borders)
- [x] All `border border-secondary` outline buttons replaced

## Phase 4 — User-facing pages ✅

All `border border-border` and equivalent decorative borders removed and replaced with `tonal-lift` / `recessed` / `btn-ghost-strong` / `ornate-frame`.

### Student
- [x] `/student` (dashboard)
- [x] `/student/lessons`
- [x] `/student/attendance` (already used `.interactive-row` from earlier)
- [x] `/student/payments`
- [x] `/student/orders` (already used `.interactive-row`)
- [x] `/student/error`

### Regular user
- [x] `/dashboard`
- [x] `/dashboard/payments`
- [x] `/dashboard/become-student`
- [x] `/dashboard/error`
- [x] `/account/orders`

### Public
- [x] `/classes` (25 borders → 0)
- [x] `/store/[id]`
- [x] `/branches`
- [x] `/cart`
- [x] `/checkout` (15 borders → 0)
- [x] `/checkout/error`
- [x] `/heritage/[slug]` (13 borders → 0)
- [x] `/virtual-begena`

### Auth
- [x] `/login` (manuscript-frame card + recessed inputs)
- [x] `/register`
- [x] `/forgot-password`
- [x] `/reset-password`

## Phase 5 — Shared components ✅

- [x] `Navbar.tsx` — Sign In / Sign Up use `btn-ghost-strong` / `btn-primary-strong`; navButtonClass no longer carries a `border`
- [x] User menu trigger uses `btn-ghost-strong`
- [x] `Skeleton.tsx` — `CardSkeleton` + `ClassCardSkeleton` use `.tonal-lift`
- [x] `Pagination.tsx` — prev/next/inactive pages use `.btn-ghost-strong`

## Phase 6 — Admin & teacher ✅

- [x] Graceful degradation only — `--color-border` reduced to opacity 0.12 means existing admin/teacher `border border-border` usages render as faint hairlines; no visible regression
- [x] Earlier-shipped `.interactive-row`, `.tab-pill--active`, `.btn-*-strong` utilities continue to work
- [x] Did NOT rebuild admin/teacher (per scope: user-facing first)

## Phase 7 — Playwright verification ✅

- [x] Launched browser at 1280×900
- [x] Captured `/` (hero + full page)
- [x] Captured `/login`
- [x] Captured `/classes`
- [x] Captured `/branches`
- [x] Console errors confirmed unrelated to theme (401s for logged-out session)

## Phase 8 — Cleanup ✅

- [x] Final server typecheck: clean
- [x] Final client typecheck: clean
- [x] All checklist items marked
- [x] No leftover `border border-border` in user-facing pages (admin pages intentionally untouched)

---

## Files touched (summary)

**New:**
- `client/src/components/icons/ethiopian/` (8 components + index)
- `docs/theme-proposal.md`, `theme-preview.html`, `theme-implementation-checklist.md`
- `client/public/design-refs/README.md` (folder for reference images)

**Modified — globals + landing:**
- `client/src/app/globals.css` (new palette + utilities)
- `client/src/app/page.tsx` (Manuscript Frame + Trinity Cards)

**Modified — user-facing pages:**
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/student/*`
- `/dashboard/*`, `/account/orders`
- `/classes`, `/store/[id]`, `/cart`, `/checkout`, `/branches`, `/heritage/[slug]`, `/virtual-begena`
- Error boundaries: `/student/error`, `/dashboard/error`, `/checkout/error`

**Modified — shared:**
- `components/layout/Navbar.tsx`
- `components/ui/Skeleton.tsx`
- `components/ui/Pagination.tsx`
