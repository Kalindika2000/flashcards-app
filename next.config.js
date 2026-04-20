/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-quill pulls in Quill; transpiling avoids bad dynamic chunks in App Router dev.
  transpilePackages: ["react-quill"],
};

module.exports = nextConfig;