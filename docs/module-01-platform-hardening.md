# Module 1 — Platform & Security Hardening

## Purpose
Hardens the platform foundation before feature work: production-safety config, secret hygiene, global error handling, dependency security. No user-facing features. Every other module depends on this being solid.

## User stories
None. Infrastructure and configuration only.

---

## Operator actions required (manual)

1. Rotate MongoDB Atlas password — current server/.env value is live.
2. Rotate Cloudinary API key and secret — live in server/.env.
3. Generate strong JWT_SECRET (min 64 chars): openssl rand -hex 32
4. On Render (server): NODE_ENV=production, MONGO_URI, JWT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, FRONTEND_URI, ENABLE_SWAGGER=false, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, MEETING_PROVIDER_BASE_URL, PORT
5. On Vercel (client): NEXT_PUBLIC_API_URL=https://your-render-server.onrender.com
6. Clean local server/.env — replace real values with .env.example placeholders.

---

## Code changes implemented

| File | What changed | Why |
|---|---|---|
| server/seed.ts | Production guard (exits if NODE_ENV=production); --force-drop flag gates collection wipe; hardcoded password replaced with SEED_ADMIN_PASSWORD env var | Prevents accidental prod DB wipe; removes known-weak credential |
| server/src/common/filters/http-exception.filter.ts | Created AllExceptionsFilter | Normalizes all error shapes; hides stack traces in production |
| server/src/main.ts | ENABLE_SWAGGER default changed to false; global filter registered; JWT_SECRET startup validation added | Swagger off by default in prod; consistent error JSON; fail-fast on insecure secret |
| server/.env.example | Added NODE_ENV, FRONTEND_URI, ENABLE_SWAGGER, EMAIL_*, SEED_ADMIN_PASSWORD, THROTTLE_* | Complete reference for all required env vars |
| client/next.config.ts | Added res.cloudinary.com to remotePatterns; removed placeholder example.com | Enables Next.js Image for Cloudinary-served images |

---

## Verification checklist

- [ ] NODE_ENV=production seed run exits immediately with error message
- [ ] Seed without --force-drop skips collection wipe
- [ ] The string password123 no longer appears in seed.ts
- [ ] GET /docs returns 404 when ENABLE_SWAGGER is unset
- [ ] API errors return JSON with statusCode, timestamp, path, message fields
- [ ] Stack trace absent from error responses in production mode
- [ ] npx tsc --noEmit passes in server/
- [ ] npx tsc --noEmit passes in client/
- [ ] Cloudinary-hosted images load in Next.js Image components
- [ ] Operator has rotated Atlas, Cloudinary, and JWT_SECRET credentials
- [ ] server/.env contains no real credential values
