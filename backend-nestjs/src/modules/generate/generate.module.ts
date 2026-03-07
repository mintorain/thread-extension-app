import { Module } from '@nestjs/common';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { KeysModule } from '../keys/keys.module';
import { LlmModule } from '../../llm/llm.module';

@Module({
  imports: [KeysModule, LlmModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
