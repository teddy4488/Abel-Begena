# AbelBegena — Full Feature Testing Checklist

**How to use this document:**
- `[ ]` Not yet tested
- `[✓]` Confirmed working
- `[✗]` Broken — describe the issue in a note
- `[F]` Fixed — note the fix applied

**Running the app:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- Keep DevTools open (Console + Network tabs) on every page

**Test accounts (all password `password123`):**
| Email | Role | Notes |
|---|---|---|
| `abel@abelbegena.com` | SuperAdmin | Full access |
| `teacher.seed@abelbegena.com` | Teacher | Linked to Addis Ababa branch |
| `yohannes.demo@abelbegena.com` | Student | Owes 2 months, pending enrollment receipt |
| `marta.demo@abelbegena.com` | Student | Partial payment on period 2 |
| `dawit.demo@abelbegena.com` | Student | All paid + one waived month |

---

## 1. PUBLIC PAGES (No login required)

### `/` — Homepage
- [ ] Page loads without console errors
- [ ] Hero section renders correctly
- [ ] Class catalog preview shows (at least the 2 seeded classes)
- [ ] Store preview shows (at least the 3 seeded products)
- [ ] Navigation links work (Classes, Store, Heritage, Branches)
- [ ] Navbar shows Login / Register (not logged-in state)

### `/classes` — Class Catalog
- [ ] Both seeded classes display (6-month physical + 9-month online)
- [ ] Class cards show title, instrument, duration, tuition (ETB)
- [ ] "Enroll" button visible (redirects to login if not logged in)
- [ ] Instrument filter works
- [ ] Level filter works

### `/store` — Product Listing
- [ ] All 3 seeded products appear
- [ ] Product images placeholder shows (no broken image icons)
- [ ] ETB currency formatting correct
- [ ] Search by name works
- [ ] "Add to cart" visible (redirects to login if not logged in)
- [ ] Pagination / per-page controls work

### `/store/[id]` — Product Detail
- [ ] Product title, description, price render
- [ ] Quantity selector present and clamps to stock
- [ ] "Add to cart" button works (login gate if not logged in)
- [ ] Out-of-stock state disables Add to Cart
- [ ] Related products section renders

### `/heritage` — Blog Listing
- [ ] Seeded blog post "The History of Begena..." appears
- [ ] Post card shows title, excerpt, author, date

### `/heritage/[slug]` — Blog Detail (slug: `begena-history`)
- [ ] Full post body renders
- [ ] Comment form visible
- [ ] Submitting a comment shows success (pending moderation)

### `/branches` — Branch Locations
- [ ] Map renders (Leaflet, no tile errors)
- [ ] "Addis Ababa Main Branch" marker visible on map
- [ ] Branch list card shows address, phone

### `/login` — Login
- [ ] Form submits with valid credentials (abel@abelbegena.com)
- [ ] Redirects to correct page by role after login
- [ ] Wrong password shows error message
- [ ] Inactive account shows "account suspended" error
- [ ] Link to /register and /forgot-password work

### `/register` — Register
- [ ] Form validates required fields
- [ ] Password minimum 8 chars enforced
- [ ] Duplicate email shows error
- [ ] Success shows "check your email" message

### `/forgot-password`
- [ ] Form submits email
- [ ] Success message shown

---

## 2. AUTH / PROFILE (Logged in as any user)

### `/profile` — User Profile
**Login as:** abel@abelbegena.com
- [ ] Profile data loads (name, email, avatar placeholder)
- [ ] Edit name fields → save → changes persist on refresh
- [ ] Upload avatar → preview updates
- [ ] Change password form (needs old + new password)
- [ ] Incorrect old password shows error

---

## 3. DASHBOARD (Logged in — role-based hub)

### `/dashboard` — Main Dashboard
**Login as:** yohannes.demo@abelbegena.com (Student)
- [ ] Redirects correctly based on role (student → shows student dashboard)
- [ ] Enrolled class cards visible
- [ ] Upcoming payments / billing state shown (owes 2 months)
- [ ] Live class link shows when class is live

**Login as:** abel@abelbegena.com (SuperAdmin)
- [ ] Redirects to `/admin/console` or appropriate admin landing

