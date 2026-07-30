import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      /*
       * Admin-uploaded product images live on Vercel Blob. Without this,
       * next/image refuses the host outright and every uploaded image 400s —
       * the static ones under /public keep working, which makes the failure
       * look like a bad upload rather than a config gap.
       */
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
