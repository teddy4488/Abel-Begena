# Abel Begena Platform — Full System Audit Report

**Date:** February 8, 2025  
**Scope:** Architectural and functional audit of the entire codebase (backend, frontend, database, workflows)

---

## Executive Summary

The Abel Begena platform is a multi-purpose system for Ethiopian Orthodox Tewahedo Church (EOTC) liturgical instrument education and commerce. It combines an informational site, e-commerce store, student portal, learning management system (LMS), and administrative tools. The codebase is structured with a NestJS backend, Next.js client, and MongoDB. **Several critical workflows are partially implemented or broken**, and there are **two parallel student/user models** that create confusion and bugs. This report identifies what exists, what is missing, what is redundant, and what must be fixed for production use.

---

## 1. Project Structure Overview

### Backend (NestJS)

| Module | Purpose |
|--------|---------|
| `auth` | JWT auth, roles, guards, password reset, email verification |
| `user` | User CRUD, admin/teacher management |
| `class` | Classes, enrollments, schedules, live state |
| `enrollment` | Enrollment records (classId + studentId) |
| `attendance` | Teacher/student participants, attendance, StudentPayment, InstrumentLesson |
| `payment` | PaymentRequest (receipt uploads, admin approval) |
| `order` | E-commerce orders, cart, checkout |
| `product` | Store products |
| `blog` | Blog posts, comments |
| `faq` | FAQ entries |
| `branch` | Physical branches |
| `materials` | Instrument materials (separate from class materials) |
| `realtime` | WebSocket live room |
| `upload` | File upload (Cloudinary) |
| `audit` | Audit logging |
| `admin` | Dashboard analytics |
| `mail` | Email via HTTP relay |

### Frontend (Next.js)

- Public: `/`, `/store`, `/heritage`, `/classes`, `/branches`, `/virtual-begena`
- Auth: `/login`, `/register`, `/forgot-password`, `/verify-email`, `/change-password`
- Dashboard: `/dashboard` (role-based redirect)
- Student: `/student/*` (attendance, payments, lessons)
- Teacher: `/teacher/*` (classes, materials, live, schedule, students)
- Admin: `/admin/*` (users, classes, enrollments, payments, orders, store, monthly-payments, attendance, analytics, FAQ, branches, audit-logs)
- SuperAdmin: `/superadmin/*` (admins, branches, console)
- E-commerce: `/cart`, `/checkout`, `/account/orders`

---

## 2. System Flow: High-Level Behavior

### Users (Website Visitors)

1. **Registration** → Email verification → Login
2. **Browse** classes (public), store, heritage pages
3. **Enroll** in a class (requires payment or receipt upload)
4. **Dashboard** redirects by role: Student → `/student`, Teacher → `/teacher`, Admin → `/admin`

### Students (Two Paths)

**Path A: “Become Student” (via Enrollment + PaymentRequest)**  
- User enrolls in a class → uploads receipt → admin approves → optionally converts User to Student role + creates `StudentAttendanceParticipant`  
- Uses `Enrollment` (classId + studentId = User._id) and `PaymentRequest`  
- Student-facing features: My Classes, My Payments (if converted), Live Class

**Path B: Admin-Registered Students (Attendance Module)**  
- Admin registers student via `/attendance/students/register` → creates `User` (role Student) + `StudentAttendanceParticipant`  
- Uses `StudentAttendanceParticipant` for attendance, `StudentPayment` for monthly tuition  
- Student-facing features: attendance, payments, lessons, upcoming payments

**Problem:** These two paths create **two different student identities**:
- Enrollment uses `User` (studentId)
- Attendance uses `StudentAttendanceParticipant` (participantId) with `userId` → User

Students created via “become student” may not have a `StudentAttendanceParticipant` record; students created via admin may not have `Enrollment` records. There is no enforced link between them.

### Admins

- Manage users, teachers, classes, enrollments, store, FAQ
- Review payment requests (enrollment, order, student_monthly_fee)
- Record student attendance and monthly payments
- View analytics, overdue payments, graduation eligibility
- Branch-scoped admins (Phase 5.3) see only their branch

### Teachers

- Create blog posts, upload materials
- View students in their classes
- Manage schedule, live sessions
- Teacher attendance (check-in/check-out) is admin-driven

### SuperAdmin

- Manage admins and branches
- No branch scope

