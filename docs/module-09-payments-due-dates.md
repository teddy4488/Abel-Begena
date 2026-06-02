# Module 9 — Payments & Due-Dates (manual v1, consumption-based)

**Status:** Planned · **Depends on:** M2 (auth), M4 (orders), M5 (class/tuition), M6 (enrollment & conversion), M7 (attendance)
**Decision baseline:** Payments are **manual** for v1 — receipt-upload + admin-approval. No payment gateway.

> **Central reframe (this module):** billing is **consumption-based and admin-decided, not calendar-automatic.** A student owes a *full* monthly fee for any ~monthly window in which they actually showed up; long no-show gaps are skipped (not billed). The system **suggests**; the desk admin decides whether to bill, waive, or defer. This replaces the broken `registrationStartDate + N×30 days` auto-schedule.

---

## 1. How it works today

Two subsystems meet at the approval step.

### A) `PaymentRequest` — the approval inbox (`/payments`, `server/src/payment/`)
A generic pending-approval queue for three `type`s: `enrollment`, `order`, `student_monthly_fee`. User uploads a receipt → `pending` request → admin approves/rejects → type-specific side effects (activate enrollment + convert user→student; mark order paid / reserve stock; record `StudentPayment`). Approval → email + notification; rejection → email.

### B) `StudentPayment` — the monthly tuition ledger (`/attendance/billing`, `attendance.service.ts`)
Per-student record. **Today** it computes a 30-day rolling schedule from `registrationStartDate` (`period N due = reg + N×30 days`), which charges for elapsed calendar time regardless of attendance. The persisted `duedate`/`dueDates` array is a half-finished rename (schema is `dueDates`, the create path writes `duedate` → silently dropped; readers are split) — vestigial because every read recomputes from registration.

### Curriculum & progress (already handled — no new build)
- **Lessons** (`InstrumentLesson`, per class, ordered) = the songs. Full CRUD at `/attendance/lessons`.
- **Attendance** captures `(participant, sessionDate, lessonId, revisedLessonId, status)` per session.
- **Progress** is derived by `getLessonProgressForStudentInClass` (completed vs total lessons). Spending several sessions on one song = multiple attendance rows for one `lessonId`. The ቅኝት grouping above songs is not a separate entity (organizational only) and is out of scope.

---

## 2. Decisions (this module)

| Topic | Decision |
|---|---|
| **Billing basis** | **Consumption-based, admin-decided.** Periods advance by attendance windows, not the calendar. Idle stretches are free. The computed state is **advisory** — never auto-charges. |
| **Period = full fee** | Showing up **at all** in a window (e.g. 5 of ~12 sessions) owes the **full** month fee. Attendance count does not pro-rate the fee. |
| **The pause** | A window with **no** attendance (≈3 weeks–a month of no-shows) is **skipped** — not billed. Billing resumes at the next window the student actually attends. |
| **Admin discretion** | The desk admin can **bill, waive, defer, or override** any period. The system suggests; it does not enforce. |
| **Window cap** | Soft cap at `ceil(programDurationMonths × 1.5)` **active** windows. Surfaced as a prominent warning + re-enroll prompt; admin can override. |
| **Completion** | Derived from existing **lesson-progress** (all lessons attended) — not time. |
| **Schedule model** | Drop the persisted `duedate`/`dueDates` array; compute billing state on the fly; track settlement by `period`. |
| **Atomicity** | Compensating repair + admin alerts (no Mongo transaction dependency) + retry endpoint. |
| **Features** | Admin payment ledger, expected-fee validation, partial/advance payments, receipt inline preview. |
| **Gateway** | Manual only. |

---

## 3. The billing model (attendance-window, admin-decided)

A billing period is an **active ~30-day window**, anchored to the registration (approval) date and rolling forward — but **empty windows are skipped**. Attending *at all* in a window owes one full fee. The result is **advisory**: the admin reviews it and records/waives at their discretion.

```
PERIOD_DAYS = 30                                       // configurable (PAYMENT_PERIOD_DAYS)
sessions    = StudentAttendance(status ∈ {present, late}), sorted by sessionDate asc
              // excused/absent are NOT attendance — they never make a window billable

// Walk the sessions; open a new period at the first session at/after the current window's end.
periodsConsumed = 0
windowEnd = registrationStartDate            // period 1 measured "from the approval date"
for d in sessions:
  if d >= windowEnd:                         // this session opens a new active window
    periodsConsumed += 1
    windowEnd = d + PERIOD_DAYS
  // sessions inside an open window belong to it (partial attendance → still ONE full-fee period)

periodsConsumedEff = clamp(periodsConsumed + periodAdjustment, 0, maxBillable)  // admin override
periodsSettled = count of StudentPayment rows with status ∈ {paid, waived}      // covered periods
suggestedOwed  = max(0, periodsConsumedEff − periodsSettled)                    // ADVISORY only
maxBillable    = ceil(programDurationMonths × 1.5)                              // 6 → 9
windowExceeded = periodsConsumed > maxBillable                                  // warn + re-enroll
```

