/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-quill pulls in Quill; transpiling avoids bad dynamic chunks in App Router dev.
  transpilePackages: ["react-quill"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;