---

## 3. Unused, Redundant, and Dead Code

### Unused or Disconnected

| Item | Location | Notes |
|------|----------|-------|
| `student_conversion` payment type | `payment-request.schema.ts` | Exists but no clear UI flow for “convert user to student” without enrollment |
| `tuition` payment type | `payment-request.schema.ts` | Not used in any known workflow |
| `getAttendanceReport` with `studentId` | `attendance.controller.ts` | Returns `[attendance, payments]` for `studentId`; `studentId` here is participantId. Inconsistent with `getStudentAttendanceRecords` which expects userId |
| `StudentPaymentsModal` | `admin/monthly-payments` | Uses `getStudentUpcomingPaymentsQuery` with `id` (participantId) – correct for admin context |
| `recordStudentPayment` admin modal | `admin/monthly-payments` | Uses `participantId` – correct |

### Redundant / Duplicated

| Item | Notes |
|------|-------|
| Lessons API | Exposed on both `/attendance/lessons` and `/classes/lessons` – same `AttendanceService.listInstrumentLessons` |
| Student list | Enrollments use User; attendance uses StudentAttendanceParticipant – no single “students” view |
| Payment pages | `/admin/payments` (enrollment + orders) vs `/admin/monthly-payments` (StudentPayment) – separate flows, could be unified in UX |

### Partially Implemented

| Feature | Status |
|---------|--------|
| Payment gateway (Chapa/Telebirr/Stripe) | Not integrated; all payments are offline/receipt-based |
| Live class | WebRTC/live room exists; integration with class enrollment/access is partial |
| Virtual Begena | Standalone feature; not tied to enrollment or progress |
| Blog approval workflow | Teachers create; admin approval flow not clearly enforced in UI |
| Instrument materials | `materials` module (InstrumentMaterial) is separate from `Class.materials` (inline array) |

---

## 4. Database Design and Relationships

### Collections

| Collection | Purpose |
|------------|---------|
| `User` | Auth, roles (User, Teacher, Admin, Student, SuperAdmin), profiles |
| `Enrollment` | classId + studentId (User), status, payment info |
| `Class` | Title, instrument, level, instructor, schedule, materials |
| `StudentAttendanceParticipant` | Student profile for attendance (userId → User) |
| `TeacherAttendanceParticipant` | Teacher profile (userId → User) |
| `StudentAttendance` | participantId → StudentAttendanceParticipant, lessonId |
| `TeacherAttendance` | Check-in/out for teachers |
| `StudentPayment` | participantId → StudentAttendanceParticipant, month/year, status |
| `InstrumentLesson` | classId → Class, used for attendance |
| `PaymentRequest` | userId, type, targetId, receipt, status |
| `Order` | user → User, items, status |
| `Product` | Store items |
| `BlogPost`, `Comment` | Blog |
| `Faq` | FAQ |
| `Branch` | Physical locations |
| `InstrumentMaterial` | Teacher materials (separate from Class.materials) |
| `AuditLog` | Admin actions |

### Relationship Issues

1. **Enrollment.studentId vs StudentAttendanceParticipant**  
   - Enrollment uses `User._id`  
   - Attendance uses `StudentAttendanceParticipant` with `userId`  
   - `StudentPayment` uses `participantId` (StudentAttendanceParticipant._id)  
   - **No FK**: Enrollment is not linked to StudentAttendanceParticipant. A student can be enrolled in classes without ever having a participant record for attendance/payments.

2. **PaymentRequest.targetId semantics**  
   - For `student_monthly_fee`, `targetId` is stored as User._id (from `req.user.sub`)  
   - But `recordStudentPayment` expects `participantId` (StudentAttendanceParticipant._id)  
   - **Bug**: Approval flow passes `targetId` (User._id) as `participantId`, causing incorrect or failed records.

3. **User.studentProfile vs StudentAttendanceParticipant**  
   - `User.studentProfile` holds attendanceNumber, fullName, branchId, etc.  
   - `StudentAttendanceParticipant` also holds fullName, attendanceNumber, etc.  
   - Redundant; invites drift between User and participant.

4. **Class.materials vs InstrumentMaterial**  
   - Class has inline `materials: { title, url, uploadedAt }[]`  
   - `InstrumentMaterial` is a separate schema for “instrument materials”  
   - Overlap in purpose; unclear when to use which.

