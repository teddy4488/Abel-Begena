# Module 5 — Class Management (Packages & Scheduling)

## Purpose
Reframes "class" to match how the Abel Begena school actually works: a **class is a package** (instrument + duration), students are **self-paced**, and scheduling is **per-student time slots** rather than cohort sessions. Builds multi-teacher support, formalizes time slots, replaces the (dropped) capacity-cap idea with an **admin time-of-day occupancy visualization**, and fixes catalog/authorization gaps.

---

## Domain model (the reframe)

- A **Class = a package**: one instrument (Begena / Kirar / Mesenqo) + one duration tier, with its own tuition and one or more assigned teachers.
- **Duration → sessions per week:** 3-month = **5/wk**, 6-month = **3/wk**, 9-month = **2/wk**.
- Each **session = 1.5 hours**. A 12:00 start means 12:00–13:30.
- **Operating day: 08:00 → 19:30.** Valid session start times are **08:00–18:00** (so a 1.5h session ends by 19:30).
- Students are **self-paced** — no cohort, no shared progress, no enrollment cap.
- A student enrolls in a package and chooses **one (day, time) slot per session/week**, each day with **its own time** (per-day time).

### Capacity — REPLACED, not enforced
There is **no enrollment limit and no student-facing warning/deny**. Instead, admins get a **visualization**: pick a day → see a graph of how many students are in a session at each time across 08:00–19:30 (sessions counted with their 1.5h window so overlaps show). This gives admins awareness of busy/free times without restricting anyone.

---

## Decisions locked

| Topic | Decision |
|---|---|
| Class model | **Instrument + Duration** package; own tuition; `durationMonths` (3/6/9) on the Class. |
| Sessions/week | Derived from duration: 3→5, 6→3, 9→2. |
| Time selection | **Per-day time** — each chosen day has its own start time. |
| Session length | 90 minutes; starts allowed 08:00–18:00. |
| Capacity enforcement | **None.** No warn, no deny. Replaced by admin occupancy visualization. |
| Occupancy visualization | Per selected **day**, optional **branch** + **instrument** filters; 30-min buckets across 08:00–19:30; counts **active** enrollments. |
| Multi-teacher | **Build fully** — UI multi-select + fix all guards/access to honor `teacherIds`/`primaryInstructorId`. |
| Teacher↔branch assignment | **Allow with a warning** when the teacher's `branchIds` doesn't include the class branch (not a hard block). |
| Public catalog soft-delete | Exclude deleted classes. |

---

## User stories

| ID | Story | Acceptance criteria |
|---|---|---|
| U-003 | As a user, I browse instrument packages and their fees. | Catalog shows instrument + duration + sessions/week + tuition; soft-deleted packages hidden. |
| U-004a | As a user, I enroll in a package and choose my weekly schedule. | After picking a package, I choose one (day, time) per session/week; each day has its own time; times constrained to 08:00–18:00; no duplicate days. |
| A-003 | As an admin, I want awareness of how busy each time of day is. | Select a day (+ optional branch/instrument) → a chart shows concurrent students per 30-min bucket from 08:00–19:30. |
| A-003b | As an admin, I manage packages with multiple teachers. | Class form lets me assign one or more teachers; a primary can be designated; out-of-branch teachers can be assigned but I'm warned. |
| T-003 | As a teacher (incl. co-teacher), I manage my assigned packages. | Any teacher in `teacherIds`/`primaryInstructorId`/`instructorId` can view roster, schedule, materials, and run live sessions. |

No user stories for the schema/guard fixes (internal correctness).

---

## Schema changes

### `server/src/class/schemas/class.schema.ts`
- Add `durationMonths?: 3 | 6 | 9` (the package duration; indexed with instrumentType).
- (Multi-teacher fields already exist: `instructorId`, `primaryInstructorId`, `teacherIds[]`.)

### `server/src/enrollment/schemas/enrollment.schema.ts`
- Add a structured slots array:
  ```
  @Prop({ type: [{ day: String, startTime: String }], default: [] })
  timeSlots?: { day: WeekDay; startTime: string }[];   // startTime = "HH:mm" 24h local
  ```
  Becomes the authoritative weekly schedule. Existing `preferredLearningDays` / `preferredTime` kept for backward-compat display, derived from `timeSlots`.

---

## Shared constants & helper (server)

New `server/src/class/class.constants.ts`:
- `SESSION_MINUTES = 90`
- `DAY_START = "08:00"`, `DAY_END = "19:30"`, `LATEST_START = "18:00"`
- `SESSIONS_PER_WEEK = { 3: 5, 6: 3, 9: 2 }`
- `sessionsPerWeek(durationMonths)` helper
- `WEEK_DAYS` array
- time helpers: `toMinutes("HH:mm")`, `overlaps(startA, startB)` (true if `|a-b| < 90`)

---

## Step-by-step plan

### Step 1 — Class schema + DTO (package duration)
1a. Add `durationMonths` to `class.schema.ts` (enum 3/6/9).
1b. Add to `create-class.dto.ts`: `@IsOptional() @IsIn([3,6,9]) durationMonths?: 3|6|9`. (UpdateClassDto inherits via PartialType.)

### Step 2 — Enrollment schema + DTO (structured time slots)
2a. Add `timeSlots` to `enrollment.schema.ts` (array of `{ day, startTime }`).
2b. Add to `enroll-class.dto.ts` a validated `timeSlots` array:
   - `day` ∈ week days, `startTime` matches `^([01]\d|2[0-3]):[0-5]\d$`.
2c. Keep `programDurationMonths` synced from the class's `durationMonths` at enroll time.

