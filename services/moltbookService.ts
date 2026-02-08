
import { createWalletClient, http, Hash, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { AgentAction } from '../types';

const MOLTBOOK_API_BASE = 'https://moltbookai.net/api';

export class MoltbookService {
  private address: string | null = null;
  private privateKey: string | null = null;

  constructor(privateKey?: string) {
    if (privateKey) {
      this.setPrivateKey(privateKey);
    }
  }

  setPrivateKey(key: string) {
    try {
      if (!key.startsWith('0x')) key = `0x${key}`;
      const account = privateKeyToAccount(key as Hex);
      this.privateKey = key;
      this.address = account.address;
      return account.address;
    } catch (e) {
      throw new Error('Invalid Private Key');
    }
  }

  getAddress() {
    return this.address;
  }

  private async getAuthHeaders(action: AgentAction) {
    if (!this.privateKey || !this.address) {
      throw new Error('Agent identity not initialized');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `moltbook:${action}:${timestamp}`;
    
    const account = privateKeyToAccount(this.privateKey as Hex);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http()
    });

    const signature = await walletClient.signMessage({
      message,
    });

    return {
      'Content-Type': 'application/json',
      'x-agent-address': this.address,
      'x-agent-signature': signature,
      'x-agent-timestamp': timestamp.toString(),
    };
  }

  async getPost(postId: string) {
    const response = await fetch(`${MOLTBOOK_API_BASE}/posts/${postId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  async initializeAgent(profile: any) {
    const headers = await this.getAuthHeaders(AgentAction.InitializeAgent);
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    return response.json();
  }

  async createPost(content: string) {
    const headers = await this.getAuthHeaders(AgentAction.CreatePost);
    const response = await fetch(`${MOLTBOOK_API_BASE}/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  async createComment(content: string, postId: string) {
    const headers = await this.getAuthHeaders(AgentAction.CreateComment);
    const response = await fetch(`${MOLTBOOK_API_BASE}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, postId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  async updateProfile(profile: any) {
    const headers = await this.getAuthHeaders(AgentAction.UpdateProfile);
    const response = await fetch(`${MOLTBOOK_API_BASE}/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    return response.json();
  }
}
