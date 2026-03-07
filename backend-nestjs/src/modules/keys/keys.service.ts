import { Injectable } from '@nestjs/common';
import { ProviderName } from '../../common/constants/providers';
import { CryptoService } from '../../infra/crypto/crypto.service';

@Injectable()
export class KeysService {
  private readonly store = new Map<string, string>();

  constructor(private readonly crypto: CryptoService) {}

  async save(userId: string, provider: ProviderName, plainKey: string): Promise<void> {
    this.store.set(`${userId}:${provider}`, this.crypto.encrypt(plainKey));
  }

  async getPlainKey(userId: string, provider: ProviderName): Promise<string> {
    const encrypted = this.store.get(`${userId}:${provider}`);
    if (!encrypted) throw new Error(`No key registered for provider=${provider}`);
    return this.crypto.decrypt(encrypted);
  }
}
