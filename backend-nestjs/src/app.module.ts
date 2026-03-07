import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { KeysModule } from './modules/keys/keys.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ContentModule } from './modules/content/content.module';
import { GenerateModule } from './modules/generate/generate.module';
import { UsageModule } from './modules/usage/usage.module';

@Module({
  imports: [LlmModule, ProvidersModule, KeysModule, SettingsModule, ContentModule, GenerateModule, UsageModule],
})
export class AppModule {}
