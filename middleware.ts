import { authMiddleware } from "@civic/auth-web3/nextjs/middleware"

export default authMiddleware();

export const config = {
  // Match only the verifier, admin, and API verifier routes
  matcher: [
    '/verifier/:path*',
    '/admin/:path*',
    '/api/verifier/:path*'
  ],
}
