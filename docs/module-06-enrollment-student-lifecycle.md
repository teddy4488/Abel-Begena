# Module 6 — Enrollment & Student Lifecycle

## Purpose
Closes the privilege-escalation back door in the user→student conversion, and unifies the student schedule model so that **both** ways of becoming a student (self-service approval and admin direct registration) produce a complete, consistent student record — including the per-day time slots the occupancy visualization depends on.

## Background (how the lifecycle works today)
A "student" is two linked records: a **User** (`role: Student`, auth) and a **StudentAttendanceParticipant** (canonical school record: attendance number, instrument, duration, learning days, branch). They join on `participant.userId`. There are two doors into student status:
1. **Self-service:** User enrolls in a package → uploads receipt → admin approves the payment → `convertUserToStudent` runs (role→Student, participant created, first payment recorded).
2. **Admin direct registration:** `registerStudentParticipant` creates a new User + participant in one shot (for walk-ins).

The access gate is `Enrollment.status === 'active'`, which payment approval flips on.

## User stories (from PROJECT_IDEA.md)
- **U-004** As a user, I enroll in a class after I pay (auto-update enrollment status). — approval gating.
- **A-001 / A-002** As an admin, I manage users/students (activate/deactivate). — registration + lifecycle control.

## Decisions locked

| Topic | Decision |
|---|---|
| Convert endpoint security | `POST /attendance/students/convert` is **Admin-only** and operates on a **target `userId`** (manual recovery tool for when auto-conversion fails). It no longer uses the caller's own id, so a user can never self-convert. |
| Schedule source of truth | **`StudentParticipant` carries `timeSlots`** (day + time). It is the one record both registration paths create, so this makes the schedule consistent for every student. `Enrollment.timeSlots` (from Module 5) remains the enrollment-time snapshot. |
| Occupancy data source | The occupancy visualization (Module 5) is **refactored to read from active `StudentParticipant.timeSlots`** instead of `Enrollment.timeSlots` — so admin-registered walk-in students (who have no enrollment) are also counted. Same response shape; the chart UI is unchanged. |
| Conversion failure handling | If conversion fails *after* payment approval, notify all admins (in-app) instead of only logging — so the broken state is visible and recoverable via the manual convert tool. |
| Validation reuse | Extract the shared "days count vs duration / no-duplicate-days / branch-required / time-slot" validation into one helper used by convert + register. |
| Student → User revert | **In scope, admin-triggered only.** An admin reverts a student to `role: User` when they **finish their package** or **withdraw/drop** — choosing a reason (`completed` / `withdrawn` / `dropped`). The participant is **soft-deleted** (not removed) so all history is preserved. No automatic/scheduled reverts. |
| History preservation | On revert, the participant is soft-deleted with a `completionStatus` + `completedAt`; all linked attendance + payment records are left intact (they reference the soft-deleted participant). `User.studentProfile` is kept as a frozen historical snapshot. Admins get a "past students" view. |

## Schema changes

### `server/src/attendance/schemas/student-attendance-participant.schema.ts`
- Add `timeSlots?: { day: string; startTime: string }[]` (mirrors the Enrollment `TimeSlot` shape; reuse a shared sub-schema or redefine identically).
- Add `completionStatus?: 'active' | 'completed' | 'withdrawn' | 'dropped'` (default `active`).
- Add `completedAt?: Date` (set when reverted).
- (`deletedAt` already exists and is used for the soft delete.)

*(No other schema changes. `Enrollment.timeSlots` stays as-is.)*

## Step-by-step plan

### Step 1 — Secure the convert endpoint (BLOCKER)
**`attendance.controller.ts`**
- Change `POST /attendance/students/convert` →
  `POST /attendance/students/convert/:userId`, `@Roles('Admin')` + `RoleGuard` + `@AuditLog({ action: 'student_convert', resource: 'student_participant', resourceIdParam: 'userId' })`.
- Pass `req.params.userId` (target) to the service — **not** `req.user.sub`.