### Step 3 — Enrollment validation (server)
In `class.service.enrollStudent` / `enrollStudentWithReceipt`:
- Resolve `durationMonths` from the class; compute required `sessionsPerWeek`.
- Require `timeSlots.length === sessionsPerWeek` (clear error otherwise).
- Validate each slot: day valid, `startTime` within `[08:00, 18:00]`, no duplicate days.
- Persist `timeSlots` and derive `preferredLearningDays`/`preferredTime` for compatibility.
- **No occupancy check** (capacity dropped).

### Step 4 — Occupancy visualization service (server)
Add `class.service.getDayOccupancy({ day, branchId?, instrumentType? })`:
- Load **active** enrollments matching branch/instrument filters that have a `timeSlot` on `day` (join class for instrument/branch where needed).
- Build 30-min buckets from 08:00 to 19:00 (each bucket = a 30-min window up to 19:30).
- For each bucket, count students whose slot window `[start, start+90)` overlaps the bucket.
- Also return `bySlot` (count grouped by exact chosen start time) and `totalStudents` (distinct).
- Response:
  ```
  { day, operatingHours: {start:"08:00", end:"19:30"},
    buckets: [{ time:"08:00", count }, ...],   // through 19:00
    bySlot: [{ startTime:"12:00", count }, ...],
    totalStudents }
  ```

### Step 5 — Occupancy endpoint (server)
`GET /classes/occupancy?day=thursday&branchId=&instrumentType=` → Admin/SuperAdmin only (RoleGuard). Branch Admins scoped to their branch automatically.

### Step 6 — Multi-teacher authorization fixes (server)
6a. `ClassOwnerGuard` ([class-owner.guard.ts]): treat a teacher as owner if their id is in `instructorId` **or** `primaryInstructorId` **or** `teacherIds`.
6b. `class.service.getAccessPayload`: same — `isInstructor` true if user id matches any of the three.
6c. Add a reusable helper `isClassTeacher(classEntity, userId)` used by both.

### Step 7 — Teacher↔branch warning + teacher validation (server)
In `assignInstructor`, and in `createClass`/`updateClass` when teachers are set:
- Verify each assigned id is a **Teacher** (load user, check role) → reject non-teachers.
- If a teacher's `branchIds` doesn't include the class's `branchId`, **allow but include a `warnings: string[]`** in the response (e.g. "Teacher X is not assigned to this branch").

### Step 8 — Public catalog soft-delete (server)
`getPublicCatalog`: add the `notDeleted` filter. Include `durationMonths`/sessions-per-week + instrument in the projection.

### Step 9 — Client: class API types
`classApi.ts`:
- `ClassSummary`/managed types: add `durationMonths`, `teacherIds`, derived `sessionsPerWeek`.
- Add `getDayOccupancy` query (`/classes/occupancy`).
- Update create/update class mutations to send `durationMonths` + `teacherIds[]`.
- Enroll mutation: send `timeSlots`.

### Step 10 — Client: admin class form (duration + multi-teacher)
`admin/classes/page.tsx`:
- Add **Duration** select (3/6/9 → shows derived sessions/week).
- Replace single instructor select with **multi-teacher** picker (checkbox list of teachers); designate a **primary**. Show a non-blocking **warning** when a selected teacher isn't in the class's branch.
- Persist `durationMonths`, `teacherIds`, `primaryInstructorId`.

### Step 11 — Client: enrollment schedule picker
In the enroll flow (`dashboard/become-student` and the class enroll form):
- After a package is chosen, read its `durationMonths` → `sessionsPerWeek = N`.
- Render **N** rows of (Day select + Time select). Times limited to 08:00–18:00 in 30-min steps; days must be distinct.
- Validate N complete, distinct days; submit `timeSlots`.

### Step 12 — Client: admin occupancy visualization
New section/page `admin/classes` (or `admin/analytics`):
- Controls: **Day** selector (Mon–Sun), optional **Branch** + **Instrument** filters.
- **Chart** (recharts area/bar): X = time 08:00→19:30 (30-min buckets), Y = students in session. Reuse/extend `components/admin/charts`.
- Secondary: a small table or bars for `bySlot` (popular start times). Show `totalStudents` for the day.

### Step 13 — Client: catalog display
`classes/page.tsx` + public catalog: show package shape — instrument, duration (e.g. "6-Month · 3 sessions/week"), tuition.

---

## Verification checklist

- [ ] Creating a class requires/saves `durationMonths`; sessions/week derived correctly (3→5, 6→3, 9→2).
- [ ] Enrolling requires exactly sessions/week time slots; each day distinct; times within 08:00–18:00.
- [ ] Enrollment with wrong slot count or out-of-hours time is rejected with a clear message.
- [ ] `timeSlots` persisted on the enrollment; `preferredLearningDays`/`preferredTime` still populated.
- [ ] `GET /classes/occupancy?day=…` returns 30-min buckets 08:00–19:00 with correct overlap counts.
- [ ] Admin occupancy chart renders concurrent-students-by-time for the selected day; branch/instrument filters work.
- [ ] A co-teacher (in `teacherIds` only) can open roster, schedule, materials, and live for the class.
- [ ] `ClassOwnerGuard` and `getAccessPayload` both honor `teacherIds`/`primaryInstructorId`.
- [ ] Admin form assigns multiple teachers + a primary; assigning an out-of-branch teacher shows a warning but succeeds.
- [ ] Assigning a non-teacher user is rejected.
- [ ] Soft-deleted classes do not appear in the public catalog.
- [ ] `npx tsc --noEmit` passes in server/ and client/; both production builds pass.
