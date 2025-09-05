# Database Setup Guide

This project uses **Neon DB (PostgreSQL)** with **Prisma ORM** for database management.

## 🔧 Setup Instructions

### 1. Create Neon Database

1. Go to [Neon Console](https://neon.tech/)
2. Create a new project
3. Copy your connection strings:
   - **Pooled connection** (for DATABASE_URL)
   - **Direct connection** (for DIRECT_URL)

### 2. Configure Environment Variables

Update your `.env.local` file with your Neon database URLs:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host/database?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://username:password@host/database?sslmode=require"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

For development (creates tables without migrations):
```bash
npm run db:push
```

For production (with proper migrations):
```bash
npm run db:migrate
```

### 5. Seed Database (Optional)

```bash
npm run db:seed
```

## 📊 Database Schema

### Models

#### User
- Primary user entity
- Links wallet address to social accounts
- Tracks verification status

#### RedditData
- Stores comprehensive Reddit account information
- Links to User (one-to-one)
- Includes karma, account age, premium status

#### SubredditKarma
- Detailed karma breakdown per subreddit
- Links to RedditData (one-to-many)
- Tracks comment and link karma separately

#### Verification
- Generic verification system for multiple platforms
- Links to User (one-to-many)
- Supports Reddit, Twitter, GitHub, etc.

## 🛠 Available Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migrations (production)
npm run db:migrate

# Open Prisma Studio (database browser)
npm run db:studio

# Seed database with test data
npm run db:seed
```

## 🔄 Development Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Generate client**: `npm run db:generate`
3. **Push to database**: `npm run db:push`
4. **Test in Prisma Studio**: `npm run db:studio`

## 📁 File Structure

```
prisma/
├── schema.prisma      # Database schema definition
├── seed.ts           # Database seeding script
lib/
└── db.ts            # Prisma client singleton
```

## 🚀 Usage in Code

```typescript
import { db } from '@/lib/db'

// Create user with Reddit data
const user = await db.user.create({
  data: {
    walletAddress: '0x...',
    redditData: {
      create: {
        redditId: 'reddit_user_id',
        username: 'reddit_username',
        totalKarma: 1500,
        // ... other fields
        subredditKarma: {
          create: [
            {
              subreddit: 'programming',
              commentKarma: 500,
              linkKarma: 200,
              totalKarma: 700
            }
          ]
        }
      }
    }
  },
  include: {
    redditData: {
      include: {
        subredditKarma: true
      }
    }
  }
})
```

## 🔒 Security Notes

- Database URLs contain sensitive credentials
- Never commit `.env.local` to version control
- Use connection pooling for production
- Enable SSL for all connections