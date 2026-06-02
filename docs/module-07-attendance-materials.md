# Module 7 — Attendance & Materials

## Purpose
Fixes the materials-upload authorization hole, replaces the broken auto-absence job with an **admin-reviewed no-show flow**, makes attendance correctable and date-aware, and adds the standard attendance-platform capabilities (roster marking, summary stats, CSV export, absence notifications, closed-days) plus video material support.

## How it works today (context)
- **Lessons** (`InstrumentLesson`) form an ordered curriculum per class/package. Admins CRUD them.
- **Attendance** (`StudentAttendance`) records that a student attended a session and covered a `lessonId`, with a `status` (present/late/excused/absent). Recording is **Admin-only**.
- **Progress is derived**: a lesson is "completed" when the student has a present/late record for it; % = completed/total.
- **Materials**: `InstrumentMaterial` files attached to a class (+ optional lesson). Reads are access-controlled; the standalone upload is **not** ownership-checked.

## User stories (from PROJECT_IDEA.md)
- **T-002** Teachers upload class materials (PDF, slides, **videos**) — scoped to their classes.
- **A-006** Admin analytics include class **attendance stats**.
- (Implicit) Admin records and manages student attendance and curriculum progress.

## Decisions locked

| Topic | Decision |
|---|---|
| Recorder | **Admins record attendance** (not teachers). Keep `@Roles('Admin')`. |
| No-shows | **No auto-absence.** The system surfaces a **no-show list** for a chosen date; admin **approves** (mark absent) or **disapproves** (revert) — individually or in **bulk**. |
| Correctability | Recording a (participant, date) **upserts** that day's outcome (so an absence can be overridden by a present); plus an explicit **edit** endpoint. |
| Date | Attendance is recorded/reviewed **for a chosen date** (not hard-coded "now"); backfill allowed (no future dates). |
| Materials upload | Add an **ownership check**: a Teacher may only upload to classes they teach (multi-teacher aware). Admins unrestricted. |
| Videos | **Add video support** (mp4/webm + size cap) to uploads + materials. |
| Notes | Add an optional `note` to attendance (esp. excused/absent reason). |
| Closed days | Add a simple **closed-days** concept so no-shows aren't flagged when the school is closed. |

## Schema changes

### `server/src/attendance/schemas/student-attendance.schema.ts`
- `classId?: ObjectId` (ref Class, indexed) — denormalized at record time for direct per-class reporting.
- `lessonId` → **optional** (absences have no lesson).
- `recordedBy` → **optional** (absences may be system/admin-approved without a lesson context).
- `note?: string` (reason/notes).
- Add a unique partial index on `{ participantId, sessionDay }` is NOT used (sessionDate is a timestamp); dedup stays at the service layer keyed by the date's day window.

### New `server/src/attendance/schemas/closed-day.schema.ts`
- `date: Date` (the closed calendar day, normalized to midnight), `branchId?: ObjectId` (null ⇒ all branches), `reason?: string`. Index `{ date: 1, branchId: 1 }`.

### `server/src/upload/upload.service.ts`
- Add `ALLOWED_VIDEO_MIMES` (`video/mp4`, `video/webm`, `video/quicktime`), `ALLOWED_VIDEO_EXTENSIONS` (`.mp4`, `.webm`, `.mov`), `MAX_VIDEO_SIZE_BYTES` (e.g. 100MB). Add `ALLOWED_MATERIAL_MIMES`/`EXTENSIONS` = images + PDF + video.

---

## Step-by-step plan

### A. Materials authorization + video (blocker + T-002)

**Step 1 — Ownership check on `POST /materials/upload`.**
- In `materials.controller.uploadMaterial`: if the user is a **Teacher** (not Admin), load the target class (`classService.findById(dto.classId)`) and require `userMatchesClassTeacher(class, user.sub)` (the Module 5 matcher). Reject with 403 otherwise. Admins unrestricted.

**Step 2 — Video support.**
- `upload.service.ts`: add the video MIME/extension/size constants and a combined `ALLOWED_MATERIAL_*` set.
- `materials.service.uploadMaterial`: validate against the material set (images + PDF + video); set `fileType: 'video'` for video extensions.
- `materials.controller`: raise the multer `limits.fileSize` to `MAX_VIDEO_SIZE_BYTES` for this route.
- Note Cloudinary free-tier limits in the doc; large videos may need chunked upload later.

### B. Attendance schema + correctable recording

**Step 3 — Schema updates** (above): `classId`, optional `lessonId`/`recordedBy`, `note`.