### `/dashboard/payments` — Payment History + Billing Card
**Login as:** yohannes.demo@abelbegena.com
- [ ] Tuition billing card visible at top (amber — owes 2 months)
- [ ] Months attended = 3, months paid = 1, monthly fee = ETB 3,000
- [ ] Enrollment history section shows (pending enrollment PaymentRequest)
- [ ] Filter by type (enrollment / order) works
- [ ] Filter by status works

**Login as:** dawit.demo@abelbegena.com
- [ ] Tuition billing card shows green (all paid)

### `/dashboard/enrollments` — My Enrollments
**Login as:** yohannes.demo@abelbegena.com
- [ ] Enrollment list shows (if any active enrollment — may be empty for demo)
- [ ] Status badge correct (pending / active)

### `/dashboard/become-student` — Enrollment Form
**Login as:** abel@abelbegena.com (logged in as a user, not yet a student)
> Note: this flow works for users without a student account. Test this as a new website user if possible.
- [ ] Form loads with class selector, days, time slots, personal info fields
- [ ] Class dropdown shows available classes
- [ ] Day selector shows correct count per duration (6mo→3 days)
- [ ] Time slot picker for each day
- [ ] Payment reference + receipt upload fields present
- [ ] Submit creates a PaymentRequest (check admin payments inbox)

---

## 4. STUDENT PAGES (`/student/*`)

### `/student` — Student Home
**Login as:** yohannes.demo@abelbegena.com
- [ ] Student dashboard loads
- [ ] Enrolled class card shows (demo class)
- [ ] Billing summary / upcoming payments visible
- [ ] No console errors

### `/student/attendance` — Attendance Records
**Login as:** yohannes.demo@abelbegena.com
- [ ] Records list shows (22 present sessions seeded)
- [ ] Stats cards show: Total Sessions, Present, Late, Attendance Rate
- [ ] Year filter works
- [ ] Month filter works
- [ ] Lesson title shows on each record

### `/student/lessons` — Lesson Progress
**Login as:** yohannes.demo@abelbegena.com
- [ ] Progress bar / percentage visible
- [ ] Lesson list shows the 8 seeded lessons
- [ ] Completed vs not-completed status correct (lessons attended show as done)

### `/student/payments` — Tuition Payments
**Login as:** yohannes.demo@abelbegena.com
- [ ] Billing card at top: amber, "owes 2 months"
- [ ] Months attended: 3, months settled: 1
- [ ] Monthly fee shows ETB 3,000
- [ ] Session count "attended X of ~Y this month"
- [ ] "Submit Receipt" button opens modal
- [ ] Receipt modal: amount, file upload, URL field, reference, note
- [ ] Submit creates a PaymentRequest (verify in admin payments)
- [ ] Payment history table shows period 1 as Paid

**Login as:** marta.demo@abelbegena.com
- [ ] Billing card shows "owes 1 month"
- [ ] Period 2 shows "Partial" in history

**Login as:** dawit.demo@abelbegena.com
- [ ] Billing card shows green "all paid up"
- [ ] Period 2 shows as "Waived" in history

### `/student/orders` — Order History
**Login as:** yohannes.demo@abelbegena.com
- [ ] Page loads (may be empty — student may have no orders)
- [ ] No console errors

### `/account/orders` — Order History (shared)
**Login as:** abel@abelbegena.com (has 1 seeded order)
- [ ] Seeded order (Instruction Book, ETB 450) appears
- [ ] Order status "Processing" shown
- [ ] Download receipt option (no receipt URL on seeded order — should show gracefully)
- [ ] Cancel order button (only for pending orders — n/a for this one)

---

## 5. TEACHER PAGES (`/teacher/*`)

**Login as:** teacher.seed@abelbegena.com

### `/teacher` — Teacher Dashboard
- [ ] Dashboard loads without errors
- [ ] Assigned classes visible (2 seeded classes)
- [ ] No "403 forbidden" errors

### `/teacher/schedule` — Schedule
- [ ] Schedule view loads
- [ ] Can add / edit / delete schedule entries

