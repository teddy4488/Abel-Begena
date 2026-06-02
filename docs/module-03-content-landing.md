# Module 3 — Content & Landing

## Purpose
Fixes content management, security hardening of uploads, and wires the notification and audit-log features that were built server-side but never connected to the UI.

## User stories (from PROJECT_IDEA.md)
- **T-001** Teacher creates and publishes blog posts / lessons (markdown, draft → pending → admin approves)
- **A-007** Admin manages content: blogs (approval workflow), FAQ, homepage — teachers write, admin approves
- **G-002** Guest reads blog posts; comments require login and are reviewed before appearing

## Code changes implemented

| File | What changed | Why |
|---|---|---|
| server/src/blog/blog.service.ts | `findAllForManagement` scoped to own posts when actor is Teacher | Teachers were seeing all teachers' drafts/pending posts |
| server/src/blog/blog.controller.ts | Pass `req.user` to manage-list; add multer stream-level size limit on image upload; add `@AuditLog` to create/update/delete | Server-side scope; DoS hardening; audit trail |
| server/src/blog/comment.service.ts | New comments default `status: 'pending'` (was `'approved'`) | Enables real approval workflow; UI copy now accurate |
| server/src/blog/comment.controller.ts | Add `@AuditLog` to `updateStatus` | Audit trail for comment moderation |
| server/src/faq/faq.controller.ts | Add `@AuditLog` to create/update/delete | Audit trail |
| server/src/branch/branch.controller.ts | Add `@AuditLog` to create/update/delete | Audit trail |
| server/src/audit/audit.controller.ts | Restrict to SuperAdmin only (was any Admin) | Branch Admins were seeing cross-branch audit events |
| server/src/user/user.controller.ts | Add multer stream-level size limit to avatar upload routes | DoS hardening |
| server/src/product/product.controller.ts | Add multer stream-level size limit | DoS hardening |
| server/src/materials/materials.controller.ts | Add multer stream-level size limit | DoS hardening |
| server/src/class/class.controller.ts | Add multer limit to second upload route (line ~348) | DoS hardening |
| client/src/store/api/notificationApi.ts | Created RTK Query notification API (list + mark-as-read) | Notifications existed only on server; no client API existed |
| client/src/store/api/auditApi.ts | Created RTK Query audit log API (list + export URL) | No client API for audit logs existed |
| client/src/store/store.ts | Registered notificationApi and auditApi | Required for RTK Query to function |
| client/src/components/layout/NotificationBell.tsx | Created notification bell with badge and dropdown | First visible notification UI |
| client/src/components/layout/Navbar.tsx | Added NotificationBell for logged-in users | Wires notification bell into the global header |
| client/src/app/admin/audit-logs/page.tsx | Built full audit log viewer (was a redirect to /admin/console) | Admins had no UI to view audit logs |
| client/src/components/branches/BranchesPublicMap.tsx | Replace default Leaflet marker with `divIcon` | Default marker PNGs 404 in Next.js/webpack builds |
| client/src/components/branches/BranchAdminMap.tsx | Same fix | Same |
| client/src/locales/am.json | Added 26 missing AM keys; removed 2 orphaned AM keys | i18n parity |

## Verification checklist

- [ ] Teacher can only see their own posts at `GET /blog/manage/list` (not other teachers')
- [ ] Posting a comment does not make it appear immediately — "reviewed before publishing" is shown
- [ ] Admin can approve/reject comments at `/admin/comments`
- [ ] `@AuditLog` fires for blog/FAQ/branch mutations in the audit log table
- [ ] `GET /audit-logs` returns 403 for branch Admin (SuperAdmin only)
- [ ] Uploading a 50MB file to any route is rejected at the stream level (not after buffering)
- [ ] Notification bell shows in Navbar for logged-in users
- [ ] Unread count badge increments when a new notification arrives
- [ ] Mark-as-read works from the dropdown
- [ ] `/admin/audit-logs` shows a table with real data (no redirect)
- [ ] Branch map markers are visible (green circles with pin dots)
- [ ] Amharic admin console, enrollment receipt, and nav labels are translated
- [ ] `npx tsc --noEmit` passes in server/ and client/