**Worked example** (6-month package, approved Jan 1):
- Jan: attends 5 sessions → window 1 active → **owes full month 1**.
- Feb: attends → window 2 active → **owes month 2**.
- Mar–Apr: **no attendance** → those windows are skipped, **not billed**.
- May: returns and attends → window 3 active → **owes month 3** (pays "the 3rd month", not the gap).

Key properties:
- **Attend 5 of ~12 → full fee** (partial attendance never pro-rates).
- **A fully-empty window is the only thing that's free** — a 3-week gap that still has a session at either end of the month is part of that active month and is billed.
- **Idle time is invisible** to billing; the window cap counts only active windows.
- **Nothing auto-charges.** `suggestedOwed`/`overdue` are indicators; the admin records payments or waives.
- Display-only: `expectedSessionsPerPeriod ≈ round(learningDaysPerWeek × WEEKS_PER_MONTH)` (WEEKS_PER_MONTH default 4) to show "attended X of ~Y this month" — informational, never billing math.

**Admin discretion mechanisms:**
- `periodAdjustment` (signed int on participant) — correct the consumed count when attendance is imperfect.
- **Waive** a period — record a `StudentPayment` with `status: 'waived'` (amount 0) so it counts as settled but not paid; excluded from `suggestedOwed`.
- Record a normal `paid` payment (existing flow). Doing nothing simply leaves the period as suggested-owed.
- Student-facing reminders are **not** auto-dunned: the cron produces an **admin digest** of suggested-owed students; emailing a student is an admin-triggered action (or a per-student `autoReminders` flag, default off).

---

## 4. Fixes (blockers & majors)

### F1 — [BLOCKER] Replace the calendar schedule with the attendance-window model
- Drop `dueDates` array prop + its indexes from `student-payment.schema.ts`; drop `duedate?: string[]` from the DTO. Keep `period`, scalar `dueDate?` (display = window start), `paidToDate?`.
- `StudentPayment.status` enum → `['paid', 'unpaid', 'waived']`.
- Add `computeBillingState(participant)` implementing §3 → `{ periodsConsumed, periodsConsumedEff, periodsSettled, suggestedOwed, overdue, maxBillable, windowExceeded, expectedSessionsPerPeriod, currentWindowAttended }`.
- Rewrite `recordStudentPayment` to key on `period` (auto = next unsettled period if absent); support `waived`; no array building.
- Rewrite all readers — `getOverduePayments`, `getUpcomingPayments(ForAllStudents)`, `getNextUnpaidDueDateInMonthYear`, `isPaymentOverdue` — onto `computeBillingState`. "Overdue" everywhere means `suggestedOwed > 0`, framed as advisory.
- Add `monthlyFee?: number`, `periodAdjustment?: number`, `autoReminders?: boolean` to `StudentAttendanceParticipant`.

### F2 — [BLOCKER/security] Validate payment-request bodies
`@Body() dto: Omit<CreatePaymentRequestDto,'userId'>` / `Omit<UpdatePaymentStatusDto,'id'>` strips class-validator metadata → ValidationPipe is skipped. Add concrete `CreatePaymentRequestBodyDto` (no `userId`) and `UpdatePaymentStatusBodyDto` (no `id`); wire into the controller so validation runs.

### F3 — [MAJOR] Admin payment history endpoint
`getAll` ignores `status`. Add `listRequests({ status?, type?, from?, to?, q? })` for `pending|approved|rejected|all` + type + date range + search, paginated, newest first. Keep `listPending` for the inbox.

### F4 — [MAJOR] Expected-fee validation & end the silent-drop
Student submits arbitrary `amount`; approval writes it verbatim; `min:2000` made sub-2000 writes throw → swallowed → "approved" with no ledger row.
- Drop `min:2000` → `min:0` (F5).
- Capture class `tuition` → `participant.monthlyFee` at conversion.
- On submit + approval, compare `amount` vs `monthlyFee` → classify `full | partial | overpaid`; never silently drop; surface expected-vs-submitted in the approval card.

### F5 — [MINOR] Remove hardcoded `min:2000` amount floor → `min:0`.

### F6 — [MINOR] DB-level idempotency
Partial unique index on `PaymentRequest` over `{ userId, type, targetId }` where `status === 'pending'`.

### F7 — [POLISH] Compensating repair on approval
Each side effect wrapped; on any failure create an admin notification (extend the conversion-failure pattern to enrollment/order/ledger). Add `POST /payments/:id/retry-side-effects` (Admin), idempotent.

### F8 — [MAJOR] Window cap as an admin-overridable warning
When `windowExceeded` (periodsConsumed > `ceil(nominal×1.5)`), surface a prominent flag in admin billing + a re-enroll prompt and stop *auto-suggesting* further periods. It is **not** a hard block — the admin may still record a payment or trigger re-enrollment (ties to the M6 re-enrollment follow-up).

