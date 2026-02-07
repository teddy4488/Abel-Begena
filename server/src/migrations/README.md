# Migrations

These scripts are **only needed if you have existing data** from before Phase 5.

- **Empty database:** Use `npm run seed` instead. No migrations required.
- **Existing data:** Run in order:
  1. `npm run migration:consolidate-identity` — copies Teacher, AdminUser, and StudentAttendanceParticipant (with email) into the User collection and sets roles/profiles.
  2. `npm run migration:enrollments` — copies `Class.enrollments` into the Enrollment collection.

Run from the `server` directory.
