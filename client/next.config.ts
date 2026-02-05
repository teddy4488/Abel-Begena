import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      // Explicitly tell Next.js that the Turbopack workspace root
      // is the repo root one level above this `client` folder.
      root: "..",
    },
  },
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
  reactCompiler: true,
};

export default nextConfig;