**`attendance.service.ts`**
- `convertUserToStudent(userId, dto)` already takes a `userId`; it now receives the admin-supplied target id. No signature change needed beyond the caller.

### Step 2 — `timeSlots` on the participant (schema + DTOs)
- **Schema:** add `timeSlots` to `StudentAttendanceParticipant` (Step above).
- **`convert-user-to-student.dto.ts`:** add an optional validated `timeSlots: TimeSlotDto[]` (day enum + `HH:mm` regex), matching the Module 5 enroll DTO.
- **`register-student-participant.dto.ts`:** add the same `timeSlots` field.

### Step 3 — Persist `timeSlots` in both conversion paths
- **`convertUserToStudent`:** after validating, write `timeSlots` onto the created participant (and validate via the shared helper: count == sessions/week, distinct days, times within 08:00–18:00).
- **`registerStudentParticipant`:** same — write `timeSlots` onto the participant.
- **`updateStudentParticipant`:** allow `timeSlots` to be edited (so admins can adjust a student's schedule later; occupancy reflects it).

### Step 4 — Carry `timeSlots` through payment-approval conversion
- **`class.service.enrollStudentWithReceipt`:** include `timeSlots` in the `conversionData` JSON payload so that when the admin approves, the conversion has the times. (The self-service enroll DTO already collects `timeSlots` from Module 5.)
- **`payment.service.updateStatus`:** no change needed — it passes the parsed `conversionData` straight to `convertUserToStudent`, which now reads `timeSlots`.

### Step 5 — Refactor occupancy to read from participants
- **`attendance.service`:** add `getDaySlots(day, { branchId, instrumentType })` that returns `{ studentId, startTime }[]` from **active, non-deleted `StudentParticipant`s** whose `timeSlots.day === day`, filtered by branch/instrument.
- **`class.service.getDayOccupancy`:** call the attendance version instead of `enrollmentService.getDaySlots`. (Keep the bucketing/`bySlot`/totals logic identical so the chart is unchanged.)
- Remove the now-unused `enrollmentService.getDaySlots` (or leave it; prefer remove to avoid drift).
- **Module dependency:** `ClassModule` already imports `AttendanceModule`, so `ClassService` can use `AttendanceService` (verify no circular-DI issue; use `forwardRef` if needed).

### Step 6 — Shared validation helper
- Extract `validateLearningSchedule({ programDurationMonths, preferredLearningDays, timeSlots, learningType, branchId })` into one place in `attendance.service` (or a small util). Use it in `convertUserToStudent`, `registerStudentParticipant`, and `updateStudentParticipant`. Enforces: days count == sessions/week, no duplicate days, branch required for physical, and (when provided) valid in-hours time slots whose days match `preferredLearningDays`.

### Step 7 — Surface conversion failures to admins
- **`payment.service.updateStatus`:** in the `catch` around `convertUserToStudent`, after logging, create a `NotificationService` notification (type `conversion_failed`) for admins with the userId + payment id, so the failed conversion is visible and can be retried via the manual convert tool. (PaymentService already injects `NotificationService`.)

### Step 8 — Client: admin direct-registration form gets per-day time pickers
- The admin "register student" form (in `admin/attendance` / wherever `registerStudentParticipant` is driven) currently collects `preferredLearningDays` only. Add a **per-day time picker** (reuse the Module 5 pattern: each selected day → a `08:00–18:00` time input), and submit `timeSlots`.
- Update the attendance API client types (`attendanceApi.ts`) to include `timeSlots` on the register + convert payloads, and change the convert mutation to the new `POST /attendance/students/convert/:userId` Admin shape (it's currently unused by any component, so this is a safe signature change).

### Step 9 — Client: participant edit
- Where admins edit a student participant, allow editing `timeSlots` (so schedules can be corrected). Surface the student's current schedule.

---

### Step 10 — Revert service (Student → User)  *(core)*
**`attendance.service.revertStudentToUser(userId, reason, actorId?)`** — `reason: 'completed' | 'withdrawn' | 'dropped'`:
1. Find the **active** participant (`userId`, `deletedAt: null`). If none, no-op (idempotent).
2. Soft-delete it: `isActive = false`, `deletedAt = now`, `completionStatus = reason`, `completedAt = now`.
3. Flip auth: `User.role → 'User'`. Keep `User.studentProfile` as a frozen snapshot (mark `studentProfile.isActive = false` if present).
4. Withdraw any still-active enrollments for this student (`status → withdrawn`) so the enrollment record reflects the exit.
5. **Leave all attendance + payment records untouched** — they reference the soft-deleted participant and are the history.
6. Audit-log the revert; optionally notify the user ("Your program is complete").

**Re-conversion support (small, belongs here):** in `convertUserToStudent`, change the "already a student" guard from `findOne({ userId })` to `findOne({ userId, deletedAt: null })`, so a reverted user can later be converted again into a **fresh** participant (the full re-enrollment flow itself is Module 9).

### Step 11 — Manual revert endpoint + history view (admin)
- **Manual action (the only trigger):** `POST /attendance/students/:userId/revert` (Admin-only, audited) with a `reason` body (`completed` / `withdrawn` / `dropped`). No automatic or scheduled reverts.
- **Past-students view:** an admin endpoint/list of soft-deleted participants (`deletedAt != null`) with their `completionStatus`/`completedAt`, so the history is browsable. Add a "Completed / Past students" tab or filter in the admin students UI; clicking a past student shows their preserved attendance + payment history.
- Ensure the payment-reminder job **skips** reverted/soft-deleted participants (verify its query already filters `isActive`/`deletedAt`).

### Step 12 — Client wiring for revert
- Admin students UI: a "Mark completed / Revert to user" action (with reason) on an active student; a "Past students" filter showing reverted ones (read-only history).
- `attendanceApi.ts`: add the revert mutation + past-students query; invalidate the students list on revert.

## Verification checklist

- [ ] A non-admin calling `POST /attendance/students/convert/:userId` gets **403** (was: any user could self-convert).
- [ ] An Admin can convert a specific user via the manual endpoint; it is audit-logged.
- [ ] Self-service enrollment → admin approves payment → user becomes Student with `timeSlots` on the participant.
- [ ] Admin direct registration captures per-day times; the new participant has `timeSlots`.
- [ ] The occupancy chart now includes **admin-registered** students (not just self-service enrollees).
- [ ] Editing a participant's `timeSlots` is reflected in the occupancy chart.
- [ ] Slot validation (count == sessions/week, distinct days, 08:00–18:00) is enforced consistently across convert/register/update.
- [ ] A forced conversion failure after approval produces an admin notification (not just a log line).
- [ ] No duplicate-student creation: converting an already-converted (active) user is rejected; a **reverted** user CAN be converted again into a fresh participant.
- [ ] Admin "Mark completed / Revert" action reverts the student to `role: User`, soft-deletes the participant with the chosen `completionStatus`, and is audited.
- [ ] Revert is **only** admin-triggered — there is no automatic or scheduled revert.
- [ ] After revert: all attendance + payment records still exist and are viewable in the "Past students" history; `User.studentProfile` snapshot is retained.
- [ ] A reverted student stops receiving payment reminders.
- [ ] `npx tsc --noEmit` passes in server/ and client/; both production builds pass.

## Known follow-ups (Module 9 — payments)
- **Re-enrollment of a reverted user into a new package** — creating a fresh participant + recording its first/monthly payments and due-date schedule. The revert mechanism here makes the user eligible; the re-enrollment + billing flow is finished in Module 9.
- Recording the per-enrollment first payment when an *already-active* student approves a second enrollment.

## Other follow-ups
- `register` vs `convert` still differ (User-creation vs role-flip); the shared validation helper reduces but doesn't eliminate duplication.
- Automatic completion *by curriculum progress* (all lessons done) instead of only by elapsed time — ties to Module 7 lesson progress.
