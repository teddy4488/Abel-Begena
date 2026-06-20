# Abel Begena — Delivery Readiness Report & Work Plan

**Audit date:** 2026-05-31 · **Audited commit:** `6d4f942` (origin/main) · **Status:** Living document — check items off as fixed.

> Partition strategy: the project is split into **modules ordered by independence**. Modules that depend on little (and that everything else sits on) are fixed first; modules that depend on many others are fixed last. Within the LMS the order follows the internal dependency chain (class → enrollment → attendance → live).

**Decision log**
- **Payments = manual for v1.** No Chapa/Telebirr/Stripe gateway. We harden the existing receipt-upload + admin-approval flow only.
- **Sidelined reference work:** local branch `sidelined/local-attendance-payment` (`cdfde1c`) holds the user's intentional **30-day rolling payment schedule** design. Use as reference for Module 9. Diff with `git diff main sidelined/local-attendance-payment -- <path>`.

---

## Scorecard (at audit time)

| # | Module | Verdict | Blockers |
|---|---|---|---|
| 1 | Platform & Security Hardening | 🟡 Pending operator actions | 1 |
| 2 | Identity & Access (Auth/RBAC/Users) | 🟢 Done | 0 |
| 3 | Content & Landing | 🟢 Done | 0 |
| 4 | E-commerce | 🟢 Done (+9 features) | 0 |
| 5 | Class Management (Packages) | 🟢 Done | 0 |
| 6 | Enrollment & Student Lifecycle | 🟢 Done | 0 |
| 7 | Attendance & Materials | 🟢 Done (+features) | 0 |
| 8 | Live Classes / Realtime | 🟢 Done (+features) | 0 |
| 9 | Payments & Due-Dates (manual v1) | 🟢 Done (consumption-based) | 0 |
| 10 | UI / Theme | 🟢 Done (audit + surface pass) | 0 |
| 11 | Deploy & Release Readiness | 🔴 Major work | 0 |

**Total blockers: 11.** Most are small (S) fixes.

---

## Execution order & module breakdown

### Module 1 — Platform & Security Hardening  *(foundation; depends on nothing)*
Bootstrap, config, secrets, error handling, dependency health. Everything sits on this.
- [ ] **[BLOCKER]** ⚠️ OPERATOR ACTION: Rotate & remove live prod secrets from `server/.env` (Atlas pw, Cloudinary secret, JWT key). Move to host env only. Treat as compromised. See `docs/module-01-platform-hardening.md` → Operator actions.
- [x] **[BLOCKER]** Guard `seed.ts` — refuses when `NODE_ENV=production`; `--force-drop` flag required to wipe collections; `password123` replaced with `SEED_ADMIN_PASSWORD` env var (`server/seed.ts`). ✅
- [x] **[BLOCKER]** Remediated 93 npm vulns → **5 moderate remaining** (0 critical, 0 high). Remaining 5 are in `nodemailer`/`@nestjs-modules/mailer` chain and require breaking-change upgrade — deferred. ✅
- [x] **[MAJOR]** Global exception filter created (`server/src/common/filters/http-exception.filter.ts`) — normalizes errors, suppresses stack traces in prod. ✅
- [ ] **[MAJOR]** ⚠️ OPERATOR ACTION: Set `NODE_ENV=production` + `FRONTEND_URI` + `EMAIL_*` on Render. Cross-site auth cookies will fail without this.
- [x] **[MAJOR]** Swagger default changed to OFF (`ENABLE_SWAGGER ?? 'false'` in `server/src/main.ts`). ✅
- [x] **[MAJOR]** JWT_SECRET startup validation added to `server/src/main.ts` — fails fast in production if missing or insecure. ✅
- [ ] **[MINOR]** Mongo connection error handling + health check; fail fast if `MONGO_URI` unset — `src/app.module.ts:45-53`. *(deferred to M11)*
- [x] **[POLISH]** `next.config.ts`: Cloudinary host added, `example.com` removed. ✅
- [ ] **[MINOR]** (Scaling) Redis-backed throttler/cache — defer unless multi-instance.

> **Note:** `nodemailer@7` is installed but `@nestjs-modules/mailer@2.3.6` requires `nodemailer>=8.0.5`. This peer-dep mismatch means `npm install` needs `--legacy-peer-deps`. Track for M11 (deploy hardening) — the mailer still functions.

