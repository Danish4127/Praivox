/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Railway / Docker deployment ke liye direct set karein
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig