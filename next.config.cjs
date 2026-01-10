/** @type {import('next').NextConfig} */
const repo = "xtgifting.github.io"; // ← replace with your GitHub repo name

const nextConfig = {
  output: "export",
  images: { unoptimized: true },

  basePath: process.env.GITHUB_PAGES ? `/${repo}` : "",
  assetPrefix: process.env.GITHUB_PAGES ? `/${repo}/` : "",
};

module.exports = nextConfig;