### Module 2 — Identity & Access  *(depends on M1; everything else trusts this)*
Auth, RBAC, users, roles, SuperAdmin, account flows.
- [x] **[BLOCKER]** `isVerified` bypass in register DTO — intentional dev accommodation (email unavailable on Render); gated by `EXPOSE_DEV_CODES=true` env flag. ✅
- [x] **[BLOCKER]** Block Admin→SuperAdmin escalation — `role`/`branchId`/`branchIds` stripped from `PATCH /users/:id`. ✅
- [x] **[BLOCKER]** Fix throttler units — login: 5 attempts/5 min; refresh: 20/min (was 60ms). ✅
- [x] **[MAJOR]** Reject login when `isActive===false`; refresh also checks isActive live from DB. ✅
- [x] **[MAJOR]** `SuperAdminGuard` applied to teacher creation (`POST /admin/teachers`). ✅
- [x] **[MAJOR]** `'development_secret'` JWT fallback removed (now empty string → fails); startup check already in `main.ts`. ✅
- [x] **[MAJOR]** Access token removed from `localStorage` persistence; httpOnly cookie is the auth source of truth. ✅
- [x] **[MINOR]** Next.js `middleware.ts` created — protects `/admin`,`/superadmin`,`/teacher`,`/student`,`/dashboard`,`/profile`,`/account`,`/cart`,`/checkout`,`/live`. ✅
- [x] **[MINOR]** Dev codes now gated by `EXPOSE_DEV_CODES=true` env var (not `NODE_ENV!==production`). ✅
- [x] **[MINOR]** Password minimum raised to 8 chars across all DTOs. ✅
- [x] **[MINOR]** On refresh, `role`/`isActive` re-read from DB (live role takes effect immediately). ✅
- [x] **[POLISH]** Refresh tokens cleared on password reset and change password. ✅
- [x] **[SCHEMA]** Teacher `branchIds: ObjectId[]` added — SuperAdmin assigns, at least one required at creation. ✅
- [x] **[INFRA]** `@nestjs/websockets@11.1.9` added as explicit dep (was missing after M1 audit fix); TS7056 inference errors fixed with explicit return type annotations. ✅

