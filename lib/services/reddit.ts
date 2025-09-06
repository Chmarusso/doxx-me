import { db } from '@/lib/db';
import { GolemService } from './golem';
import crypto from 'crypto';

interface RedditUserData {
  id: string;
  name: string;
  total_karma: number;
  comment_karma: number;
  link_karma: number;
  created_utc: number;
  verified: boolean;
  has_verified_email: boolean;
  is_gold: boolean;
  is_mod: boolean;
  icon_img?: string;
  subreddit?: {
    display_name: string;
    subscribers: number;
  };
}

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface RedditKarmaItem {
  sr: string;
  comment_karma: number;
  link_karma: number;
}

interface RedditKarmaResponse {
  data: RedditKarmaItem[];
}

export class RedditService {
  private static readonly REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
  private static readonly REDDIT_USER_URL = 'https://oauth.reddit.com/api/v1/me';
  private static readonly REDDIT_KARMA_URL = 'https://oauth.reddit.com/api/v1/me/karma';

  static async exchangeCodeForToken(code: string): Promise<RedditTokenResponse> {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDDIT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Reddit OAuth configuration missing');
    }

    const response = await fetch(this.REDDIT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'User-Agent': 'DoxxMe/1.0.0',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit token exchange failed: ${errorText}`);
    }

    return response.json();
  }

  static async fetchUserData(accessToken: string): Promise<RedditUserData> {
    const response = await fetch(this.REDDIT_USER_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'DoxxMe/1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit user data fetch failed: ${errorText}`);
    }

    return response.json();
  }

  static async fetchKarmaData(accessToken: string): Promise<RedditKarmaResponse> {
    const response = await fetch(this.REDDIT_KARMA_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'DoxxMe/1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit karma data fetch failed: ${errorText}`);
    }

    return response.json();
  }

  static async authenticateUser(code: string, userId?: string | null) {
    const tokenData = await this.exchangeCodeForToken(code);
    const userData = await this.fetchUserData(tokenData.access_token);

    const accountAge = this.calculateAccountAge(userData.created_utc);
    const rawApiResponse = JSON.stringify(userData);
    const proofHash = crypto.createHash('sha256').update(rawApiResponse).digest('hex');

    let user;
    
    if (userId) {
      // Link Reddit to existing wallet user
      const existingRedditUser = await db.user.findFirst({
        where: { redditId: userData.id, id: { not: userId } }
      });

      if (existingRedditUser) {
        throw new Error('This Reddit account is already linked to another wallet.');
      }

      user = await db.user.update({
        where: { id: userId },
        data: {
          redditId: userData.id,
          redditUsername: userData.name,
          redditVerified: userData.has_verified_email,
          redditData: {
            upsert: {
              create: {
                redditId: userData.id,
                username: userData.name,
                totalKarma: userData.total_karma || 0,
                commentKarma: userData.comment_karma || 0,
                linkKarma: userData.link_karma || 0,
                accountAge: accountAge,
                verified: userData.has_verified_email || false,
                isPremium: userData.is_gold || false,
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              },
              update: {
                username: userData.name,
                totalKarma: userData.total_karma || 0,
                commentKarma: userData.comment_karma || 0,
                linkKarma: userData.link_karma || 0,
                accountAge: accountAge,
                verified: userData.has_verified_email || false,
                isPremium: userData.is_gold || false,
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              }
            }
          }
        },
        include: {
          redditData: {
            include: { subredditKarma: true }
          }
        }
      });
    } else {
      // Upsert user with Reddit data (create new or update existing)
      user = await db.user.upsert({
        where: { redditId: userData.id },
        create: {
          redditId: userData.id,
          redditUsername: userData.name,
          redditVerified: userData.has_verified_email,
          walletAddress: '', // Will need wallet connection later
          redditData: {
            create: {
              redditId: userData.id,
              username: userData.name,
              totalKarma: userData.total_karma || 0,
              commentKarma: userData.comment_karma || 0,
              linkKarma: userData.link_karma || 0,
              accountAge: accountAge,
              verified: userData.has_verified_email || false,
              isPremium: userData.is_gold || false,
              rawApiResponse: rawApiResponse,
              proofHash: proofHash,
              proofTimestamp: new Date(),
            }
          }
        },
        update: {
          redditUsername: userData.name,
          redditVerified: userData.has_verified_email,
          redditData: {
            upsert: {
              create: {
                redditId: userData.id,
                username: userData.name,
                totalKarma: userData.total_karma || 0,
                commentKarma: userData.comment_karma || 0,
                linkKarma: userData.link_karma || 0,
                accountAge: accountAge,
                verified: userData.has_verified_email || false,
                isPremium: userData.is_gold || false,
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              },
              update: {
                username: userData.name,
                totalKarma: userData.total_karma || 0,
                commentKarma: userData.comment_karma || 0,
                linkKarma: userData.link_karma || 0,
                accountAge: accountAge,
                verified: userData.has_verified_email || false,
                isPremium: userData.is_gold || false,
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              }
            }
          }
        },
        include: {
          redditData: {
            include: { subredditKarma: true }
          }
        }
      });
    }

    // Create Golem attestation for Reddit verification
    try {
      console.log('Creating Golem attestation for Reddit user:', userData.name);
      await GolemService.createRedditAttestation(user.id, userData);
      console.log('Golem attestation created successfully');
    } catch (error) {
      console.error('Failed to create Golem attestation for Reddit:', error);
      // Don't fail the whole authentication if attestation fails
    }

    return {
      user,
      accessToken: tokenData.access_token,
      userData
    };
  }

  static async fetchAndStoreKarmaData(accessToken: string, userId: string) {
    const karmaData = await this.fetchKarmaData(accessToken);
    
    const subredditKarmaArray = karmaData.data?.map((item: RedditKarmaItem) => ({
      subreddit: item.sr,
      commentKarma: item.comment_karma || 0,
      linkKarma: item.link_karma || 0,
      totalKarma: (item.comment_karma || 0) + (item.link_karma || 0),
    })) || [];

    const sortedKarmaArray = subredditKarmaArray
      .filter((karma) => karma.totalKarma > 0)
      .sort((a, b) => b.totalKarma - a.totalKarma)
      .slice(0, 15);

    if (sortedKarmaArray.length > 0) {
      const redditData = await db.redditData.findFirst({
        where: { userId: userId }
      });

      if (redditData) {
        const karmaDataString = JSON.stringify(karmaData);
        
        for (const karma of sortedKarmaArray) {
          await db.subredditKarma.upsert({
            where: {
              redditDataId_subreddit: {
                redditDataId: redditData.id,
                subreddit: karma.subreddit
              }
            },
            update: {
              commentKarma: karma.commentKarma,
              linkKarma: karma.linkKarma,
              totalKarma: karma.totalKarma,
              rawKarmaData: karmaDataString,
              proofTimestamp: new Date(),
            },
            create: {
              redditDataId: redditData.id,
              subreddit: karma.subreddit,
              commentKarma: karma.commentKarma,
              linkKarma: karma.linkKarma,
              totalKarma: karma.totalKarma,
              rawKarmaData: karmaDataString,
              proofTimestamp: new Date(),
            },
          });
        }
      }
    }

    // Create Golem attestation for subreddit karma data
    if (sortedKarmaArray.length > 0) {
      try {
        console.log('Creating Golem attestation for subreddit karma data');
        const user = await db.user.findUnique({ where: { id: userId } });
        if (user && user.redditUsername) {
          // Store on blockchain first to get proper receipt
          const blockchainReceipt = await GolemService.storeVerificationData(
            `user:${userId}`,
            'reddit',
            { 
              username: user.redditUsername,
              subredditKarma: sortedKarmaArray, 
              totalSubreddits: subredditKarmaArray.length,
              verificationType: 'subreddit_karma'
            }
          );

          // Then store in database using blockchain receipt data
          await GolemService.createDatabaseAttestation({
            entityKey: blockchainReceipt.entityKey,
            expirationBlock: BigInt(blockchainReceipt.expirationBlock),
            platform: 'reddit',
            attestationType: 'subreddit_karma',
            rawApiData: karmaData,
            processedData: { subredditKarma: sortedKarmaArray, totalSubreddits: subredditKarmaArray.length },
            apiEndpoint: 'reddit.com/api/v1/me/karma',
            userId: userId
          });
          console.log('Golem attestation for subreddit karma created successfully');
        }
      } catch (error) {
        console.error('Failed to create Golem attestation for subreddit karma:', error);
        // Don't fail the whole process if attestation fails
      }
    }

    return {
      subredditKarma: sortedKarmaArray,
      totalSubreddits: subredditKarmaArray.length,
      rawData: karmaData
    };
  }

  private static calculateAccountAge(createdUtc: number): string {
    const now = Date.now() / 1000;
    const ageInSeconds = now - createdUtc;
    const ageInDays = Math.floor(ageInSeconds / (24 * 60 * 60));
    const ageInYears = Math.floor(ageInDays / 365);
    
    if (ageInYears >= 1) {
      const remainingDays = ageInDays % 365;
      const months = Math.floor(remainingDays / 30);
      return `${ageInYears} year${ageInYears > 1 ? 's' : ''}${months > 0 ? ` ${months} month${months > 1 ? 's' : ''}` : ''}`;
    } else if (ageInDays >= 30) {
      const months = Math.floor(ageInDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${ageInDays} day${ageInDays > 1 ? 's' : ''}`;
    }
  }
}