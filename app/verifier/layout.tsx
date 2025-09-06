'use client'

import { CivicAuthProvider } from "@civic/auth-web3/nextjs";

export default function VerifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CivicAuthProvider>
      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </CivicAuthProvider>
  );
}