**Step 4 — Date-aware, upserting record.**
- `record-student-attendance.dto.ts`: add optional `sessionDate` (ISO date) and `note`.
- `recordStudentAttendance`: use `dto.sessionDate ?? now` (reject future dates). Resolve `classId` from the lesson (or the student's active enrollment when no lesson). **Upsert by (participantId, day)**: if a record exists for that day, update its status/lesson/note/recordedBy (this overrides an approved absence); else create. Keep the `missedLessonsCount` accounting correct on transitions into/out of `absent`.

**Step 5 — Explicit edit + delete.**
- `PATCH /attendance/students/record/:id` (Admin) → update status/lessonId/note; adjust `missedLessonsCount` if the absent flag changes.
- `DELETE /attendance/students/record/:id` (Admin) → remove a record (e.g. recorded by mistake); decrement `missedLessonsCount` if it was absent.

### C. No-show review (replaces auto-absence)

**Step 6 — Remove auto-absence.**
- Delete the scheduled `ensureAbsenceRecordForParticipantOnDate` call from `payment-reminder.service`; keep/repurpose `getExpectedStudentsForDate`.

**Step 7 — No-show endpoints.**
- `getExpectedParticipantsForDate(date, branchFilter)`: active participants whose `preferredLearningDays` includes that weekday (branch-scoped). Returns empty + `closed: true` if the date is a closed day.
- `GET /attendance/no-shows?date=YYYY-MM-DD` (Admin, branch-scoped): expected participants **minus** those who already have a record for that date ⇒ the no-show list. Include each participant's name/number/instrument.
- `POST /attendance/no-shows/mark-absent` body `{ date, participantIds[] }` (Admin, audited): upsert an `absent` record for each (skips any who already have a non-absent record). Notify each student (see Step 11).
- `POST /attendance/no-shows/revert` body `{ date, participantIds[] }` (Admin, audited): remove the `absent` record for each on that date (decrement `missedLessonsCount`).

### D. Closed days

**Step 8 — Closed-day model + CRUD.**
- New `ClosedDay` schema (above), module wiring.
- `GET/POST/DELETE /attendance/closed-days` (Admin; SuperAdmin global, branch-Admin scoped to their branch). `isClosed(date, branchId)` helper used by expected/no-show computation.

### E. Reporting

**Step 9 — Attendance summary stats.**
- `getStudentAttendanceSummary(userId|participantId)`: counts by status, total sessions, **attendance rate %** (present+late / total). Surface on the student detail view and a per-student report.

**Step 10 — CSV export.**
- `GET /attendance/export?from&to&branchId&participantId` (Admin) → CSV (date, attendanceNumber, name, instrument, status, lesson, recordedBy), mirroring the audit-log export pattern.

### F. Notifications

**Step 11 — Absence notifications.**
- Inject `NotificationService` into `AttendanceService` (import `NotificationModule` in `AttendanceModule`).
- When an `absent` record is created (single, bulk, or no-show approval), notify the student (`type: 'attendance_absent'`). Best-effort; never blocks recording.
- (Optional low-attendance alert if rate drops below a threshold — include a simple version: notify when `missedLessonsCount` crosses a configurable threshold.)

### G. Client

**Step 12 — Admin daily attendance screen** (`admin/attendance`):
- A **date picker** driving a **roster view**: expected students for that day with their current status (recorded / not). If the day is closed, show a "Closed" banner.
- Per-student status control (present/late/excused/absent + lesson + note); inline **edit** of existing records.
- A **no-show panel**: list of not-yet-marked expected students with **mark-absent** / **revert** per row and **mass** actions.
- Wire `attendanceApi`: date param on record; new no-show list/mark/revert; edit/delete; closed-days CRUD; summary; export link.

**Step 13 — Student & material UX:**
- Student detail (admin) + student dashboard: show **attendance summary** (rate %, counts) and lesson-progress bar (progress already exists).
- Materials: allow selecting/uploading **video** files in the teacher/admin materials UI; render a video badge/player link.

## Verification checklist

- [ ] A teacher uploading a material to a class they don't teach → 403; to their own class → ok; Admin → any class.
- [ ] Uploading a video material succeeds (within size limit) and is stored with `fileType: 'video'`.
- [ ] Recording attendance for a **past date** works; future dates are rejected.
- [ ] Recording `present` for a student who has an approved **absence** that day **overrides** it (no "already recorded" error); `missedLessonsCount` adjusts.
- [ ] Editing/deleting a record updates status and `missedLessonsCount` correctly.
- [ ] No auto-absence is created by any scheduled job.
- [ ] `GET /attendance/no-shows?date=` returns expected-but-unmarked students (branch-scoped); a closed day returns closed/empty.
- [ ] Mass mark-absent and mass revert work; each absent notifies the student.
- [ ] Closed-days CRUD works and suppresses no-shows on those days.
- [ ] Attendance summary (rate %, counts) is correct on the student view.
- [ ] CSV export downloads with the expected columns.
- [ ] Admin daily screen: roster marking, inline edit, and no-show panel all function.
- [ ] `npx tsc --noEmit` passes in server/ and client/; both production builds pass.

## Notes / follow-ups
- Lesson-vs-package match on recording stays instrument-based (lessons are per-instrument curriculum); tightening to the student's specific package can come later.
- Very large video uploads may exceed Cloudinary free-tier limits; chunked/resumable upload is a future enhancement.
