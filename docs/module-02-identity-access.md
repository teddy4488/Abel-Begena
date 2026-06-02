# Module 2 — Identity & Access

## Purpose
Fixes three security blockers in the auth/RBAC system and hardens session management, role enforcement, and teacher identity. All other modules depend on these being correct.

## User stories (from PROJECT_IDEA.md)
- **U-001** Register with email → verify → login
- **U-002** Log in securely (JWT, protected routes)
- **U-008** Update profile
- **A-001** Admin manages users (activate/deactivate, soft-delete)
- **A-002** Admin manages teachers (approve/suspend); SuperAdmin creates and assigns branches
- **G-003** Guest can register

## Decisions made in this module

| Decision | Choice |
|---|---|
| User→Student model | Keep role-change model as-is. Student is a distinct identity (own profile, attendance, payment tracking). Add a revert endpoint if needed later. |
| Teacher branch assignment | Only **SuperAdmin** assigns branches to teachers. Admin can approve/suspend teachers in their branch. |
| Teacher branches | Array (`branchIds: ObjectId[]`) — a teacher can serve multiple branches. |
| Teacher creation | SuperAdmin only. At least one `branchId` is required to create a teacher. |
| Class assignment validation | Server enforces: teacher's `branchIds` must include the class's branch (enforced in Module 5). |
| Single SuperAdmin | Created directly in DB via seed. No creation endpoint. |
| isVerified bypass | Intentional dev accommodation (email delivery unavailable). Gated by `EXPOSE_DEV_CODES` env var. Will be removed before production. |

## Code changes implemented

| File | What changed | Why |
|---|---|---|
| server/src/user/schemas/user.schema.ts | Added `branchIds: ObjectId[]` for Teacher branch assignment | Teachers can serve multiple branches |
| server/src/user/dto/create-user.dto.ts | Added `branchIds?: string[]`; password MinLength 6→8 | Schema alignment; stronger passwords |
| server/src/user/dto/update-user.dto.ts | Added `branchIds?: string[]`; password MinLength 6→8 | Schema alignment; stronger passwords |
| server/src/user/user.service.ts | Handle `branchIds` in `create`; clear refresh token in `resetPasswordWithCode`; `findTeachers` accepts branchId filter | Teacher branch scoping; session invalidation on password reset |
| server/src/user/user.controller.ts | Strip `role`, `branchId`, `branchIds` from `PATCH /users/:id` | Blocker: Admin→SuperAdmin escalation via role field |
| server/src/user/admin-teacher.controller.ts | POST (create) → SuperAdmin only + `branchIds` required; GET scoped by Admin's branch | Enforces teacher creation policy |
| server/src/auth/auth.service.ts | `validateUser`: reject if `isActive===false`; `refreshSession`: live role from DB + isActive check; dev codes behind `EXPOSE_DEV_CODES` flag; `changePassword`: clear refresh token | Multiple auth hardening fixes |
| server/src/auth/auth.controller.ts | Fix `@Throttle` ttl from 60ms → correct ms values | Blocker: throttler units bug (60ms ≈ no protection) |
| server/src/auth/auth.module.ts | Remove `'development_secret'` JWT fallback | Major: forged tokens if JWT_SECRET unset |
| server/src/auth/strategies/jwt.strategy.ts | Remove `'development_secret'` JWT fallback | Same |
| server/src/auth/dto/change-password.dto.ts | MinLength 6→8 | Stronger passwords |
| server/src/auth/dto/reset-password.dto.ts | MinLength 6→8 | Stronger passwords |
| client/src/store/slices/authSlice.ts | Remove `token` from localStorage persistence | Major: XSS-stealable token; httpOnly cookie is the real auth |
| client/src/middleware.ts | Created Next.js route protection middleware | Blocks unauthenticated access to protected segments at edge |

## Verification checklist

- [ ] `PATCH /users/:id` with `{ "role": "SuperAdmin" }` returns 400/forbidden (role stripped)
- [ ] Login with 6+ failed attempts in 5 min → 429 Too Many Requests
- [ ] Deactivated user login returns 401 (not a successful session)
- [ ] Deactivated user's refresh token returns 401
- [ ] On token refresh, role change takes effect immediately (no stale role)
- [ ] Password reset: old refresh token is invalidated after reset
- [ ] Change password: old refresh token is invalidated
- [ ] Teacher creation without `branchIds` → 400
- [ ] Admin cannot create a teacher (forbidden)
- [ ] Admin teacher list shows only teachers in Admin's branch
- [ ] `localStorage` does not contain the access token string after login
- [ ] Navigating to `/admin` without a cookie redirects to `/login`
- [ ] `npx tsc --noEmit` passes in server/ and client/
