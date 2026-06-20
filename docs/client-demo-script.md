# Client Demo Script — Abel Begena Conservatory

A structured 25–30 minute walkthrough. The order is chosen to build a narrative: prospect → student → admin → unique differentiators.

---

## 0. Pre-Demo Checklist (do 5 min before)

Open these tabs ahead of time so the demo flows without setup pauses:

| Tab | URL | Logged in as |
|---|---|---|
| **A — Public** (incognito or guest) | http://localhost:3000/ | not logged in |
| **B — Prospect / Student** | http://localhost:3000/login | `teddyabere444@gmail.com` |
| **C — Admin** | http://localhost:3000/login | `abel@abelbegena.com` |
| **D — Teacher** | http://localhost:3000/login | `teacher.seed@abelbegena.com` |

**Credentials cheat sheet:**

| Role | Email | Password |
|---|---|---|
| SuperAdmin | `abel@abelbegena.com` | `password123` |
| Active student | `teddyabere444@gmail.com` | (your set password) |
| Demo student (advanced) | `yohannes.demo@abelbegena.com` | `password123` |
| Demo student (partial-pay scenario) | `marta.demo@abelbegena.com` | `password123` |
| Teacher | `teacher.seed@abelbegena.com` | `password123` |

**Quick health check:**
- ✅ Backend up: visit http://localhost:5001/branches (should return JSON with 2 branches)
- ✅ Frontend up: http://localhost:3000 (homepage renders)
- ✅ Both branches visible on the public branches page

**One thing to mention up front:** "This is the working system — every screen you see, the data behind it is real, stored in our database. Anything I show I can also do live."

---

## 1. The Public Face (3 min)
*Goal: establish the brand and show this is a real platform, not a mockup.*

### 1.1 Homepage — http://localhost:3000/
**Show:**
- Hero section with the Begena/EOTC heritage theme
- Bilingual support (toggle the **Am / En** switcher in the nav)
- Floating "Find a branch" CTA

**Say:**
> "The whole platform is bilingual — English and Amharic. That's important because most students and parents prefer Amharic for content, but the admin interface and emails can run in either language."

### 1.2 Branches — http://localhost:3000/branches
**Show:**
- The map with **two markers**: Abel Begena Piassa Branch and Abel Begena Megenagna Branch
- Auto-fits to show both branches
- Click each marker → popup with name and address

**Say:**
> "We've set up your two branches with their actual GPS coordinates. The map auto-fits so all branches are visible no matter how many you have — adding a third or fourth branch later just adds another pin, no manual zoom adjustment."

### 1.3 Classes catalog — http://localhost:3000/classes
**Show:**
- The 6-month Begena package card with its details
- Pricing, duration, instrument
- "Enroll" CTA

**Say:**
> "These are the active programs. Adding a new program — say a 12-month course for an advanced student — takes about a minute from the admin side."

---

## 2. The Student Journey: Enrollment (5 min)
*Goal: show how a prospect becomes a paying student, end-to-end.*

### 2.1 Browse → Enroll
**In Tab A (logged out):**
- Click into the Begena class
- Click **Enroll** → prompted to log in / register

**Say:**
> "We don't force registration upfront — they only have to commit when they're ready to enroll. That improves conversion."

### 2.2 Pre-prepared: jump to the enrollment modal
*To save time, log in as Tewodros (`teddyabere444`) and reopen the enroll modal on the Begena class.*

**Show:**
- Personal info section (name, phone, emergency contact, address)
- Learning preferences: **Physical vs Online**
  - Physical → branch picker shows your two branches
  - Online → branch becomes optional
- Schedule preferences: which days, what time
- Payment method dropdown (Bank Transfer, Telebirr, Manual)
- **Receipt upload section** with the prominent "Required" badge
- Bank reference / transaction number field

**Say:**
> "This is the heart of the enrollment workflow. Since there's no payment gateway integrated yet, students pay offline — bank transfer, Telebirr, cash at the branch — and upload a photo of the receipt. We could swap in Chapa or Telebirr's online API later without redesigning anything."

### 2.3 Admin approves the payment
**Switch to Tab C (Admin):**
- Navigate to `/admin/payments`
- Point out the **tabs at the top** — All / Tuition / Enrollment / Orders — so admin doesn't get confused mixing flows
- Click an **Enrollment** request → Review modal opens
- Show the inline receipt image preview
- Click **Approve** — strong green button