### `/teacher/students` — Class Roster
- [ ] Student list loads (shows demo students if enrolled in teacher's class)
- [ ] Attendance status per student visible

### `/teacher/materials` — Materials
- [ ] Materials list loads
- [ ] Upload new material: PDF → uploads → appears in list
- [ ] Upload video (mp4) → uploads → appears with video type badge
- [ ] Delete material → confirms → removed from list

### `/teacher/posts` — Blog Posts
- [ ] Teacher's posts list (empty initially)
- [ ] Create new post: title, body, image upload → save as draft
- [ ] Edit draft → publish
- [ ] Delete draft

### `/teacher/live` — Live Session Control
- [ ] Live control page loads
- [ ] "Go Live" button exists (toggles class `isLive`)
- [ ] When class is live, students see the live link on their dashboard

---

## 6. LIVE CLASS ROOM

### `/live/class/[id]` (6-month class ID)
**Pre-condition:** Set the class to `isLive: true` via admin classes page OR teacher live page.
**Login as:** yohannes.demo@abelbegena.com
- [ ] Pre-join lobby renders (camera preview, device pickers)
- [ ] Camera dropdown shows available cameras
- [ ] Mic dropdown shows available microphones
- [ ] Toggle camera off → preview goes dark
- [ ] Toggle mic off → mic muted
- [ ] "Join now" button enters the room
- [ ] Local video tile appears
- [ ] "Leave" button exits

**In the room (second window as teacher):**
- [ ] Participants count increments when student joins
- [ ] Chat: send message → appears for both users
- [ ] Raise hand (student) → hand icon appears in people panel for teacher
- [ ] Screen share (teacher) → teacher's screen shows for student
- [ ] Mute participant (teacher host action) → student's mic disables
- [ ] Mute all → all non-host participants muted
- [ ] Remove participant → student sees "removed" banner
- [ ] Teacher recording: Start → record → Stop → "Download" and "Save to materials" appear
- [ ] End session → all participants see "session ended" message

---

## 7. ADMIN PAGES (`/admin/*`)

**Login as:** abel@abelbegena.com (SuperAdmin)

### `/admin/console` — Dashboard
- [ ] KPI cards load: revenue, students, enrollments, classes, products, orders
- [ ] No zero values where data exists (products: 3, students: 3, branch: 1)
- [ ] Branch count shows 1
- [ ] Recent activity section renders (if any)

### `/admin/analytics` — Analytics
- [ ] Revenue card shows (ETB)
- [ ] Student/teacher/user counts correct
- [ ] Revenue trend line chart renders (not blank)
- [ ] User signups chart renders
- [ ] Order distribution bar chart renders
- [ ] Enrollment status pie chart renders
- [ ] Attendance overview section shows numbers from demo data
- [ ] Student payments overview shows (1 paid period)

### `/admin/users` — User Management

**Website tab**
- [ ] Website users list loads
- [ ] Search by email works
- [ ] Active/inactive toggle works (test on an inactive user)
- [ ] Delete user → confirm modal → user removed

**Teachers tab**
- [ ] Teacher.seed@abelbegena.com appears
- [ ] "Attendance report" link → navigates to `/admin/reports/teacher/[id]`
- [ ] Status toggle (active/inactive)
- [ ] Delete teacher

**Admins tab** (SuperAdmin only)
- [ ] Admin list loads
- [ ] "Create Admin" button opens form
- [ ] Create admin form: email, password, name, branch → submit → new admin appears

**Students tab**
- [ ] All 3 demo students appear
- [ ] Search by attendance number works (STD-1001)
- [ ] "Billing" button → opens edit modal with monthlyFee, periodAdjustment, autoReminders
- [ ] Edit monthlyFee → save → verify change persists (re-open modal)
- [ ] Toggle autoReminders → save → verify
- [ ] "Report" link → navigates to `/admin/reports/student/[participantId]`
- [ ] Active/inactive toggle works
- [ ] Delete student → confirm modal

### `/admin/classes` — Class Management

**Classes tab**
- [ ] Both seeded classes appear
- [ ] Create class form: all fields (title, instrument, duration, tuition, level, type, branch, teacher)
- [ ] Assign instructor dropdown shows the seeded teacher
- [ ] Edit class → change title → save → updated in list
- [ ] Delete class → confirm → removed (do NOT delete the seeded classes used elsewhere)
- [ ] Live toggle (isLive) appears and works
- [ ] Search by title works

**Lessons tab**
- [ ] Class selector dropdown shows classes
- [ ] Select "Begena — 6 Month Package" → 8 lessons appear
- [ ] Lessons ordered 1–8 correctly
- [ ] Create lesson: title, code, order → saves → appears in list
- [ ] Edit lesson title → save → updated
- [ ] Delete lesson → confirm → removed

**Occupancy tab**
- [ ] Occupancy visualizer renders (chart or grid)
- [ ] Branch filter works
- [ ] Instrument filter works
- [ ] Time buckets (08:00–18:00) visible

### `/admin/enrollments` — Enrollments
- [ ] Enrollment list loads
- [ ] Filter by status (pending / active / withdrawn) works
- [ ] Search by student name works
- [ ] Click an enrollment → details modal opens
- [ ] Modal shows student profile, amount paid, payment method, receipt link
- [ ] "Approve" button → changes status to active
- [ ] "Reject" button → requires reason → changes status
> Note: For full test, the `become-student` flow creates a PaymentRequest; approving from `/admin/payments` should activate the enrollment. Cross-check both.

### `/admin/attendance` — Attendance Management

**Record Attendance tab**
- [ ] Date picker shows current date
- [ ] Student list loads for that date
- [ ] Select student → select lesson (from 8 seeded lessons) → mark as present/late/excused/absent
- [ ] Save → record created (check student's `/student/attendance` after)
- [ ] Edit existing record → change status → save
- [ ] Delete attendance record

**No-Show Review tab / panel**
- [ ] For a date with no-shows, students listed
- [ ] "Mark Absent" individual → changes status
- [ ] "Revert" individual → removes absent status
- [ ] "Mass Mark Absent" → marks all at once
- [ ] "Mass Revert" → reverts all

**Closed Days tab**
- [ ] Closed days list loads
- [ ] Add closed day: date + reason → saves
- [ ] Edit closed day
- [ ] Delete closed day
- [ ] A date marked closed suppresses no-show review for that date

**Graduation Eligibility tab**
- [ ] Eligibility list loads
- [ ] Shows student name, status (eligible/nearlyEligible/notEligible)
- [ ] Status badge color-coded correctly
- [ ] Reasons listed for non-eligible students

**Past Students tab**
- [ ] Past students list (may be empty — no reverts yet in demo)
- [ ] Revert a student: pick reason (completed/withdrawn/dropped) → confirm → student moves here
- [ ] Reverted student can no longer log in (role becomes User)

### `/admin/monthly-payments` — Billing Desk

**Billing Roster (main table)**
- [ ] Loading skeleton shows while data fetches
- [ ] All 3 demo students appear
- [ ] Columns: name, ID, instrument, status badge, "months owed" badge, "over window" badge
- [ ] Yohannes: suggestedOwed = 2, badge shows "2 mo. owed"
- [ ] Marta: suggestedOwed = 1
- [ ] Dawit: no owed badge (settled)
- [ ] Year/month selector at top (billing is consumption-based — numbers don't change by month)
- [ ] Pagination works (items per page)

**Record Payment modal (click "Record" on Yohannes)**
- [ ] Pre-fills amount with monthlyFee (ETB 3,000)
- [ ] Status: Paid / Partial / Waive
- [ ] Select "Paid" → save → Yohannes suggestedOwed drops to 1
- [ ] Select "Waive" → save → period settled with no amount
- [ ] Period override field: enter a specific period number
- [ ] Months covered field: enter 2 → saves 2 periods at once
- [ ] Receipt file upload (optional)
- [ ] Note field

**Overdue Payments section**
- [ ] Yohannes and Marta appear (both owe)
- [ ] daysOverdue badge visible
- [ ] Dawit NOT in list
- [ ] autoReminders badge shows if enabled
- [ ] Search by student name
- [ ] Days overdue filter (1–7, 8–14, 15–30, 30+)
- [ ] Date filter
- [ ] Pagination

**"Due within 14 days" card**
- [ ] Card appears (students with periods consumed but not yet overdue — may be 0 for demo)
- [ ] Student name + days until due listed

**Pending Monthly Fee Receipts section**
- [ ] Yohannes's submitted receipt (if he submitted one from student view) appears
- [ ] Approve → billing state updates
- [ ] Reject → requires reason

### `/admin/payments` — Payment Request Inbox & Ledger

**"Needs attention" alert**
- [ ] Shows only if any approved payment has `sideEffectsApplied: false`
- [ ] "Retry" button re-runs side effects → toast confirms
- [ ] After retry, alert disappears

**Pending inbox cards**
- [ ] Seeded pending enrollment receipt for Yohannes appears (type: enrollment, ETB 3,000)
- [ ] Card shows: user name, type, amount, expected fee, receipt preview
- [ ] Receipt image renders inline (or PDF viewer for PDFs)
- [ ] Expected-vs-submitted badge (if mismatch)
- [ ] "Review" button opens modal

**Review modal**
- [ ] Student details show (from conversionData: name, phone, learning days)
- [ ] Receipt image/link visible
- [ ] Approve → enrollment activates → student can log in and see their class
- [ ] Reject → requires reason → email notification sent

**PaymentRequest History tab**
- [ ] Tab loads with status filter (All / Approved / Rejected)
- [ ] Date range filter works
- [ ] Text search (by name or reference) works
- [ ] Table columns: Student, Type, Amount, Expected, Reference, Status, Date, Receipt
- [ ] Switch to "Approved" → shows approved records
- [ ] Switch to "Rejected" → shows rejected records
- [ ] Receipt link opens in new tab

**Financial Records table (enrollments + orders)**
- [ ] Seeded order (Instruction Book, ETB 450) appears
- [ ] Type filter: All / Enrollments / Orders
- [ ] Status filter: All / Completed / Pending / Processing / Failed
- [ ] Search by reference works
- [ ] CSV export → downloads file → opens correctly in Excel/Sheets
- [ ] Pagination works

### `/admin/orders` — Order Management
- [ ] Seeded order appears (abel@abelbegena.com, Instruction Book, ETB 450, Processing)
- [ ] Search by customer works
- [ ] Status filter works
- [ ] Click order → detail modal opens
- [ ] Detail shows: items, amounts, payment status, customer
- [ ] Add tracking number + carrier → save → shows on order
- [ ] Mark as Shipped → status changes
- [ ] Mark as Delivered → status changes
- [ ] Reject payment (for PAYMENT_PENDING orders) → stock restored (verify product stock)
- [ ] Pagination

### `/admin/store` — Product Management
- [ ] All 3 seeded products appear
- [ ] Stock stats: total items, low stock count, out-of-stock count
- [ ] Create product: title, price, instrument type, stock, description → save → appears in list
- [ ] Edit product: change price → save → updated
- [ ] Upload product image → preview shows in edit form
- [ ] Image reorder (drag handle or up/down)
- [ ] Delete image
- [ ] Delete product → confirm → removed
- [ ] Low stock badge shows on products near threshold
- [ ] Pagination

### `/admin/comments` — Comment Moderation
- [ ] Comments list loads (may have seeded comment from public test)
- [ ] Approve comment → status changes to approved
- [ ] Reject comment → status changes to rejected
- [ ] Delete comment → removed
- [ ] Search by post title or content
- [ ] Pagination

### `/admin/faq` — FAQ Management
- [ ] 3 seeded FAQs appear
- [ ] Create FAQ: question + answer + order → save → appears
- [ ] Edit FAQ → change answer → save → updated
- [ ] Toggle active/inactive
- [ ] Delete FAQ → confirm → removed
- [ ] Order number determines display order on public FAQ

### `/admin/branches` — Branch Management
- [ ] "Addis Ababa Main Branch" appears
- [ ] Map shows branch marker at correct coordinates
- [ ] Create branch: name, address, lat/lng, phone, radius → save → appears on map
- [ ] Edit branch → change address → save
- [ ] Delete branch → confirm → removed from map
- [ ] Stats cards (total branches, total students)

### `/admin/audit-logs` — Audit Logs
- [ ] Log entries load (actions taken during testing should appear)
- [ ] Filter by action type
- [ ] Filter by user
- [ ] Date range filter
- [ ] Search by resource
- [ ] CSV export → downloads

### `/admin/reports/teacher/[teacher-seed-id]`
**Pre-condition:** navigate from `/admin/users` → Teachers tab → teacher row → "Attendance report"
- [ ] Report page loads
- [ ] Teacher name shows
- [ ] Total sessions, hours displayed
- [ ] Attendance records list (may be empty — no check-ins seeded)

### `/admin/reports/student/[student-participant-id]`
**Pre-condition:** navigate from `/admin/users` → Students tab → Yohannes row → "Report"
- [ ] Report page loads
- [ ] Student name, ID, instrument, duration, registration date shown
- [ ] Attendance panel: 22 present sessions (seeded), stats (rate, present count, absent count)
- [ ] Attendance records list renders, sorted newest first
- [ ] CSV export of attendance → downloads correctly
- [ ] Payment panel: period 1 = Paid (ETB 3,000), billing state (consumed 3, settled 1, owed 2)
- [ ] Overdue badge shows in payment panel

---

## 8. SUPERADMIN PAGES (`/superadmin/*`)

**Login as:** abel@abelbegena.com (SuperAdmin)

### `/superadmin/console` — SuperAdmin Dashboard
- [ ] Page loads
- [ ] System-wide stats visible
- [ ] No access errors

### `/superadmin/admins` — Admin Management
- [ ] Admin users listed
- [ ] Create new admin via form
- [ ] Activate/deactivate admin
- [ ] Delete admin (with confirmation)

### `/superadmin/branches` — Branch Management
- [ ] Same as `/admin/branches` but accessible here too
- [ ] All branches visible across all regions

---

## 9. CROSS-CUTTING FLOWS (Full End-to-End)

These test that multiple pages work together correctly.

### Flow A — Enrollment to Student
1. [ ] Log in as a website user (register a new one if needed)
2. [ ] Go to `/classes`, click enroll on the 6-month class
3. [ ] Fill the `/dashboard/become-student` form (days, time slots, personal info, payment receipt)
4. [ ] Submit → PaymentRequest appears in `/admin/payments` pending inbox
5. [ ] As admin: review → approve the enrollment → receipt saved
6. [ ] Log back in as the new student → `/student` shows their class
7. [ ] Billing state: 0 consumed, 1 paid (initial), owed 0

### Flow B — Attendance drives billing
1. [ ] As admin, record 12 present sessions for Marta (STD-1002) across ~30 days
2. [ ] Check `/admin/monthly-payments` → Marta's periodsConsumed increases
3. [ ] Check Marta's student view → billing card updates
4. [ ] Marta submits a monthly fee receipt
5. [ ] Admin approves → billing settles period 3 → owed drops

### Flow C — Store purchase to delivered
1. [ ] Log in as yohannes.demo
2. [ ] Go to `/store`, add "Begena Strings Set" (ETB 200) to cart
3. [ ] Go to `/cart` → verify item is there
4. [ ] Checkout → fill payment reference → submit
5. [ ] Order appears in `/account/orders` with status PAYMENT_PENDING
6. [ ] As admin, go to `/admin/orders` → find the order → mark as paid
7. [ ] Update tracking number + carrier → mark Shipped → mark Delivered
8. [ ] Student sees "Delivered" status in their order history

### Flow D — Student revert
1. [ ] As admin, go to `/admin/users` → Students tab → Dawit (STD-1003)
2. [ ] From attendance page, revert Dawit to User with reason "completed"
3. [ ] Dawit moves to "Past Students" tab
4. [ ] Log in as Dawit → redirected to `/student` shows limited access (or /dashboard)
5. [ ] Re-enroll Dawit via `/dashboard/become-student` → creates a new enrollment
6. [ ] Admin approves → Dawit becomes student again

---

## 10. PERMISSION BOUNDARIES

Test that users cannot access pages they shouldn't.

- [ ] Student tries to access `/admin/users` → redirected (403 or redirect to student page)
- [ ] Teacher tries to access `/admin/payments` → redirected
- [ ] Non-SuperAdmin Admin tries to access `/superadmin` → redirected
- [ ] Unauthenticated user tries to access `/student` → redirected to `/login`
- [ ] Student tries to access another student's live room (class they're not enrolled in) → disconnected by server

---

## 11. NOTIFICATIONS

- [ ] When admin approves a payment → student gets in-app notification (bell icon)
- [ ] When class goes live → enrolled students get in-app notification
- [ ] When student marked absent → student gets in-app notification
- [ ] Notification bell shows unread count badge
- [ ] Click notification → navigates to relevant page
- [ ] Mark notification as read → badge decrements

---

## Status Summary (fill in as you test)

| Section | Total Items | ✓ Working | ✗ Broken | F Fixed |
|---|---|---|---|---|
| 1. Public pages | | | | |
| 2. Auth / Profile | | | | |
| 3. Dashboard | | | | |
| 4. Student pages | | | | |
| 5. Teacher pages | | | | |
| 6. Live class room | | | | |
| 7. Admin pages | | | | |
| 8. SuperAdmin pages | | | | |
| 9. End-to-end flows | | | | |
| 10. Permissions | | | | |
| 11. Notifications | | | | |

---

*Generated: 2026-06-04 | App version: branch `readiness/modules-1-9-hardening`*