### Normalization / Denormalization

- `StudentAttendance` denormalizes `attendanceNumber`, `studentName` – acceptable for audit trail.
- `StudentPayment` has both `dueDate` and `dueDates` (and legacy `duedate`) – schema is overloaded; some logic uses `period` + `dueDates`, some uses `month`/`year`.
- `PaymentRequest.conversionData` (JSON string) – flexible but harder to query and validate.

---

## 5. Attendance and Monthly Payment Systems

### Attendance

**Implemented:**
- Teacher check-in/check-out (admin records)
- Student attendance by participant + lesson + status (present/late/excused/absent)
- One record per student per day
- InstrumentLesson used for lessons; participant must match instrument
- `missedLessonsCount` incremented on absent
- Reports: student attendance, teacher attendance, summary by date range

**Gaps:**
- No automatic link between Class schedule and attendance sessions
- No batch attendance (e.g. by class/date)
- InstrumentLesson is class-scoped; attendance is participant-scoped – no explicit link to “which class session” this was
- Students created via enrollment may not have a participant record and thus cannot have attendance

### Monthly Payments

**Implemented:**
- 30-day rolling schedule from `registrationStartDate`
- `StudentPayment`: month, year, status (paid/partial/unpaid), period, dueDates
- Admin can record payments manually
- Students can submit receipts → `PaymentRequest` (student_monthly_fee) → admin approves
- Overdue and upcoming payment views
- Billing summary by month
- Graduation eligibility (months paid + sessions)

**Gaps / Bugs:**
1. **Approval bug:** When approving `student_monthly_fee`, `payment.targetId` is User._id but `recordStudentPayment` expects `participantId`. Must resolve participant from User first.
2. **Payment reminder email:** `getOverduePayments` and `getUpcomingPaymentsForAllStudents` select `email` on `StudentAttendanceParticipant`, but that schema has no `email` field. Email comes from User via `userId`. **Reminders never send** because email is always undefined.
3. **Submit monthly payment:** `POST /payments/student/monthly` has no `@Roles('Student')` – any authenticated user can submit; will fail for non-students when lookup fails.
4. **Revenue calculation:** Monthly payments page uses a placeholder (e.g. 5000 per paid item) instead of real amounts from `StudentPayment`.

---

## 6. Payment Flows: Receipt Uploads, Approvals, Billing

### PaymentRequest Flow

1. User creates `PaymentRequest` (enrollment, order, student_monthly_fee, etc.) with receiptUrl
2. Admin lists pending requests, approves or rejects
3. On approval:
   - **enrollment** → `Enrollment` status updated, optionally `convertUserToStudent` + first `StudentPayment`
   - **order** → Order marked paid, stock reduced
   - **student_monthly_fee** → `recordStudentPayment` (broken: wrong participantId)
   - **student_conversion** → `convertUserToStudent` only

### Connection to Billing

- Enrollment approval can create first `StudentPayment` when `conversionData` is present
- Monthly fee approval should create/update `StudentPayment` – **broken** due to participantId mix-up
- No automatic “payment request → billing record” audit trail; manual recording is an alternative path

### Overdue Tracking

- `getOverduePayments` uses 30-day schedule from registration
- Correctly finds unpaid periods
- **Email reminders fail** because participant has no email; need to populate from User

### Reporting

- Admin analytics combines order revenue + student payment revenue
- Student payment report per participant exists
- CSV export on admin payments page is for enrollments + orders only, not monthly tuition

---

## 7. Role Management

| Role | JWT | Access |
|------|-----|--------|
| User | website_user | Dashboard, classes, enroll, store, profile |
| Student | student | Student portal, attendance, payments, lessons |
| Teacher | teacher | Teacher dashboard, posts, materials, students, schedule, live |
| Admin | admin | Admin panel, branch-scoped if branchId set |
| SuperAdmin | admin | Full access, no branch scope |

**Guards:**
- `JwtAuthGuard` – requires valid token
- `RoleGuard` – checks role (and userType)
- `SuperAdminGuard` – SuperAdmin only
- `BranchScopeGuard` – restricts to branch
- `ClassOwnerGuard` – instructor only
- `EnrolledGuard` – enrolled in class

