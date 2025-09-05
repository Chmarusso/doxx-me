'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmi";
import "./globals.css";
import { useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Create Mini App</title>
      </head>
      <body>
        <div className="floating-shapes">
          <div className="floating-shape" style={{ 
            width: '288px', 
            height: '288px', 
            top: '40px', 
            left: '40px', 
            opacity: 0.2,
            animation: 'float 6s ease-in-out infinite'
          }}></div>
          <div className="floating-shape" style={{ 
            width: '384px', 
            height: '384px', 
            top: '33%', 
            right: '80px', 
            opacity: 0.15,
            animation: 'float 6s ease-in-out 2s infinite'
          }}></div>
          <div className="floating-shape" style={{ 
            width: '256px', 
            height: '256px', 
            bottom: '80px', 
            left: '25%', 
            opacity: 0.1,
            animation: 'pulse-glow 4s ease-in-out infinite'
          }}></div>
          <div className="floating-shape" style={{ 
            width: '320px', 
            height: '320px', 
            bottom: '40px', 
            right: '40px', 
            opacity: 0.2,
            animation: 'float 6s ease-in-out infinite'
          }}></div>
        </div>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <div style={{ minHeight: '100vh', position: 'relative', zIndex: 10 }}>
              {children}
            </div>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
