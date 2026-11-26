/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Pitch deck: static files in public/deck (HTML + three.js, no build step).
  // /deck opens the light version, /deck/dark the dark one.
  async redirects() {
    return [
      { source: "/deck", destination: "/deck/index.html", permanent: false },
      { source: "/deck/dark", destination: "/deck/dark.html", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;