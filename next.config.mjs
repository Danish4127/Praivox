/** @type {import('next').NextConfig} */
const nextConfig = {
  // Agar build Vercel par chal rahi hai toh undefined, warna Railway/Docker ke liye 'standalone'
  output: process.env.VERCEL ? undefined : 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig