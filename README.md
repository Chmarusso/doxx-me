# Doxx Me

Prove your online identity with wallet authentication. Built for **ETHWarsaw 2025 hackathon**.

Connect your wallet and verify your Reddit karma, account age, and social proof. Data is cryptographically signed and stored on-chain.

## Tech Stack

- **GolemDB**: Decentralized data storage for identity proofs
- **Base**: Farcaster mini app integration  
- **Civic**: Identity verification (planned)

## Features

- **Wallet Authentication**: Connect MetaMask or Farcaster wallets
- **Reddit Verification**: Prove karma scores and account history  
- **On-Chain Storage**: GolemDB integration for decentralized identity

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start proving your identity.

## Deployment

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDDIT_CLIENT_ID`: Reddit OAuth app ID
- `REDDIT_CLIENT_SECRET`: Reddit OAuth secret
- `NEXTAUTH_SECRET`: Random secret for session encryption

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy - Prisma will auto-generate during build

### Database Setup

```bash
npm run db:push    # Push schema to database
npm run db:migrate # Run migrations
npm run db:studio  # Open Prisma Studio
```

