import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';
import { LlmModule } from '../../llm/llm.module';
import { CryptoService } from '../../infra/crypto/crypto.service';

@Module({
  imports: [LlmModule],
  controllers: [KeysController],
  providers: [KeysService, CryptoService],
  exports: [KeysService],
})
export class KeysModule {}