**Issues:**
- `POST /payments/student/monthly` is not restricted to Student; should add `@Roles('Student')`
- Teacher can access `getStudentAttendanceReport` and `getStudentPaymentReport` by id – may expose other students if validation is weak
- Student/teacher/admin separation is mostly correct; main gaps are in payment and participant resolution

---

## 8. Feature Completeness

### Marketing / Public

- Homepage, heritage, branches, virtual-begena – implemented
- Classes public catalog – implemented
- Store – product list, product detail – implemented
- FAQ – implemented
- Blog – posts visible; comments may require login

### E-commerce

- Cart, checkout – implemented
- Offline payment (receipt upload) – implemented
- Order status flow – implemented
- Stock management – implemented
- No Chapa/Telebirr/Stripe integration

### Course Enrollment

- Public class list – implemented
- Enroll with payment receipt – implemented
- Admin approval – implemented
- User→Student conversion on approval – implemented
- Connection to attendance/participant – partial; conversion creates participant, but enrollment and attendance are not always aligned

### Materials

- `Class.materials` – inline array updated via class API
- `InstrumentMaterial` – separate materials module for teachers
- Teacher materials page – implemented
- Class materials in teacher class view – implemented
- Overlap between the two concepts

### Blog / Content

- Blog CRUD – implemented
- Comments – implemented
- Approval workflow – mentioned in PROJECT_IDEA; not clearly enforced in UI
- FAQ – implemented

### Notifications

- Email verification, password reset – implemented
- Teacher/student credentials – implemented
- Payment overdue / due-soon – implemented but **broken** (no email on participant)
- No in-app notifications

---

## 9. Improvement Recommendations

### Critical (Must Fix)

1. **Fix student monthly payment approval**  
   When approving `student_monthly_fee`, resolve `StudentAttendanceParticipant` from `PaymentRequest.userId` (User._id) and pass `participant._id` to `recordStudentPayment`.

2. **Fix payment reminder emails**  
   In `getOverduePayments` and `getUpcomingPaymentsForAllStudents`, populate `userId` with User and use `User.email` instead of selecting `email` on participant (which does not exist).

3. **Restrict student monthly payment endpoint**  
   Add `@Roles('Student')` to `POST /payments/student/monthly` so only students can submit.

### High Priority

4. **Unify student identity**  
   - Option A: Use a single source of truth (e.g. User + StudentProfile) and phase out StudentAttendanceParticipant for identity, or  
   - Option B: Ensure every Student has a participant record and keep Enrollment ↔ Participant linkage explicit (e.g. sync on conversion).

5. **Clarify materials model**  
   - Decide: one materials system (InstrumentMaterial vs Class.materials) or clear roles for each.

6. **Payment request → billing audit**  
   - When a PaymentRequest is approved and creates a StudentPayment, store a reference (e.g. paymentRequestId) for traceability.

7. **Revenue calculation**  
   - Use actual `StudentPayment.amount` in admin monthly payments page instead of placeholder values.

### Medium Priority

8. **Remove duplicate lessons API**  
   - Expose lessons from one place (e.g. `/classes/lessons` only).

9. **Remove or implement `tuition` and `student_conversion`**  
   - Either implement full flows or remove them to avoid confusion.

10. **StudentPayment schema cleanup**  
    - Standardize on `dueDates` + `period`; deprecate `duedate` and reduce overloaded `dueDate` usage.

### Lower Priority

11. **Integrate payment gateway**  
    - Chapa/Telebirr/Stripe for automatic payment confirmation.

12. **Batch attendance**  
    - Record attendance by class/session for multiple students at once.

13. **Unified admin payments view**  
    - Single page for enrollment payments, orders, and monthly tuition with filters.

14. **In-app notifications**  
    - For new comments, payment approvals, etc.

---

## 10. Summary Table

| Area | Status | Notes |
|------|--------|-------|
| Auth & roles | ✅ | Solid; minor endpoint restrictions |
| Enrollment | ✅ | Works; receipt approval and conversion |
| Attendance | ⚠️ | Works but disconnected from enrollment students |
| Monthly payments | ❌ | Approval bug; reminder emails broken |
| Payment requests | ✅ | Works for enrollment and orders |
| E-commerce | ✅ | Works; offline only |
| Store/products | ✅ | Implemented |
| Blog/FAQ | ✅ | Implemented |
| Materials | ⚠️ | Two overlapping systems |
| Live/WebRTC | ⚠️ | Implemented; integration partial |
| Analytics | ✅ | Implemented |
| Database design | ⚠️ | Dual student model; schema clutter |
| Payment reminders | ❌ | Emails never sent |

