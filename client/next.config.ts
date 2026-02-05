import type { NextConfig } from "next";

// Production-safe Next.js configuration without unsupported experimental flags.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
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
