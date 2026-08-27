/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // "standalone" bundles a minimal, self-contained server for Docker
  // deployments (AWS/Azure/GCP/VPS) - but it conflicts with Vercel's own
  // build/output pipeline, so it's only enabled when NOT building on
  // Vercel. Vercel sets process.env.VERCEL=1 automatically during its
  // builds, so this switches automatically with no manual config needed.
  output: process.env.VERCEL ? undefined : 'standalone',
}

export default nextConfig
