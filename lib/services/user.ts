import { db } from '@/lib/db';
import { verifyMessage, isAddress } from 'viem';

export interface UserCreateData {
  walletAddress: string;
  message: string;
  signature: string;
}

export interface UserCheckData {
  walletAddress: string;
}

export class UserService {
  static async checkUserExists(data: UserCheckData) {
    if (!isAddress(data.walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const user = await db.user.findUnique({
      where: { 
        walletAddress: data.walletAddress.toLowerCase()
      },
      include: {
        redditData: true,
        verifications: true
      }
    });

    if (user) {
      return {
        userExists: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          isVerified: user.isVerified,
          redditConnected: !!user.redditData,
          redditUsername: user.redditData?.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    }

    return { userExists: false };
  }

  static async createUser(data: UserCreateData) {
    const { walletAddress, message, signature } = data;

    if (!walletAddress || !message || !signature) {
      throw new Error('Wallet address, message, and signature are required');
    }

    if (!isAddress(walletAddress)) {
      throw new Error('Invalid wallet address format');
    }

    // Verify the signature
    const isValidSignature = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      throw new Error('Invalid signature - wallet verification failed');
    }

    // Create or update user
    const user = await db.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {
        updatedAt: new Date(),
      },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        isVerified: false, // Wallet ownership verified, but not identity
      },
      include: {
        redditData: {
          include: {
            subredditKarma: true
          }
        },
        verifications: true,
      },
    });

    return {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        redditConnected: !!user.redditData,
        redditUsername: user.redditUsername,
        redditVerified: user.redditVerified,
        verifications: user.verifications.map(v => ({
          platform: v.platform,
          username: v.username,
          verifiedAt: v.verifiedAt,
          isActive: v.isActive,
        })),
        redditData: user.redditData ? {
          username: user.redditData.username,
          totalKarma: user.redditData.totalKarma,
          accountAge: user.redditData.accountAge,
          verified: user.redditData.verified,
          isPremium: user.redditData.isPremium,
          subredditCount: user.redditData.subredditKarma.length,
        } : null,
      }
    };
  }
}