### Module 3 — Content & Landing  *(independent vertical; healthiest)*
Blog, FAQ, branches/maps, heritage, virtual begena, i18n, homepage, uploads, mail, audit.
- [x] **[MAJOR]** Blog manage list scoped to own posts for Teachers (was showing all teachers' drafts). ✅
- [x] **[MAJOR]** Notification bell + client API — feature was server-only; now visible in navbar with unread badge and dropdown. ✅
- [x] **[MAJOR]** Audit log page built — was a redirect; now a full SuperAdmin table with filters, pagination, CSV export. ✅
- [x] **[MINOR]** Comments now default to `pending` (was auto-approved); "reviewed before publishing" copy now accurate. ✅
- [x] **[MINOR]** Leaflet markers fixed with `divIcon` in both `BranchesPublicMap` and `BranchAdminMap`. ✅
- [x] **[MINOR]** 26 missing AM keys added; 2 orphan AM keys removed — EN/AM parity at 1005 keys. ✅
- [x] **[MINOR]** Multer stream-level `fileSize` limits added to: blog upload-image, avatar (×2), product image, materials, class materials. ✅
- [x] **[MINOR]** `@AuditLog` added to blog create/update/delete, comment status, FAQ create/update/delete, branch create/update/delete. ✅
- [x] **[POLISH]** Audit logs restricted to SuperAdmin only (was any Admin). ✅
- [ ] **[POLISH]** Mail startup `transporter.verify()` — deferred to Module 11 (deploy readiness).

### Module 4 — E-commerce  *(independent vertical; depends on M1/M2 + uploads)*
Products, cart, checkout, orders, admin store. **Full plan: `docs/module-04-ecommerce.md`.**

**Fixes**
- [x] **[BLOCKER]** Ownership check on `GET /orders/:id` — non-admins can only read their own orders (IDOR closed). ✅
- [x] **[BLOCKER]** Stock restored on order cancel + payment rejection, guarded by `isStockReserved()` (PENDING/PROCESSING/SHIPPED/DELIVERED). ✅
- [x] **[MAJOR]** `Teacher` removed from product-create (Admin-only). ✅
- [x] **[MAJOR]** Cart validates projected total (existing + delta) vs stock. ✅
- [x] **[MAJOR]** Atomic conditional stock decrement (`findOneAndUpdate` + `$inc`, race-free). ✅
- [x] **[MAJOR]** Currency standardized to ETB (store listing, detail, admin store). ✅
- [x] **[MINOR]** Owner-scoped cancel (`POST /orders/:id/cancel`) for Pending/PaymentPending. ✅
- [x] **[MINOR]** Product detail: qty clamped to stock, out-of-stock disables Add to Cart + badge. ✅
- [x] **[MINOR]** `productName` snapshot on order item at checkout. ✅
- [x] **[POLISH]** Admin low-stock stat uses per-product `lowStockThreshold`. ✅

**New features (approved additions)**
- [x] Product search + instrument-type filter + pagination (server-side). ✅
- [x] Long-form product `description` field (schema + admin form + detail page). ✅
- [x] Checkout "contact us for shipping" note on Delivery. ✅
- [x] Order tracking number + carrier (admin sets on ship; customer sees it). ✅
- [x] Customer-initiated order cancellation (with stock release). ✅
- [x] Image management — delete + reorder via `PATCH /products/:id/images`. ✅
- [x] Low-stock admin notification (crossing-threshold only; checkout + payment approval). ✅
- [x] Product pagination (store listing). ✅
- [x] Related products on product detail page. ✅

**Verified:** server `tsc` + `nest build` clean; client `tsc` + `next build` clean.

### Module 5 — Class Management (Packages)  *(base of the LMS chain; depends on M2)*
Reframed: a class is a **package** (instrument + duration); students self-pace; scheduling is per-student time slots. **Full plan: `docs/module-05-class-management.md`.**
- [x] **[BLOCKER→reframed]** Capacity caps dropped by design (self-paced packages). Replaced with an **admin day-occupancy visualization** (students-in-session per 30-min bucket, 08:00–19:30, branch/instrument filters). ✅
- [x] **[MAJOR]** Multi-teacher built fully — `ClassOwnerGuard` + `getAccessPayload` honor `instructorId`/`primaryInstructorId`/`teacherIds` via shared `userMatchesClassTeacher`; admin form has a multi-teacher picker with primary designation. ✅
- [x] **[MAJOR]** Teacher↔branch: assigned users must be Teachers (hard reject); out-of-branch assignment allowed with a **warning** surfaced in the UI. ✅
- [x] **[MINOR]** `getPublicCatalog` now excludes soft-deleted; returns `durationMonths` + `sessionsPerWeek`. ✅
- [x] **[SCHEMA]** `Class.durationMonths` (3/6/9); `Enrollment.timeSlots[{day,startTime}]`; sessions/week derived (3→5, 6→3, 9→2). ✅
- [x] **[SCHEDULE]** Per-day time slots (1.5h sessions, 08:00–18:00 start) captured + validated in both enrollment flows (become-student + classes page). ✅
- [ ] **[DEBT]** `class.service.spec.ts` is a stale stub (missing PaymentService/EnrollmentService/UserService providers) — pre-existing, fix when test suite is revisited.

> **Note:** the class-level `schedule` (ClassSession[]) is now secondary to per-student time slots; the old "instructor-wide schedule conflict" minor is moot under the self-paced model.

### Module 6 — Enrollment & Student Lifecycle  *(depends on M5 + M2)*
Enroll, user→student conversion, access gating, lifecycle. **Full plan: `docs/module-06-enrollment-student-lifecycle.md`.**
- [x] **[BLOCKER]** Convert endpoint secured — `POST /attendance/students/convert/:userId` is now **Admin-only** + targets a userId (manual recovery tool). Self-conversion is impossible. ✅
- [x] **[SCHEMA]** `StudentParticipant` carries `timeSlots` + `completionStatus`/`completedAt`. ✅
- [x] **[MAJOR]** Occupancy refactored to read from active **participants** (not enrollments) — admin-registered walk-in students are now counted too. ✅
- [x] **[FEATURE]** Student → User **revert** (admin-only): soft-deletes the participant (history preserved), flips role to User, withdraws active enrollments; reasons `completed`/`withdrawn`/`dropped`; "Past students" admin view. ✅
- [x] **[CONSISTENCY]** `timeSlots` flow end-to-end: self-service (via `conversionData`) + admin registration both persist them; shared schedule-validation helper used by convert/register. ✅
- [x] **[ROBUSTNESS]** Conversion failure after payment approval now notifies admins (was a silent log). ✅
- [ ] **[FOLLOW-UP/M9]** Re-enrollment of a reverted user into a new package (fresh participant + monthly billing). 
- [ ] **[FOLLOW-UP]** Client participant-edit screen to adjust `timeSlots` later (server endpoint already accepts them; no edit UI exists today).

### Module 7 — Attendance & Materials  *(depends on M5 + M6)*
Attendance recording, lessons, materials/progress. **Full plan: `docs/module-07-attendance-materials.md`.**
- [x] **[BLOCKER]** `POST /materials/upload` now ownership-checked — a Teacher can only upload to classes they teach (multi-teacher aware); Admin unrestricted. ✅
- [x] **[MAJOR]** Auto-absence (which silently failed schema validation) removed; replaced with an **admin no-show review** — list per date, individual + **mass** mark-absent / revert. ✅
- [x] **[MAJOR]** Attendance is now correctable: **date-aware upsert** recording (override an absence; backfill past dates, no future), explicit **edit/delete**; denormalized `classId`; optional `lessonId`/`recordedBy`; `note`. `missedLessonsCount` kept consistent across all transitions. ✅
- [x] **[FEATURE]** **Video** material support (mp4/webm/mov, 100MB cap, `fileType: video`). ✅
- [x] **[FEATURE]** Closed-days (admin CRUD; no-shows suppressed on closed days). ✅
- [x] **[FEATURE]** Attendance **summary stats** (rate %, counts) endpoint + student view shows absent count. ✅
- [x] **[FEATURE]** Attendance **CSV export** (admin). ✅
- [x] **[FEATURE]** **Absence notifications** to students (in-app) on every absent record. ✅
- [x] **[UI]** Admin daily attendance: date + note + absent status on the record form; embedded **No-show Review** panel (mass actions, closed-days, export). ✅
- [x] Recording stays **Admin-only** (teachers don't record). ✅

### Module 8 — Live Classes / Realtime  *(depends on M5 + M6)*
WebRTC live rooms, sockets, chat. **Full plan: `docs/module-08-live-classes.md`.**

**Fixes**
- [x] **[BLOCKER]** Socket handshake authenticated via JWT (`access_token` cookie, `auth.token` fallback). `userId`/`role`/`displayName` derived server-side from the token + DB; client-supplied identity in `join-room` is ignored. Unauthenticated sockets are disconnected (`live.gateway.ts` `handleConnection`/`handleJoinRoom`). ✅
- [x] **[BLOCKER]** Access control on join: admins + multi-teacher-aware instructors allowed; students must be **actively enrolled** (`isUserAllowedInClass` using `userMatchesClassTeacher`). ✅
- [x] **[POLISH]** Chat sender always derived from the authenticated socket; client emits message text only; messages capped at 2000 chars, history at 200 entries (`handleChat`). ✅

**New features (approved additions)**
- [x] **Pre-join lobby** — camera/mic preview, device pickers (`enumerateDevices`), permission-denied + no-device handling, mic/cam pre-toggle, "join without media" fallback (`PreJoinLobby.tsx`). ✅
- [x] **Host controls** — mute-one, mute-all (emit `force-mute`; client disables its own mic), and remove (`removed` + socket disconnect). Host-gated server-side via `client.data.isHost` (`handleHostAction`). ✅
- [x] **Raise hand** — students toggle; broadcast `hand-raised`; queue badge in People panel + per-tile hand indicator. ✅
- [x] **Screen sharing** (host) — `getDisplayMedia` + `simple-peer.replaceTrack`; auto-restores camera on share end. ✅
- [x] **Teacher-side recording** — `MediaRecorder` of the local stream; download or **save to class materials** (reuses M7 video upload). ✅
- [x] **Reliability** — reconnection (10 attempts, stale-peer drop + clean rejoin on reconnect), per-peer connection status on tiles, **active-speaker** highlight (WebAudio analyser), reconnection/removed banners. ✅
- [x] **'Class is live' notifications** — false→true `isLive` transition notifies all active-enrolled students in-app with a deep link (`class.service.updateLiveState` → `notifyClassLive`). ✅
- [x] TURN kept **code-ready** (`NEXT_PUBLIC_TURN_*` env hooks parsed into ICE servers); provisioning **deferred** (paid relay infra) to M11. ✅

**Verified:** server `tsc` + `nest build` clean; client `tsc` + `next build` clean.

### Module 9 — Payments & Due-Dates (manual v1, consumption-based)  *(depends on M2/M5/M6/M4/M7)*
Receipt-upload + admin-approval; **billing reframed to consumption-based** (pay per month of instruction actually attended, not the calendar). **Full plan: `docs/module-09-payments-due-dates.md`.**

**Reframe (domain-driven):** a billing period is an active ~30-day attendance window — attending at all in a window owes one full fee; long no-show gaps are skipped (free). Everything is **advisory**: the desk admin bills, waives, or defers. Curriculum/progress already modeled via lessons + attendance (no new build).

**Fixes**
- [x] **[BLOCKER]** Replaced the broken `duedate`/`dueDates` calendar schedule with `computeBillingState` (attendance-window walk). Dropped the persisted array + its indexes; billing keyed by `period`. All readers (`overdue`, `upcoming`, `next-unsettled`, `isOverdue`, report) rewritten onto it. ✅
- [x] **[BLOCKER/security]** Payment-request bodies now validated — concrete `CreatePaymentRequestBodyDto` / `UpdatePaymentStatusBodyDto` replace the `Omit<>` types that silently skipped `ValidationPipe`. ✅
- [x] **[MAJOR]** Admin payment history/filter — `GET /payments` honors `status (pending|approved|rejected|all)`, `type`, date range, text `q`; enriched with `expectedFee`. ✅
- [x] **[MAJOR]** Expected-fee captured on the participant (`monthlyFee`) at conversion; submitted-vs-expected surfaced; `min:2000` floor removed (`min:0`) — ends the silent-drop chain. ✅
- [x] **[MINOR]** Approval side effects refactored to compensating-repair: each effect wrapped, admins alerted on any failure, idempotent `POST /payments/:id/retry-side-effects` repair endpoint. ✅
- [x] **[MINOR]** DB-level idempotency: partial unique index on pending requests `{userId,type,targetId,conversionData}`. ✅
- [x] **[MAJOR]** Window guardrail — soft cap at `ceil(programDurationMonths × 1.5)` **consumed** months; surfaced as an admin warning (not a hard block). ✅

**New features (approved additions)**
- [x] Admin payment ledger — history filters + receipt **inline preview** (image/PDF) + expected-vs-submitted badge. ✅
- [x] Expected-fee validation & surfacing (full/partial/overpaid classification). ✅
- [x] **Partial** payments (`paidToDate`, auto-promote to paid) + **advance** payments (`coversPeriods`) + **waive** (status `waived`) + admin **period override** (`periodAdjustment`). ✅
- [x] Reminders are **admin-decided** — daily cron sends an admin digest + emails only opted-in students (`autoReminders`), no auto-dunning. ✅
- [x] Student "what you owe" card is consumption-based (months attended/paid/owed, this-month sessions), not a calendar date. ✅

**Cross-module corrections:** M6 conversion now captures `monthlyFee`; M7 attendance is the billing driver (present/late = consumed); reminder service reworked.

**Verified:** server `tsc` + `nest build` clean; client `tsc` + `next build` clean.

### Module 10 — UI / Theme  *(after functionality stable; user-driven)*

**Approach:** full codebase audit across four categories — mock values, backend-without-frontend, frontend-without-backend, and theme/table issues. Rule: if a backend feature does something meaningful, surface it. Admin sees everything; students see what's relevant to them.

**Audit findings addressed:**
- [x] **Admin payments** — added full `PaymentRequest` history tab (approved/rejected/all, date range search, paginated table with expected-vs-submitted, receipt link). Previously only the pending inbox was visible. ✅
- [x] **Admin monthly-payments** — wired `GET /attendance/payments/upcoming-summary` (was backend-only) to a "Due within 14 days" digest card; added loading skeletons for the billing table; added `autoReminders` badge on overdue rows. ✅
- [x] **Dashboard payments** — added consumption-based tuition card (`useGetMyBillingQuery`) for student users. Previously this page only showed enrollment + order receipts. ✅
- [x] **Admin reports — student** — created `admin/reports/student/[id]/page.tsx` with side-by-side attendance + payment report, CSV export, billing summary, and link from the admin users page student tab. ✅
- [x] **Admin users/students** — added `monthlyFee`, `periodAdjustment`, `autoReminders` edit form in a per-student billing modal; link to full student report. ✅
- [x] **API types** — updated `getStudentAttendanceReport` and `getStudentPaymentReport` return types to include all backend-returned fields (`presentCount`, `absentCount`, `lateCount`, `attendanceRate`, `billing`, `waivedCount`, `monthlyFee`); updated `Student` type with billing fields; added `getUpcomingPaymentsSummary` endpoint. ✅
- [x] **StudentPaymentsModal** — removed stale `duedate`/`dueDateInferred`/`receiptUrl` fields (dead code from the pre-M9 calendar model). ✅

**Confirmed fine, no action needed:**
- Analytics page: fully real-data-backed, no hardcoded values.
- Occupancy visualizer: tabbed into the classes admin page.
- Audit logs: full admin page exists.
- Currency formatting: consistent ETB via `Intl.NumberFormat` across all pages.

**Verified:** client `tsc` + `next build` clean.

---

## API Integration Test Pass (2026-06-04)

Before opening up the UI for manual testing, a 10-phase integration test suite was run against every major endpoint in the order a real user/admin would hit them. **85/85 tests passed.** Several real backend bugs surfaced during the test development and were fixed:

| Bug | Fix |
|---|---|
| `POST /auth/register` returned 500 on duplicate email (Mongo E11000 not translated) | Catch E11000 in `UserService.create` → `ConflictException` |
| `GET /users/me` returned 500 (no `/me` route; `/:id` caught "me" and ObjectId-cast it) | Added `/users/me` alias route before `/:id` |
| `POST /auth/refresh` immediately after login raced the refresh-token DB write (fire-and-forget `void` persist) | `await persistRefreshToken` in the login handler |
| `BlogService.assertCanModify` only allowed role `'Admin'`, not `'SuperAdmin'` — SuperAdmin couldn't publish teacher posts | Added `SuperAdmin` to the allow check (in two places) |
| `generateAttendanceNumber` returned `'1'` when last number was non-numeric (e.g. `'STD-1001'`) causing E11000 on duplicate `'1'` already in DB | Rewrote to extract trailing digits from all participants + collision-retry loop |
| Stale Mongo unique index `participantId_1_month_1_year_1` on `studentpayments` (relic from pre-Module-9 calendar model) blocked monthly fee approvals with `paid` status | Dropped the stale index — Module 9 already uses `participantId_1_period_1` |
| Login throttle (`@Throttle({limit:5, ttl:300_000})`) hardcoded with no env override | Added `AUTH_LOGIN_THROTTLE_LIMIT`/`AUTH_LOGIN_THROTTLE_TTL_MS` env knobs + `DISABLE_AUTH_THROTTLE` for tests; dotenv loaded at module level so values apply at decorator-evaluation time |

**Test coverage by phase:**
1. Public endpoints (5/5) — `/faq`, `/branches`, `/classes/public`, `/blog`, unauthenticated 401
2. Auth flows (12/12) — register, duplicate check, weak password, login (3 roles), session, profile, `/me` alias, refresh, auto-verify
3. Admin data setup (17/17) — branches, teachers, classes, lessons (CRUD), products (CRUD), FAQ (CRUD), blog (teacher draft → admin publish → public read)
4. Enrollment flow (8/8) — student enroll → payment request → admin approve → user-to-student conversion → billing state initialized
5. Attendance & billing (10/10) — record attendance, lesson progress, overdue list, billing summary, upcoming, student reports, graduation eligibility
6. Monthly payment flow (7/7) — submit receipt, duplicate rejection, admin approve, billing settles, waive period, history filters
7. Store flow (9/9) — cart add, checkout, admin sees order, mark paid → shipped → delivered, customer sees delivered
8. Live class flow (4/4) — toggle live, student access, notifications, toggle off
9. Permission boundaries (6/6) — admin-only blocks student/teacher, unauthenticated rejection, role checks
10. Cleanup (7/7) — delete test entities, logout, session invalidation

### Module 11 — Deploy & Release Readiness  *(last; gates production cutover)*
- [ ] Reconcile deploy model (README: Vercel+Render vs PROJECT_IDEA: Docker+VPS). Pick one.
- [ ] Add deploy config (build/start) + minimal CI (lint, build, `npm audit`).
- [ ] Re-run `npm audit` after Module 1 fixes; confirm criticals/highs cleared.
- [ ] Full regression pass + final re-audit before handoff.

---

## Appendix — full per-domain audit findings
The detailed findings above are grouped by execution module. Original audit was performed across 6 domains: Auth/RBAC/Users, LMS Core, Payments, E-commerce, Content & Misc, Infra/Security/Config. Severity legend: **blocker** (must fix before delivery), **major** (delivery-quality), **minor**, **polish**.
