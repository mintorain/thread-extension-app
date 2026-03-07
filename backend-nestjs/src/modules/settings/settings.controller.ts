import { Body, Controller, Get, Put } from '@nestjs/common';

const demoSettings = {
  mode: 'priority',
  primaryProvider: 'claude',
  providerPriority: ['claude', 'chatgpt', 'gemini', 'grok'],
  fallbackEnabled: true,
  defaultModelByProvider: { claude: 'sonnet', chatgpt: 'gpt-4.1' },
};

@Controller('v1/settings/ai')
export class SettingsController {
  @Get()
  getSettings() {
    return demoSettings;
  }

  @Put()
  updateSettings(@Body() payload: Record<string, unknown>) {
    Object.assign(demoSettings, payload);
    return { updated: true };
  }
}
