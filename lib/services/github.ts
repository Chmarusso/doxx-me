import { db } from '@/lib/db';
import crypto from 'crypto';
import { GolemService } from './golem';

interface GitHubUserData {
  id: number | string;
  login: string;
  name?: string;
  email?: string;
  bio?: string;
  company?: string;
  location?: string;
  blog?: string;
  avatar_url?: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  merged: boolean;
  mergeable?: string;
  created_at: string;
  closed_at?: string;
  merged_at?: string;
  additions: number;
  deletions: number;
  changed_files: number;
  author?: {
    login: string;
  };
}

interface GitHubCommit {
  oid: string;
  message: string;
  committed_date: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at?: string;
}

interface GitHubRepositoryData {
  id: string;
  name: string;
  owner: {
    login: string;
  };
  url: string;
  description?: string;
  stargazer_count: number;
  forks_count: number;
  created_at: string;
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
  issues: GitHubIssue[];
}

export class GitHubService {
  private static readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
  private static readonly GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
  private static readonly GITHUB_USER_URL = 'https://api.github.com/user';

  static async exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth configuration missing');
    }

    const response = await fetch(this.GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub token exchange failed: ${errorText}`);
    }

    return response.json();
  }

  static async fetchUserData(accessToken: string): Promise<GitHubUserData> {
    const response = await fetch(this.GITHUB_USER_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DoxxMe/1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub user data fetch failed: ${errorText}`);
    }

    return response.json();
  }

  static async fetchAllPullRequestsByAuthor(
    accessToken: string,
    owner: string,
    repo: string,
    username: string
  ): Promise<GitHubPullRequest[]> {
    const allPRs: GitHubPullRequest[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const searchQuery = `repo:${owner}/${repo} is:pr author:${username}`;
      const query = `
        query SearchPRsByAuthor($searchQuery: String!, $after: String) {
          search(query: $searchQuery, type: ISSUE, first: 100, after: $after) {
            issueCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ... on PullRequest {
                id
                number
                title
                state
                merged
                mergeable
                createdAt
                closedAt
                mergedAt
                additions
                deletions
                changedFiles
                author {
                  login
                }
              }
            }
          }
        }
      `;

      const response: Response = await fetch(this.GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            searchQuery,
            after: cursor,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub GraphQL query failed: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GitHub GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const searchResults = data.data?.search;
      if (searchResults?.nodes) {
        allPRs.push(...searchResults.nodes);
      }

      hasNextPage = searchResults?.pageInfo?.hasNextPage || false;
      cursor = searchResults?.pageInfo?.endCursor || null;

      // Safety break to avoid infinite loops (max 10 pages = 1000 PRs)
      if (allPRs.length > 1000) {
        console.warn(`Stopping PR pagination at ${allPRs.length} PRs to avoid rate limits`);
        break;
      }
    }

    return allPRs;
  }

  static async fetchRepositoryContributions(
    accessToken: string, 
    owner: string, 
    repo: string, 
    username: string
  ): Promise<GitHubRepositoryData> {
    const query = `
      query GetRepositoryContributions($owner: String!, $name: String!, $login: String!, $authorId: ID!) {
        repository(owner: $owner, name: $name) {
          id
          name
          owner { login }
          url
          description
          stargazerCount
          forkCount
          createdAt
          
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, author: {id: $authorId}) {
                  totalCount
                  nodes {
                    oid
                    message
                    committedDate
                    additions
                    deletions
                    changedFiles
                  }
                }
              }
            }
          }
          
          issues(first: 100, filterBy: {createdBy: $login}) {
            totalCount
            nodes {
              number
              title
              state
              createdAt
              closedAt
            }
          }
        }
        
        user(login: $login) {
          id
        }
      }
    `;

    // First get user ID for commit filtering
    const userResponse = await fetch(this.GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query { user(login: "${username}") { id } }`,
      }),
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user ID fetch failed: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    const authorId = userData.data?.user?.id;

    if (!authorId) {
      throw new Error('Could not fetch GitHub user ID');
    }

    // Fetch all PRs by this author using pagination
    const userPullRequests = await this.fetchAllPullRequestsByAuthor(accessToken, owner, repo, username);

    // Now fetch repository data with user ID
    const response = await fetch(this.GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          owner,
          name: repo,
          login: username,
          authorId,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub GraphQL query failed: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const repository = data.data?.repository;
    if (!repository) {
      throw new Error('Repository not found or access denied');
    }

    return {
      id: repository.id,
      name: repository.name,
      owner: repository.owner,
      url: repository.url,
      description: repository.description,
      stargazer_count: repository.stargazerCount,
      forks_count: repository.forkCount,
      created_at: repository.createdAt,
      pullRequests: userPullRequests, // Already fetched with pagination
      commits: repository.defaultBranchRef?.target?.history?.nodes || [],
      issues: repository.issues?.nodes || [],
    };
  }

  static async authenticateUser(code: string, userId?: string | null) {
    const tokenData = await this.exchangeCodeForToken(code);
    const userData = await this.fetchUserData(tokenData.access_token);

    const accountAge = this.calculateAccountAge(userData.created_at);
    const rawApiResponse = JSON.stringify(userData);
    const proofHash = crypto.createHash('sha256').update(rawApiResponse).digest('hex');

    let user;
    
    if (userId) {
      // Link GitHub to existing wallet user
      const existingGitHubUser = await db.user.findFirst({
        where: { githubId: String(userData.id), id: { not: userId } }
      });

      if (existingGitHubUser) {
        throw new Error('This GitHub account is already linked to another wallet.');
      }

      user = await db.user.update({
        where: { id: userId },
        data: {
          githubId: String(userData.id),
          githubUsername: userData.login,
          githubVerified: true,
          githubData: {
            upsert: {
              create: {
                githubId: String(userData.id),
                username: userData.login,
                name: userData.name,
                email: userData.email,
                bio: userData.bio,
                company: userData.company,
                location: userData.location,
                blog: userData.blog,
                avatarUrl: userData.avatar_url,
                followers: userData.followers || 0,
                following: userData.following || 0,
                publicRepos: userData.public_repos || 0,
                accountAge: accountAge,
                createdUtc: new Date(userData.created_at),
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              },
              update: {
                username: userData.login,
                name: userData.name,
                email: userData.email,
                bio: userData.bio,
                company: userData.company,
                location: userData.location,
                blog: userData.blog,
                avatarUrl: userData.avatar_url,
                followers: userData.followers || 0,
                following: userData.following || 0,
                publicRepos: userData.public_repos || 0,
                accountAge: accountAge,
                createdUtc: new Date(userData.created_at),
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              }
            }
          }
        },
        include: {
          githubData: {
            include: { repositoryContributions: true }
          }
        }
      });
    } else {
      // Upsert user with GitHub data (create new or update existing)
      user = await db.user.upsert({
        where: { githubId: String(userData.id) },
        create: {
          githubId: String(userData.id),
          githubUsername: userData.login,
          githubVerified: true,
          githubData: {
            create: {
              githubId: String(userData.id),
              username: userData.login,
              name: userData.name,
              email: userData.email,
              bio: userData.bio,
              company: userData.company,
              location: userData.location,
              blog: userData.blog,
              avatarUrl: userData.avatar_url,
              followers: userData.followers || 0,
              following: userData.following || 0,
              publicRepos: userData.public_repos || 0,
              accountAge: accountAge,
              createdUtc: new Date(userData.created_at),
              rawApiResponse: rawApiResponse,
              proofHash: proofHash,
              proofTimestamp: new Date(),
            }
          }
        },
        update: {
          githubUsername: userData.login,
          githubVerified: true,
          githubData: {
            upsert: {
              create: {
                githubId: String(userData.id),
                username: userData.login,
                name: userData.name,
                email: userData.email,
                bio: userData.bio,
                company: userData.company,
                location: userData.location,
                blog: userData.blog,
                avatarUrl: userData.avatar_url,
                followers: userData.followers || 0,
                following: userData.following || 0,
                publicRepos: userData.public_repos || 0,
                accountAge: accountAge,
                createdUtc: new Date(userData.created_at),
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              },
              update: {
                username: userData.login,
                name: userData.name,
                email: userData.email,
                bio: userData.bio,
                company: userData.company,
                location: userData.location,
                blog: userData.blog,
                avatarUrl: userData.avatar_url,
                followers: userData.followers || 0,
                following: userData.following || 0,
                publicRepos: userData.public_repos || 0,
                accountAge: accountAge,
                createdUtc: new Date(userData.created_at),
                rawApiResponse: rawApiResponse,
                proofHash: proofHash,
                proofTimestamp: new Date(),
              }
            }
          }
        },
        include: {
          githubData: {
            include: { repositoryContributions: true }
          }
        }
      });
    }

    // Create Golem attestation for GitHub verification
    try {
      console.log('Creating Golem attestation for GitHub user:', userData.login);
      await GolemService.createGitHubAttestation(user.id, userData);
      console.log('Golem attestation created successfully');
    } catch (error) {
      console.error('Failed to create Golem attestation for GitHub:', error);
      // Don't fail the whole authentication if attestation fails
    }

    return {
      user,
      accessToken: tokenData.access_token,
      userData
    };
  }

  static async fetchAndStoreRepositoryContributions(
    accessToken: string, 
    userId: string, 
    owner: string, 
    repo: string,
    username: string
  ) {
    const repositoryData = await this.fetchRepositoryContributions(accessToken, owner, repo, username);
    
    // Calculate metrics
    const prsCreated = repositoryData.pullRequests.length;
    const prsMerged = repositoryData.pullRequests.filter(pr => pr.merged).length;
    const prsOpen = repositoryData.pullRequests.filter(pr => pr.state === 'open').length;
    const prsClosed = repositoryData.pullRequests.filter(pr => pr.state === 'closed' && !pr.merged).length;
    
    const issuesOpened = repositoryData.issues.length;
    const issuesClosed = repositoryData.issues.filter(issue => issue.state === 'closed').length;
    
    const commitsCount = repositoryData.commits.length;
    const linesAdded = repositoryData.commits.reduce((sum, commit) => sum + (commit.additions || 0), 0);
    const linesDeleted = repositoryData.commits.reduce((sum, commit) => sum + (commit.deletions || 0), 0);

    const githubData = await db.gitHubData.findFirst({
      where: { userId: userId }
    });

    if (!githubData) {
      throw new Error('GitHub data not found for user');
    }

    const rawGraphQLResponse = JSON.stringify(repositoryData);
    const contributionExamples = JSON.stringify({
      samplePRs: repositoryData.pullRequests.slice(0, 5),
      sampleCommits: repositoryData.commits.slice(0, 10),
      sampleIssues: repositoryData.issues.slice(0, 5),
    });

    const repositoryContribution = await db.repositoryContribution.upsert({
      where: {
        githubDataId_repositoryName_repositoryOwner: {
          githubDataId: githubData.id,
          repositoryName: repo,
          repositoryOwner: owner
        }
      },
      update: {
        repositoryUrl: repositoryData.url,
        repositoryId: repositoryData.id,
        prsCreated,
        prsMerged,
        prsOpen,
        prsClosed,
        issuesOpened,
        issuesClosed,
        commitsCount,
        linesAdded,
        linesDeleted,
        rawGraphQLResponse,
        contributionExamples,
        proofTimestamp: new Date(),
      },
      create: {
        githubDataId: githubData.id,
        repositoryName: repo,
        repositoryOwner: owner,
        repositoryUrl: repositoryData.url,
        repositoryId: repositoryData.id,
        prsCreated,
        prsMerged,
        prsOpen,
        prsClosed,
        issuesOpened,
        issuesClosed,
        commitsCount,
        linesAdded,
        linesDeleted,
        rawGraphQLResponse,
        contributionExamples,
        proofTimestamp: new Date(),
      },
    });

    // Create Golem attestation for repository contributions
    try {
      console.log('Creating Golem attestation for repository contributions:', `${owner}/${repo}`);
      
      // Store on blockchain first to get proper receipt
      const blockchainReceipt = await GolemService.storeVerificationData(
        `user:${userId}`,
        'github',
        {
          username: username,
          repository: `${owner}/${repo}`,
          metrics: {
            prsCreated,
            prsMerged,
            prsOpen,
            prsClosed,
            issuesOpened,
            issuesClosed,
            commitsCount,
            linesAdded,
            linesDeleted,
          },
          verificationType: 'repository_contributions'
        }
      );

      // Then store in database using blockchain receipt data
      await GolemService.createDatabaseAttestation({
        entityKey: blockchainReceipt.entityKey,
        expirationBlock: BigInt(blockchainReceipt.expirationBlock),
        platform: 'github',
        attestationType: 'repository_contributions',
        rawApiData: repositoryData,
        processedData: {
          repository: `${owner}/${repo}`,
          metrics: {
            prsCreated,
            prsMerged,
            prsOpen,
            prsClosed,
            issuesOpened,
            issuesClosed,
            commitsCount,
            linesAdded,
            linesDeleted,
          }
        },
        apiEndpoint: 'api.github.com/graphql',
        userId: userId
      });
      console.log('Golem attestation for repository contributions created successfully');
    } catch (error) {
      console.error('Failed to create Golem attestation for repository contributions:', error);
      // Don't fail the whole process if attestation fails
    }

    return {
      repositoryContribution,
      metrics: {
        prsCreated,
        prsMerged,
        prsOpen,
        prsClosed,
        issuesOpened,
        issuesClosed,
        commitsCount,
        linesAdded,
        linesDeleted,
      },
      rawData: repositoryData
    };
  }

  private static calculateAccountAge(createdAt: string): string {
    const now = new Date();
    const created = new Date(createdAt);
    const ageInMs = now.getTime() - created.getTime();
    const ageInDays = Math.floor(ageInMs / (24 * 60 * 60 * 1000));
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