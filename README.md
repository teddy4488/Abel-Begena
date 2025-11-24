# Abel Begena Platform

Abel Begena is a monorepo housing the public-facing experience and backend services for Ethiopian Orthodox Tewahedo Church (EOTC) liturgical instrument education and commerce.

## Tech Stack

- `client/` – Next.js 14 (App Router), TypeScript, TailwindCSS, Redux Toolkit ready, lucide-react icons.
- `server/` – NestJS, TypeScript, Mongoose ODM targeting MongoDB Atlas (free tier).
- Assets & Media – Cloudinary (free tier) for instrument imagery and lesson media.
- Deployments – Vercel (client) and Render (server).

## Prerequisites

- Node.js 18+
- npm 10+
- MongoDB Atlas cluster + connection string.
- Cloudinary account (free tier) for uploads.

## Getting Started

```bash
git clone <repo>
cd abel-begena
```

### Client (Next.js)

```bash
cd client
npm install
npm run dev
```

Key configuration:

- `tailwind.config.ts` exposes brand colors (`primary`, `secondary`, `background`).
- `src/app/globals.css` defines serif headings, sans body, and parchment backgrounds.
- Install Redux-related packages when state management work begins.

### Server (NestJS)

```bash
cd server
npm install
npm run start:dev
```

Next steps:

- Configure `MongooseModule.forRoot(process.env.MONGO_URI)` in `app.module.ts`.
- Add schemas/modules for instruments, store, payments, and LMS flows.

## Environment Variables

Create `.env` files in `client/` and `server/` respectively. Suggested keys:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `MONGO_URI`

## Deployment Notes

- Client on Vercel: set environment variables via Project Settings → Environment Variables.
- Server on Render: create a Web Service, configure the same env vars, and ensure the MongoDB Atlas IP whitelist includes Render.

With the scaffold in place, you can now focus on implementing the LMS, commerce, and admin flows outlined in `PROJECT_IDEA.md`.

