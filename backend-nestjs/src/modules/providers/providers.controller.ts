import { Controller, Get } from '@nestjs/common';
import { PROVIDER_MODELS } from '../../common/constants/providers';

@Controller('v1/providers')
export class ProvidersController {
  @Get()
  listProviders() {
    return { providers: Object.entries(PROVIDER_MODELS).map(([name, models]) => ({ name, models })) };
  }
}
