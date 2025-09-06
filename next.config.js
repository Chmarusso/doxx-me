const { createCivicAuthPlugin } = require("@civic/auth-web3/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Ensure Prisma client is properly handled in serverless environments
  output: 'standalone',
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: "8ddee218-4e5d-49c5-b13b-c84820a31384",
  include: ["/verifier/*", "/admin/*", "/api/verifier/*"],
  loginUrl: "/verifier/login",
  loginSuccessUrl: "/verifier/dashboard",
  logoutUrl: "/verifier/login"
});

module.exports = withCivicAuth(nextConfig);
