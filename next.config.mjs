/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Keep native / node-only packages out of the client + server bundle
  serverExternalPackages: ['better-sqlite3', 'nodemailer', 'bcryptjs'],
}

export default nextConfig
