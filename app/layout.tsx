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

  const embedMeta = {
    "version": "1",
    "imageUrl": "https://doxx-me.vercel.app/frame-og.jpg",
    "button": {
      "title": "Doxx Me - prove stuff with zkTLS",
      "action": {
        "type": "launch_frame",
        "name": "Try now",
        "url": "https://doxx-me.vercel.app",
        "splashImageUrl": "https://doxx-me.vercel.app/app.png",
        "splashBackgroundColor": "#000000"
      }
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Doxx Me - Prove Your Online Identity</title>

        <meta name="fc:miniapp" content={JSON.stringify(embedMeta)} />
        <meta name="fc:frame" content={JSON.stringify(embedMeta)} />
        
        {/* Primary Meta Tags */}
        <meta name="title" content="Doxx Me - Prove Your Online Identity" />
        <meta name="description" content="Verify and prove your online presence with wallet-based authentication. Connect your Reddit account to showcase karma, account age, and social proof." />
        <meta name="keywords" content="identity verification, wallet authentication, reddit karma, social proof, web3, blockchain identity" />
        <meta name="author" content="Doxx Me" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://doxx-me.vercel.app/" />
        <meta property="og:title" content="Doxx Me - Prove Your Online Identity" />
        <meta property="og:description" content="Verify and prove your online presence with wallet-based authentication. Connect your Reddit account to showcase karma, account age, and social proof." />
        <meta property="og:image" content="https://doxx-me.vercel.app/og-image.png" />
        <meta property="og:image:alt" content="Doxx Me - Prove Your Online Identity" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://doxx-me.vercel.app/" />
        <meta property="twitter:title" content="Doxx Me - Prove Your Online Identity" />
        <meta property="twitter:description" content="Verify and prove your online presence with wallet-based authentication. Connect your Reddit account to showcase karma, account age, and social proof." />
        <meta property="twitter:image" content="https://doxx-me.vercel.app/og-image.png" />
        
        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://doxx-me.vercel.app/" />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
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
