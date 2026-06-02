import type { NextConfig } from "next";
import path from "path";

// Production-safe Next.js configuration without unsupported experimental flags.
const nextConfig: NextConfig = {
  // Pin the workspace root to this app. The repo's `.git` lives one level up
  // (monorepo: client/ + server/), so Turbopack otherwise infers the parent as
  // the root and resolves node_modules from there — breaking `tailwindcss`.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "abelbegena.onrender.com",
      },
    ],
  },
  // React Compiler is an officially supported opt‑in feature in Next 16.
  // Keeping it enabled for better performance and DX.
  reactCompiler: true,
};

export default nextConfig;
