/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Root post-login redirects
      { source: "/dashboard", destination: "/world", permanent: true },
      { source: "/home", destination: "/world", permanent: true },
      { source: "/overview", destination: "/world", permanent: true },
      { source: "/work", destination: "/world", permanent: true },
      { source: "/explorer", destination: "/context", permanent: true },
      { source: "/graph", destination: "/world", permanent: true },
      { source: "/pipeline", destination: "/handoffs", permanent: true },
      { source: "/inbox", destination: "/world", permanent: true },
      
      // Marketing section redirects
      { source: "/platform", destination: "/#platform", permanent: true },
      { source: "/how-it-works", destination: "/#how-it-works", permanent: true },
      { source: "/security", destination: "/#security", permanent: true },
      
      // All old sub-routes
      { source: "/dashboard/overview",     destination: "/world",        permanent: true },
      { source: "/dashboard/explorer",     destination: "/context",      permanent: true },
      { source: "/dashboard/graph",        destination: "/world",        permanent: true },
      { source: "/dashboard/inbox",        destination: "/world",        permanent: true },
      { source: "/dashboard/pipeline",     destination: "/handoffs",     permanent: true },
      
      { source: "/dashboard/integrations", destination: "/integrations", permanent: true },
      { source: "/dashboard/partitions",   destination: "/partitions",   permanent: true },
      { source: "/dashboard/api",          destination: "/api",          permanent: true },
      { source: "/dashboard/settings",     destination: "/settings",     permanent: true },
      { source: "/dashboard/profile",      destination: "/profile",      permanent: true },
      { source: "/dashboard/identity",     destination: "/identity",     permanent: true },
      { source: "/dashboard/projects",     destination: "/projects",     permanent: true },
      // Catch-all for any other /dashboard/* path
      { source: "/dashboard/:path*",       destination: "/:path*",       permanent: true },
    ];
  },
};

module.exports = nextConfig;
