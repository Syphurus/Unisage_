/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Allow images from any domain (for content previews) */
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  /* Proxy API requests in development to avoid CORS */
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/backend/:path*",
            destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