---

## 5. Features (approved additions)

### V1 — Admin payment ledger
History view (F3): status/type/date filters, search, revenue totals, **CSV export**. Mirrors attendance/orders admin tables.

### V2 — Expected-fee validation & surfacing
Approval card shows expected vs submitted, mismatch badge, classification (full/partial/overpaid). Admin may still approve with a note.

### V3 — Partial / advance payments
> Note: this is about partial **payment of the fee**, not partial attendance. Partial *attendance* (5 of 12) still owes the full fee (§3).
- **Partial payment:** `amount < monthlyFee` → track `paidToDate` on the period; the period stays unsettled (not counted in `periodsSettled`) until covered; "partial (Y/X)" indicator.
- **Advance:** pay several upcoming periods at once → those periods become `paid` ahead of consumption (`periodsSettled` can exceed `periodsConsumed`; `suggestedOwed = 0`).

### V4 — Receipt inline preview
Render `receiptUrl` inline in the admin approval card (image thumbnail + lightbox; PDF embed/link).

---

## 6. Implementation steps

**Server**
1. `student-attendance-participant.schema.ts` — add `monthlyFee?`, `periodAdjustment?`, `autoReminders?`.
2. `student-payment.schema.ts` — drop `dueDates` array + array indexes; `amount` `min:0`; `status` enum `+ 'waived'`; keep `period`, scalar `dueDate`, `paidToDate?`.
3. Conversion — capture class `tuition` → `participant.monthlyFee` in `convertUserToStudent` / admin register.
4. `student-payment.dto.ts` — remove `duedate?: string[]`; add `waived` status, partial/advance + period fields.
5. `attendance.service.ts` — add `computeBillingState` (attendance-window walk); rewrite `recordStudentPayment` (period-based, waive, partial/advance, fee classification) + all readers; attendance count uses present/late only.
6. `payment/dto/` — `CreatePaymentRequestBodyDto`, `UpdatePaymentStatusBodyDto`; wire into controller.
7. `payment.service.ts` — `listRequests(filters)`; expected-fee comparison; compensating-repair alerts; `retrySideEffects`.
8. `payment.controller.ts` — `GET /payments` honors status/type/date/q; `POST /payments/:id/retry-side-effects`; waive endpoint (or `status:'waived'` via `billing/pay`).
9. `payment-request.schema.ts` — partial unique pending index.
10. `payment-reminder.service.ts` — overdue/due-soon recompute via `computeBillingState`; switch to **admin digest** + per-student `autoReminders` gate instead of auto-dunning.

**Client**
11. `paymentApi.ts` / `attendanceApi.ts` — history params; retry mutation; fee/period/billing-state fields; waive.
12. Admin payments page — ledger filters, totals, CSV, receipt preview, expected-vs-submitted, retry, window warning.
13. Admin monthly-payments page — **billing-state card** (active periods consumed, settled, suggested-owed, attended X/~Y this month); **bill / waive / adjust** controls; partial/advance recording.
14. Student payments page — "you owe N month(s) for instruction received" card (consumption-based, not a calendar date); partial/credit reflected.

**Verify**
15. `tsc` + `nest build` (server); `tsc` + `next build` (client). Update `READINESS_REPORT.md` Module 9 → Done.

---

## 7. Verification checklist
- [ ] Attend 5 of ~12 in a window → **full** month fee suggested (not pro-rated).
- [ ] Attend in Jan & Feb, no-show Mar–Apr, return May → suggested-owed advances to month 3 on return; **Mar–Apr never billed**.
- [ ] A 3-week gap that still has a session within the active month → that month is billed (not skipped).
- [ ] Nothing is auto-charged; billing state is advisory; admin records/ waives explicitly.
- [ ] Admin **waive** marks a period settled (status `waived`) and removes it from suggested-owed.
- [ ] Admin **period override** (`periodAdjustment`) shifts consumed count; reflected in suggested-owed.
- [ ] **Advance** payment makes `periodsSettled > periodsConsumed`; suggested-owed = 0.
- [ ] **Partial** payment tracks `paidToDate`; period stays unsettled until covered.
- [ ] Window cap past `ceil(nominal×1.5)` active windows → warning + re-enroll prompt; admin can override (no hard block).
- [ ] No `duedate`/`dueDates` array remains; rows persist `period` (+ optional display `dueDate`).
- [ ] Sub-2000 tuition records successfully; no silent drop on approval.
- [ ] Invalid payment-request bodies (bad `type`/`status`/`amount`) rejected by validation.
- [ ] Admin can list/filter/search approved & rejected history; CSV export.
- [ ] Receipt renders inline.
- [ ] Concurrent duplicate pending submits → one pending row.
- [ ] Reminders are admin-digest / admin-triggered, not auto-dunned; respect `autoReminders`.
- [ ] Forced side-effect failure on approval notifies admins; retry reconciles.
- [ ] Both builds clean.
