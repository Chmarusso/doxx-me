import { db } from '@/lib/db';
import { verifyMessage, isAddress } from 'viem';

/**
 * Normalize signature format for different wallet types
 * Some wallets may return signatures in different formats
 */
function normalizeSignature(signature: string): string {
  // Remove 0x prefix if present
  let cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  
  // Standard Ethereum signature should be 130 characters (65 bytes)
  // Some wallets might return different formats
  if (cleanSig.length === 128) {
    // Missing recovery byte, might need to add it
    console.log('⚠️ Signature appears to be missing recovery byte, length:', cleanSig.length);
  } else if (cleanSig.length === 130) {
    // Standard format
    console.log('✅ Signature appears to be in standard format, length:', cleanSig.length);
  } else {
    console.log('⚠️ Unexpected signature length:', cleanSig.length);
  }
  
  // Ensure 0x prefix
  return '0x' + cleanSig;
}

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

    // Normalize signature format
    const normalizedSignature = normalizeSignature(signature);
    
    // Debug signature format
    console.log('🔍 Signature verification debug:', {
      walletAddress,
      messageLength: message.length,
      originalSignatureLength: signature.length,
      normalizedSignatureLength: normalizedSignature.length,
      signatureFormat: signature.startsWith('0x') ? 'hex' : 'unknown',
      originalPreview: signature.substring(0, 20) + '...',
      normalizedPreview: normalizedSignature.substring(0, 20) + '...'
    });

    // Verify the signature
    let isValidSignature = false;
    try {
      isValidSignature = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: normalizedSignature as `0x${string}`,
      });
    } catch (verifyError) {
      console.error('❌ Primary signature verification failed:', verifyError);
      
      // Try alternative signature formats if the primary verification fails
      console.log('🔄 Attempting alternative signature verification methods...');
      
      // Check if it's a signature length error and try to fix it
      if (verifyError instanceof Error && verifyError.message.includes('signature length')) {
        console.log('⚠️ Signature length error detected, attempting fixes...');
        
        // Try with original signature in case normalization caused issues
        try {
          isValidSignature = await verifyMessage({
            address: walletAddress as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          });
          console.log('✅ Original signature format worked');
        } catch (secondError) {
          console.log('❌ Original signature format also failed:', secondError);
          
          // If signature is too short, it might be missing the recovery byte
          if (signature.replace('0x', '').length === 128) {
            console.log('🔧 Attempting to add recovery byte variants...');
            const sigWithoutPrefix = signature.replace('0x', '');
            
            // Try with recovery byte 27 (0x1b) and 28 (0x1c)
            for (const recoveryByte of ['1b', '1c']) {
              try {
                const signatureWithRecovery = '0x' + sigWithoutPrefix + recoveryByte;
                isValidSignature = await verifyMessage({
                  address: walletAddress as `0x${string}`,
                  message,
                  signature: signatureWithRecovery as `0x${string}`,
                });
                if (isValidSignature) {
                  console.log(`✅ Signature verification succeeded with recovery byte: ${recoveryByte}`);
                  break;
                }
              } catch (recoveryError) {
                console.log(`❌ Recovery byte ${recoveryByte} failed:`, recoveryError);
              }
            }
          }
        }
      }
      
      // If all attempts failed, throw a descriptive error
      if (!isValidSignature) {
        throw new Error(`Signature verification failed with all methods. Original signature length: ${signature.length}, normalized length: ${normalizedSignature.length}. This may be due to wallet-specific signature formatting differences between MetaMask and Farcaster/Base wallets.`);
      }
    }

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