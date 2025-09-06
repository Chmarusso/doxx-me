# Doxx Me

Prove your online identity with wallet authentication. 

Connect your wallet and verify your Reddit karma, account age, and social proof. Data is cryptographically signed and stored as attestion in Golem DB. 

Built for 💜 [ETHWarsaw hackathon](https://www.ethwarsaw.dev/hackathon)

## Tech Stack

- **GolemDB**: Decentralized data storage for identity proofs
- **Base**: mini app sdk  
- **Civic**: Authentication for verifier panel

## Features

- **Wallet Authentication**: Connect MetaMask or Farcaster wallets
- **Reddit Verification**: Prove karma scores and account histor
- **Github Verification**: Prove your impact on specific repositories 
- **On-Chain Storage**: GolemDB integration for decentralized identity

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

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start proving your identity.

## Database Setup

```bash
npm run db:push    # Push schema to database
npm run db:migrate # Run migrations
npm run db:studio  # Open Prisma Studio
```

