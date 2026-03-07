import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
  encrypt(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  decrypt(value: string): string {
    return Buffer.from(value, 'base64').toString('utf8');
  }
}