---

## 11. Post-Refactor Updates (February 2025)

The following changes were implemented as part of the Abel Begena Platform Refactor:

### Payment consolidation
- **Payment request types** reduced to three: `enrollment`, `order`, `student_monthly_fee`. Removed `tuition` and `student_conversion` from schema, DTOs, and services. Become-student flow uses enrollment + receipt only.
- **Student payment status** simplified to `paid` | `unpaid`; `partial` removed from schema, attendance service, admin analytics, and all client UI (student payments, admin monthly-payments, analytics). Seed and types updated.

### Student monthly approval bug
- On `student_monthly_fee` approval, the backend now **resolves `StudentAttendanceParticipant` by `payment.userId`** (not `targetId`) and calls `recordStudentPayment(participantId, ...)`. `AttendanceService.getParticipantIdByUserId` added. `submitStudentMonthlyPayment` creates requests with `userId` only; participant is resolved on approval. `POST /payments/student/monthly` is restricted to `@Roles('Student')` with RoleGuard.

### Payment reminders (email)
- **Overdue and due-soon reminders** now use the **User’s email**. `UserService.getEmailsByIds(ids)` added. `getOverduePayments` and `getUpcomingPaymentsForAllStudents` load emails via this map and attach to each result so reminder emails are sent to the correct address.

### Class capacity
- **Capacity** removed from Class schema, service (create/update/select/return, enrollment check), DTOs, and from admin and public class UI. Public classes page shows “Enrolled: N” instead of capacity.

### Teacher attendance
- **`sessionDate`** (calendar date) added to `TeacherAttendance` schema and set on teacher check-in to the start of the day for reporting.

### Audit logging
- **SuperAdmin** included in audit interceptor (Admin and SuperAdmin actions logged). **@AuditLog** added to admin mutate endpoints: payment decision, user create/update/remove/avatar, teacher update/remove, class create/update/remove/assign-instructor, order status, attendance (teacher/student register, participant update/remove, check-in/out, student attendance record, billing pay, lesson create/update/delete).

### Shared utilities
- **`notDeletedFilter()`** centralized in `server/src/common/filters/not-deleted.filter.ts` and used from payment, branch, order, product, blog, comment, and FAQ services. **Password hashing** single source: removed duplicate from AttendanceService; UserService remains the only place for hash/compare.

### Materials clarification
- **Instrument materials** (InstrumentMaterial collection) documented as class- and optionally lesson-scoped; **Class.materials** (embedded on Class) documented as separate and used for class access. JSDoc and controller comments added.

### Order and payment notifications
- **Order confirmation email** sent after checkout (MailService.sendOrderConfirmationEmail). **Payment approved email** sent when a payment request is approved (MailService.sendPaymentApprovedEmail). OrderService and PaymentService inject MailService and UserService; emails are best-effort (errors logged, not thrown).

### Teacher approval UI and reports
- **Teacher status** remains in admin users table. **Teacher attendance report**: new endpoint `GET /attendance/reports/teacher/by-user/:userId/attendance` (resolves participant by userId); new client page `/admin/reports/teacher/[userId]` and “Attendance report” link for teachers in admin users. File type validation for materials/receipts already enforced via UploadService options.

### Triple-student sync
- **Conversion** explicitly documented: `convertUserToStudent` updates User (role + studentProfile) and creates `StudentAttendanceParticipant`; callers (e.g. enrollment approval) use returned `student._id` to record the first StudentPayment for minimal sync.

### Security
- **ValidationPipe** (whitelist, forbidNonWhitelisted, transform), **helmet**, and **CORS** (explicit origins, methods, credentials) were already in place; no additional security changes in this refactor.

### Summary table (revised)

| Area | Status | Notes |
|------|--------|-------|
| Monthly payments | ✅ | Approval uses userId → participant; reminders use User email |
| Payment reminders | ✅ | Emails sent using User email from getEmailsByIds |
| Materials | ✅ | Clarified: instrument materials vs Class.materials |
| Audit | ✅ | SuperAdmin + all admin mutates logged |
| Teacher reports | ✅ | Report by userId + link from admin users |

---

*End of Audit Report*
