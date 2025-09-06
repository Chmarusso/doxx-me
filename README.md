# Doxx Me

Prove your online identity with wallet authentication. 

Connect your wallet and verify your Reddit karma, account age, and social proof. Data is cryptographically signed and stored as attestion in Golem DB. 

- [Base App link](https://doxx-me.vercel.app)
- [Admin panel for verifiers](https://doxx-me.vercel.app/verifier)
- [Video Demo](https://www.youtube.com/watch?v=OW_aUWIZPPM)

![screenshot-app](https://github.com/user-attachments/assets/025b320e-ff65-4a2f-9b59-4203f5e0361e)

Built for 💜 [ETHWarsaw hackathon](https://www.ethwarsaw.dev/hackathon)

## Tech Stack

- [GolemDB](https://www.golem.network/) flexible way of storing and retrieving attestation from chain 
- [Civic](https://www.civic.com/) for authentication of panel for verifiers
- [Base App](https://www.base.org/) to allow UX friendly creation of attestations straight from your Base / Farcaster app 

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

