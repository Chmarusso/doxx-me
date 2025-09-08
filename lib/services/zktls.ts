import { db } from '@/lib/db';
import { GolemService } from './golem';

const VLAYER_PROVER_URL = 'https://web-prover.vlayer.xyz/api/v0/prove';
const DEFAULT_NOTARY = 'https://test-notary.vlayer.xyz/v0.1.0-alpha.11';

interface VlayerProofPayload {
  url: string;
  notary: string;
  headers: string[];
}

interface VlayerProofResponse {
  proof: string;
  publicInputs: any;
  verificationKey: string;
}

interface VlayerProofRequest {
  url: string;
  notary?: string;
  headers?: string[];
  platform?: string;
  userId?: string;
}

interface StoredVlayerProof {
  id: string;
  url: string;
  platform?: string;
  userId: string;
  createdAt: Date;
  proof: string;
  publicInputs: any;
  verificationKey: string;
}

async function storeProofRequest(data: {
  url: string;
  notary: string;
  headers?: string[];
  platform?: string;
  userId: string;
  proof: string;
  publicInputs: any;
  verificationKey: string;
}): Promise<StoredVlayerProof> {
  const storedProof = await db.vlayerProof.create({
    data: {
      vlayerProofId: `proof-${Date.now()}`, // Generate a simple ID
      url: data.url,
      notary: data.notary,
      headers: data.headers ? JSON.stringify(data.headers) : null,
      platform: data.platform,
      userId: data.userId,
      status: 'completed',
      proof: data.proof,
      publicInputs: JSON.stringify(data.publicInputs),
      verificationKey: data.verificationKey,
      completedAt: new Date()
    }
  });

  return {
    id: storedProof.id,
    url: storedProof.url,
    platform: storedProof.platform,
    userId: storedProof.userId,
    createdAt: storedProof.createdAt,
    proof: data.proof,
    publicInputs: data.publicInputs,
    verificationKey: data.verificationKey
  };
}

async function createZkTLSAttestation(proofData: StoredVlayerProof): Promise<void> {
  try {
    const processedData = {
      url: proofData.url,
      platform: proofData.platform,
      verificationMethod: 'zktls',
      proofGenerated: true
    };

    // Store on blockchain first
    const blockchainReceipt = await GolemService.storeVerificationData(
      `user:${proofData.userId}`,
      'zktls',
      {
        ...processedData,
        publicInputs: proofData.publicInputs,
        verificationKey: proofData.verificationKey
      }
    );

    // Create database attestation
    await GolemService.createDatabaseAttestation({
      entityKey: blockchainReceipt.entityKey,
      expirationBlock: BigInt(blockchainReceipt.expirationBlock),
      platform: 'zktls',
      attestationType: 'zktls_proof',
      rawApiData: {
        proof: proofData.proof,
        publicInputs: proofData.publicInputs,
        verificationKey: proofData.verificationKey,
        url: proofData.url
      },
      processedData,
      apiEndpoint: proofData.url,
      userId: proofData.userId
    });

    console.log(`Created zkTLS attestation for proof ${proofData.id}`);
  } catch (error) {
    console.error('Failed to create zkTLS attestation:', error);
  }
}

export async function proveUrl(request: VlayerProofRequest): Promise<VlayerProofResponse> {
  const clientId = process.env.NEXT_PUBLIC_VLAYER_CLIENT_ID;
  const clientSecret = process.env.VLAYER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('vlayer configuration missing: NEXT_PUBLIC_VLAYER_CLIENT_ID and VLAYER_CLIENT_SECRET required');
  }

  const payload: VlayerProofPayload = {
    url: request.url,
    notary: request.notary || DEFAULT_NOTARY,
    headers: request.headers || []
  };

  const response = await fetch(VLAYER_PROVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'Authorization': `Bearer ${clientSecret}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`vlayer proof request failed: ${response.status} - ${errorText}`);
  }

  const proofResponse = await response.json();

  // Store proof in database and create attestation if userId provided
  if (request.userId) {
    const storedProof = await storeProofRequest({
      url: request.url,
      notary: request.notary || DEFAULT_NOTARY,
      headers: request.headers,
      platform: request.platform,
      userId: request.userId,
      proof: proofResponse.proof,
      publicInputs: proofResponse.publicInputs,
      verificationKey: proofResponse.verificationKey
    });

    // Create attestation
    await createZkTLSAttestation(storedProof);
  }

  return proofResponse;
}

export async function proveRedditData(accessToken: string, userAgent: string, userId: string): Promise<VlayerProofResponse> {
  return proveUrl({
    url: 'https://oauth.reddit.com/api/v1/me',
    headers: [
      `Authorization: Bearer ${accessToken}`,
      `User-Agent: ${userAgent}`
    ],
    platform: 'reddit',
    userId
  });
}

export async function proveGithubData(accessToken: string, userAgent: string, userId: string): Promise<VlayerProofResponse> {
  return proveUrl({
    url: 'https://api.github.com/user',
    headers: [
      `Authorization: Bearer ${accessToken}`,
      `User-Agent: ${userAgent}`
    ],
    platform: 'github',
    userId
  });
}

export async function getUserProofs(userId: string, platform?: string): Promise<StoredVlayerProof[]> {
  const where: any = { userId };
  if (platform) where.platform = platform;

  const proofs = await db.vlayerProof.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return proofs.map(proof => ({
    id: proof.id,
    url: proof.url,
    platform: proof.platform,
    userId: proof.userId,
    createdAt: proof.createdAt,
    proof: proof.proof || '',
    publicInputs: proof.publicInputs ? JSON.parse(proof.publicInputs) : null,
    verificationKey: proof.verificationKey || ''
  }));
}