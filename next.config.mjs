/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // "standalone" bundles a minimal, self-contained server (node_modules
  // trimmed to only what's needed) - this is what makes Docker images
  // small and lets the app run on ANY host (AWS/Azure/GCP/VPS), not just
  // Vercel. See Deployment Requirements addendum (Cloud & Server Hosting).
  output: 'standalone',
}

export default nextConfig