**Say:**
> "When the admin approves, the system does five things automatically: it converts the user account into a student, generates a unique attendance number, creates the billing record, sends them a welcome email, and unlocks all their learning materials. We track every step so if anything fails — say the email server is down — the admin gets a 'needs attention' alert with a one-click retry."

---

## 3. The Student Dashboard (4 min)
*Goal: show the value students get from the platform.*

### 3.1 Switch to Tab B (now logged in as the approved student)
**Show `/student`:**
- Welcome message + attendance number prominently displayed
- **Lesson progress card** with the gold progress bar — "X of 8 lessons completed"
- **Last completed lesson** name
- **Materials section** for their instrument (Begena), populated with sheet music + reference recordings
- Class details: schedule, teacher, branch

### 3.2 Lessons & materials — `/student/lessons`
**Show:**
- All 8 songs in the curriculum
- Each lesson row shows its materials (downloadable PDFs, audio recordings)
- "Next" lesson is highlighted with a permanent accent

### 3.3 Attendance — `/student/attendance`
**Show:**
- Per-session log: date, lesson taught, status (Present / Late / Excused / Absent)
- Stats cards: attendance rate

### 3.4 Payments — `/student/payments`
**Show:**
- Green "All paid up" card OR amber "Tuition balance due"
- **The countdown:** "Next month's payment becomes due in X days if you continue attending"
- Per-month payment ledger

**Say (the unique value):**
> "This is consumption-based billing — the student is only charged for months they actually attend. If they skip a month due to travel or illness, no charge. The countdown adapts to their attendance, not a calendar. This matches how most music schools actually operate, but few platforms support it natively."

---

## 4. The Admin Power Tools (8 min)
*Goal: show the admin can run the school confidently from the dashboard.*

### 4.1 Attendance management — `/admin/attendance`
**Show:**
- Live student list with the new **Record** button next to each
- Click **Record** → modal opens with:
  - Date picker (defaults to today, can backdate)
  - Lesson dropdown
  - Status (Present / Late / Excused / Absent)
- After saving, show the **history** modal (clock icon)
- Demonstrate **Edit** and **Delete** inline actions
- Mention guardrail: trying to record twice for the same day → clear error "use Edit or delete first"

**Say:**
> "Recording attendance takes about 5 seconds per student. The system prevents duplicate same-day records — common mistake in paper systems — and recalculates lesson progress and billing automatically."

### 4.2 Consumption-based billing in action — `/admin/monthly-payments`
**Show:**
- The **overdue alert** at the top — compact, scales well even with many students
- For Marta (who owes a partial-paid month):
  - Strikethrough on the full fee + the **remaining balance** clearly shown
  - "Partial received: ETB 1,000 / ETB 3,000"
- Click **Record Payment** → modal pre-fills with the **remaining** amount, not the full fee
- Demonstrate the modal options: **Paid / Partial / Waive** + **Period override** for advance payments

**Say:**
> "When a student has paid part of their month, the system tracks the remaining balance. The admin sees exactly what's left and can record additional partial or final payments. They can also waive a month if a student is on hardship — that month gets settled but no charge applies."

### 4.3 Orders & store — `/admin/orders`
**Show an existing order (Yohannes's):**
- Status pill (current state) + **forward-only advance button**
- Walk through: Processing → Shipped (with tracking) → Delivered
- Try clicking anything that would go *backwards* → nothing's offered; it's blocked
- On a delivered order, only the green pill shows — no actions possible

**Say:**
> "Order lifecycle is strict — forward-only. Once an order is shipped, it can't be cancelled (the items are already with the carrier). Once delivered, it's locked. This prevents accidental status reversions that would mess up customer records."

### 4.4 Users — `/admin/users`
**Show:**
- The **tab bar** with counts: Website Users / Teachers / Admins / Students
- Click between tabs — note the underline indicator
- Hover over a row — soft amber tint
- Mention **role-based access**: SuperAdmin sees admin management; Admin sees teachers/students

### 4.5 Branches — `/admin/branches`
**Show:**
- Two branches with editable coordinates
- Click on the map to update a branch's location
- Mention soft-delete + the radius field used for check-in geofencing

---

## 5. Email Notifications (live demo, 2 min)
*Goal: prove this isn't just a UI — real automation runs.*

**Trigger any of these (which sends an email):**
- Approve a pending payment in `/admin/payments` — student gets a "Payment approved" email
- Reject a pending payment with a reason — student gets a "Payment not approved" email with the reason
- Register a new account from `/register` — verification code email
- Create a new student account → credentials email

**Open your inbox (`teddyabere888@gmail.com`) live to show the email arriving.**

**Say:**
> "Every action that affects a student triggers an email — verification, enrollment approval, payment approved, payment rejected, order shipped, attendance absent. The admin doesn't have to remember to follow up. The school's email address goes in one config field; we use Gmail / Workspace / SendGrid / any standard SMTP."

---

## 6. The Differentiators (close, 3 min)

End with a quick recap of what makes this platform specifically right for Abel Begena Conservatory:

1. **Bilingual (Am / En)** — students and staff can use whichever they prefer
2. **Branch-aware** — physical learning students linked to a specific branch; geo-coordinates for future check-in
3. **Consumption-based billing** — students only pay for months they attend; no penalty for breaks; automatic owed/paid tracking
4. **Receipt-based payment workflow** — fits how Ethiopian banking + Telebirr currently work; gateway integration ready when needed
5. **Compensating side-effects pattern** — if any post-payment automation fails (email, stock, student conversion), admin gets a clear alert with one-click retry; no silent failures
6. **Lesson progress tied to attendance** — the lesson the teacher taught becomes the student's progress; no separate manual tracking
7. **Live classes for online students** — built in, no Zoom/Meet license needed (uses WebRTC)
8. **Store + orders** — second revenue stream for instruments, books, accessories
9. **Audit logs** — every admin action is recorded; accountability built in

---

## 7. Common Questions & Answers

**"Can you change [colors / logo / school name]?"**
> Yes — branding is a config change, takes a few minutes. The amber/gold accent is your current brand color; we can swap to anything.

**"What happens if a student loses their attendance number?"**
> Admin can look them up by name or email and see/reset it from `/admin/users`.

**"What if our internet goes down during a class?"**
> Live classes are real-time only. Attendance can still be recorded later (backdated). Everything else (student dashboards, payments) is cached and works offline-tolerantly for short outages.

**"Can teachers see all students or only their own?"**
> Only their own classes' students. Teachers can upload materials, take attendance, post blog updates, and run live sessions for their classes.

**"How is data backed up?"**
> MongoDB Atlas (cloud) handles continuous backups with point-in-time recovery up to 7 days. We can also export everything to JSON/CSV on demand from the admin panel.

**"What about payment gateway integration?"**
> Chapa, Telebirr API, Stripe — any of them can be added later in about a week. The architecture is ready; we just plug in a new payment provider module.

**"What does it cost to host?"**
> About $20–40/month for the levels of traffic a music school sees (MongoDB Atlas free tier covers the first few hundred students; hosting on Vercel free tier for the frontend; the backend on a small VM or container).

**"Can a student be enrolled in multiple programs?"**
> Yes — they'd have multiple enrollments and separate billing tracks per program.

---

## 8. Recovery Plan (if something breaks during demo)

| Problem | Fallback |
|---|---|
| **Backend crashed** | Pivot to "let me show you the admin interface" using already-loaded tabs (data is cached). Restart backend in a separate window quietly. |
| **Email didn't arrive** | "Sometimes Gmail delays by a minute — we'll come back to it" — continue with other features |
| **Live map blank** | OpenStreetMap occasionally rate-limits. Refresh once; if still blank, show the admin branches list instead — same data |
| **Login fails** | Use the password reset flow as a demo opportunity ("see how easy account recovery is") |
| **Database glitch** | Worst case: the platform has audit logs; nothing is ever destroyed — everything is recoverable |

**Always have ready:** a screenshot folder of key screens, just in case. Take screenshots before the demo of: homepage, student dashboard, billing card, admin payments inbox, branches map.

---

## 9. Pacing Cheat Sheet (25 min target)

| Minute | Section |
|---|---|
| 0–3 | Section 1: Public face |
| 3–8 | Section 2: Enrollment flow |
| 8–12 | Section 3: Student dashboard |
| 12–20 | Section 4: Admin power tools |
| 20–22 | Section 5: Live email demo |
| 22–25 | Section 6: Differentiators + Q&A |

**If running long:** cut Section 4.3 (orders) and 4.5 (branches admin) — they're nice-to-haves.
**If running short:** add a teacher view (`/teacher`) and the live class lobby (`/teacher/live`).

---

**Final tip:** Open `client/src/locales/am.json` for ~5 seconds during the bilingual mention — the Amharic translations being real files (not Google Translate) lands well with the audience.
