# FastAPI/NestJS 서버 폴더 구조 + 핸들러 템플릿

문서 버전: `v1.0`  
작성일: `2026-03-06`  
대상: `ThreadHook` 백엔드 (멀티 AI Provider: Claude/ChatGPT/Gemini/Grok)

## 1) 공통 설계 원칙
- Provider 종속 코드는 `adapters` 계층으로 격리
- 라우팅/핸들러는 얇게, 비즈니스 로직은 `services`에 집중
- 요청/응답 스키마를 강제해 Provider 출력 편차를 최소화
- 키 관리는 반드시 서버에서 암호화 저장(평문 금지)

---

## 2) FastAPI 권장 폴더 구조

```text
backend-fastapi/
  app/
    main.py
    core/
      config.py
      security.py
      logging.py
      exceptions.py
    api/
      deps.py
      routers/
        providers.py
        keys.py
        settings.py
        content.py
        generate.py
        usage.py
    schemas/
      common.py
      provider.py
      key.py
      settings.py
      content.py
      generate.py
      usage.py
    services/
      provider_registry.py
      key_service.py
      settings_service.py
      content_service.py
      generation_service.py
      usage_service.py
      routing_service.py
    adapters/
      base.py
      anthropic_adapter.py
      openai_adapter.py
      gemini_adapter.py
      grok_adapter.py
    repositories/
      key_repository.py
      settings_repository.py
      generation_log_repository.py
    db/
      session.py
      models.py
    utils/
      crypto.py
      validators.py
  tests/
    test_generate.py
    test_keys.py
  requirements.txt
```

## 3) FastAPI 템플릿 코드

### 3.1 `app/main.py`
```python
from fastapi import FastAPI
from app.api.routers import providers, keys, settings, content, generate, usage

app = FastAPI(title="ThreadHook API", version="1.0.0")

app.include_router(providers.router, prefix="/v1")
app.include_router(keys.router, prefix="/v1")
app.include_router(settings.router, prefix="/v1")
app.include_router(content.router, prefix="/v1")
app.include_router(generate.router, prefix="/v1")
app.include_router(usage.router, prefix="/v1")
```

### 3.2 `app/adapters/base.py`
```python
from __future__ import annotations
from abc import ABC, abstractmethod
from pydantic import BaseModel


class GenerateInput(BaseModel):
    title: str
    url: str
    content: str


class GenerateOptions(BaseModel):
    tone: str
    length: str
    language: str = "ko"
    model: str | None = None


class GenerateResult(BaseModel):
    provider_used: str
    model: str
    hook: str
    points: list[str]
    insight: str
    hashtags: list[str]
    source: str
    token_in: int = 0
    token_out: int = 0


class LLMAdapter(ABC):
    provider_name: str

    @abstractmethod
    async def validate_key(self, api_key: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        raise NotImplementedError
```

### 3.3 `app/services/provider_registry.py`
```python
from app.adapters.base import LLMAdapter
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.adapters.openai_adapter import OpenAIAdapter
from app.adapters.gemini_adapter import GeminiAdapter
from app.adapters.grok_adapter import GrokAdapter


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, LLMAdapter] = {
            "claude": AnthropicAdapter(),
            "chatgpt": OpenAIAdapter(),
            "gemini": GeminiAdapter(),
            "grok": GrokAdapter(),
        }

    def get(self, provider: str) -> LLMAdapter:
        if provider not in self._providers:
            raise ValueError(f"Unsupported provider: {provider}")
        return self._providers[provider]

    def list_models(self) -> dict[str, list[str]]:
        return {
            "claude": ["sonnet", "haiku"],
            "chatgpt": ["gpt-4.1", "gpt-4o-mini"],
            "gemini": ["gemini-2.0-flash"],
            "grok": ["grok-3"],
        }
```

### 3.4 `app/services/generation_service.py`
```python
from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult
from app.services.provider_registry import ProviderRegistry
from app.services.routing_service import RoutingService
from app.services.key_service import KeyService


class GenerationService:
    def __init__(self, registry: ProviderRegistry, routing: RoutingService, key_service: KeyService) -> None:
        self.registry = registry
        self.routing = routing
        self.key_service = key_service

    async def generate(self, user_id: str, data: GenerateInput, opt: GenerateOptions, provider_mode: str, provider: str | None) -> GenerateResult:
        provider_order = await self.routing.resolve_provider_order(user_id=user_id, provider_mode=provider_mode, provider=provider)

        last_error: Exception | None = None
        for target in provider_order:
            try:
                adapter = self.registry.get(target)
                api_key = await self.key_service.get_decrypted_key(user_id=user_id, provider=target)
                return await adapter.generate_thread(api_key=api_key, data=data, opt=opt)
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(f"All providers failed: {last_error}")
```

### 3.5 `app/api/routers/generate.py`
```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.adapters.base import GenerateInput, GenerateOptions
from app.services.provider_registry import ProviderRegistry
from app.services.routing_service import RoutingService
from app.services.key_service import KeyService
from app.services.generation_service import GenerationService

router = APIRouter(tags=["Generate"])


class GenerateThreadRequest(BaseModel):
    input: GenerateInput
    options: GenerateOptions
    providerMode: str = "priority"
    provider: str | None = None


@router.post("/generate/thread")
async def generate_thread(payload: GenerateThreadRequest):
    registry = ProviderRegistry()
    routing = RoutingService()
    key_service = KeyService()
    service = GenerationService(registry, routing, key_service)

    user_id = "TODO: read from auth token"
    result = await service.generate(
        user_id=user_id,
        data=payload.input,
        opt=payload.options,
        provider_mode=payload.providerMode,
        provider=payload.provider,
    )

    return {
        "providerUsed": result.provider_used,
        "model": result.model,
        "thread": {
            "hook": result.hook,
            "points": result.points,
            "insight": result.insight,
            "hashtags": result.hashtags,
            "source": result.source,
        },
        "metrics": {
            "tokenIn": result.token_in,
            "tokenOut": result.token_out,
        },
    }
```

### 3.6 `app/api/routers/keys.py`
```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.key_service import KeyService
from app.services.provider_registry import ProviderRegistry

router = APIRouter(tags=["Keys"])


class SaveKeyRequest(BaseModel):
    apiKey: str


@router.put("/keys/{provider}")
async def save_key(provider: str, body: SaveKeyRequest):
    registry = ProviderRegistry()
    key_service = KeyService()

    adapter = registry.get(provider)
    valid = await adapter.validate_key(body.apiKey)
    if not valid:
        return {"saved": False, "provider": provider, "keyStatus": "invalid"}

    user_id = "TODO: read from auth token"
    await key_service.save_key(user_id=user_id, provider=provider, plain_key=body.apiKey)
    return {"saved": True, "provider": provider, "keyStatus": "active"}
```

### 3.7 `app/services/key_service.py`
```python
from app.utils.crypto import encrypt_key, decrypt_key


class KeyService:
    async def save_key(self, user_id: str, provider: str, plain_key: str) -> None:
        encrypted = encrypt_key(plain_key)
        # TODO: repository upsert
        _ = (user_id, provider, encrypted)

    async def get_decrypted_key(self, user_id: str, provider: str) -> str:
        # TODO: repository fetch encrypted_key
        encrypted_from_db = b"TODO"
        return decrypt_key(encrypted_from_db)
```

---

## 4) NestJS 권장 폴더 구조

```text
backend-nestjs/
  src/
    main.ts
    app.module.ts
    common/
      filters/http-exception.filter.ts
      guards/auth.guard.ts
      interceptors/logging.interceptor.ts
      constants/providers.ts
    modules/
      providers/
        providers.module.ts
        providers.controller.ts
        providers.service.ts
      keys/
        keys.module.ts
        keys.controller.ts
        keys.service.ts
        dto/save-key.dto.ts
      settings/
        settings.module.ts
        settings.controller.ts
        settings.service.ts
      content/
        content.module.ts
        content.controller.ts
        content.service.ts
      generate/
        generate.module.ts
        generate.controller.ts
        generate.service.ts
        dto/generate-thread.dto.ts
      usage/
        usage.module.ts
        usage.controller.ts
        usage.service.ts
    llm/
      llm.module.ts
      llm.registry.ts
      adapters/
        llm.adapter.ts
        anthropic.adapter.ts
        openai.adapter.ts
        gemini.adapter.ts
        grok.adapter.ts
      routing.service.ts
    infra/
      db/
        prisma.service.ts
      crypto/
        crypto.service.ts
  prisma/
    schema.prisma
  test/
  package.json
```

## 5) NestJS 템플릿 코드

### 5.1 `src/common/constants/providers.ts`
```ts
export type ProviderName = 'claude' | 'chatgpt' | 'gemini' | 'grok';

export const PROVIDER_MODELS: Record<ProviderName, string[]> = {
  claude: ['sonnet', 'haiku'],
  chatgpt: ['gpt-4.1', 'gpt-4o-mini'],
  gemini: ['gemini-2.0-flash'],
  grok: ['grok-3'],
};
```

### 5.2 `src/llm/adapters/llm.adapter.ts`
```ts
import { ProviderName } from '../../common/constants/providers';

export interface GenerateInput {
  title: string;
  url: string;
  content: string;
}

export interface GenerateOptions {
  tone: 'neutral' | 'professional' | 'casual';
  length: 'short' | 'medium' | 'long';
  language: string;
  model?: string;
}

export interface GenerateResult {
  providerUsed: ProviderName;
  model: string;
  hook: string;
  points: string[];
  insight: string;
  hashtags: string[];
  source: string;
  tokenIn: number;
  tokenOut: number;
}

export interface LlmAdapter {
  readonly provider: ProviderName;
  validateKey(apiKey: string): Promise<boolean>;
  generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult>;
}
```

### 5.3 `src/llm/llm.registry.ts`
```ts
import { Injectable } from '@nestjs/common';
import { LlmAdapter } from './adapters/llm.adapter';
import { ProviderName } from '../common/constants/providers';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { GrokAdapter } from './adapters/grok.adapter';

@Injectable()
export class LlmRegistry {
  private readonly map: Record<ProviderName, LlmAdapter>;

  constructor(
    anthropic: AnthropicAdapter,
    openai: OpenAiAdapter,
    gemini: GeminiAdapter,
    grok: GrokAdapter,
  ) {
    this.map = {
      claude: anthropic,
      chatgpt: openai,
      gemini,
      grok,
    };
  }

  get(provider: ProviderName): LlmAdapter {
    return this.map[provider];
  }
}
```

### 5.4 `src/modules/generate/dto/generate-thread.dto.ts`
```ts
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GenerateInputDto {
  @IsString() title!: string;
  @IsString() url!: string;
  @IsString() content!: string;
}

class GenerateOptionsDto {
  @IsIn(['neutral', 'professional', 'casual']) tone!: 'neutral' | 'professional' | 'casual';
  @IsIn(['short', 'medium', 'long']) length!: 'short' | 'medium' | 'long';
  @IsString() language!: string;
  @IsOptional() @IsString() model?: string;
}

export class GenerateThreadDto {
  @ValidateNested() @Type(() => GenerateInputDto) input!: GenerateInputDto;
  @ValidateNested() @Type(() => GenerateOptionsDto) options!: GenerateOptionsDto;
  @IsIn(['single', 'priority']) providerMode!: 'single' | 'priority';
  @IsOptional() @IsIn(['claude', 'chatgpt', 'gemini', 'grok']) provider?: 'claude' | 'chatgpt' | 'gemini' | 'grok';
}
```

### 5.5 `src/modules/generate/generate.service.ts`
```ts
import { Injectable } from '@nestjs/common';
import { LlmRegistry } from '../../llm/llm.registry';
import { RoutingService } from '../../llm/routing.service';
import { KeysService } from '../keys/keys.service';
import { GenerateThreadDto } from './dto/generate-thread.dto';

@Injectable()
export class GenerateService {
  constructor(
    private readonly registry: LlmRegistry,
    private readonly routing: RoutingService,
    private readonly keysService: KeysService,
  ) {}

  async generate(userId: string, dto: GenerateThreadDto) {
    const order = await this.routing.resolveProviderOrder(userId, dto.providerMode, dto.provider);
    let lastError: unknown;

    for (const provider of order) {
      try {
        const adapter = this.registry.get(provider);
        const apiKey = await this.keysService.getPlainKey(userId, provider);
        return await adapter.generateThread(apiKey, dto.input, dto.options);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error('All providers failed');
  }
}
```

### 5.6 `src/modules/generate/generate.controller.ts`
```ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { GenerateService } from './generate.service';
import { GenerateThreadDto } from './dto/generate-thread.dto';

@Controller('v1/generate')
@UseGuards(AuthGuard)
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post('thread')
  async generateThread(@Req() req: any, @Body() dto: GenerateThreadDto) {
    const userId = req.user.id;
    const result = await this.generateService.generate(userId, dto);

    return {
      providerUsed: result.providerUsed,
      model: result.model,
      thread: {
        hook: result.hook,
        points: result.points,
        insight: result.insight,
        hashtags: result.hashtags,
        source: result.source,
      },
      metrics: {
        tokenIn: result.tokenIn,
        tokenOut: result.tokenOut,
      },
    };
  }
}
```

### 5.7 `src/modules/keys/keys.controller.ts`
```ts
import { Body, Controller, Param, Put, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { KeysService } from './keys.service';
import { LlmRegistry } from '../../llm/llm.registry';
import { ProviderName } from '../../common/constants/providers';

class SaveKeyDto {
  @IsString()
  @MinLength(8)
  apiKey!: string;
}

@Controller('v1/keys')
@UseGuards(AuthGuard)
export class KeysController {
  constructor(
    private readonly keysService: KeysService,
    private readonly registry: LlmRegistry,
  ) {}

  @Put(':provider')
  async upsertKey(@Req() req: any, @Param('provider') provider: ProviderName, @Body() dto: SaveKeyDto) {
    const adapter = this.registry.get(provider);
    const valid = await adapter.validateKey(dto.apiKey);

    if (!valid) {
      return { saved: false, provider, keyStatus: 'invalid' };
    }

    await this.keysService.save(req.user.id, provider, dto.apiKey);
    return { saved: true, provider, keyStatus: 'active' };
  }
}
```

### 5.8 `src/modules/keys/keys.service.ts`
```ts
import { Injectable } from '@nestjs/common';
import { ProviderName } from '../../common/constants/providers';
import { CryptoService } from '../../infra/crypto/crypto.service';

@Injectable()
export class KeysService {
  constructor(private readonly crypto: CryptoService) {}

  async save(userId: string, provider: ProviderName, plainKey: string): Promise<void> {
    const encrypted = this.crypto.encrypt(plainKey);
    // TODO: persist encrypted key by userId + provider
    void { userId, provider, encrypted };
  }

  async getPlainKey(userId: string, provider: ProviderName): Promise<string> {
    // TODO: load encrypted key from db
    const encrypted = 'TODO';
    void { userId, provider };
    return this.crypto.decrypt(encrypted);
  }
}
```

---

## 6) 구현 체크리스트
- FastAPI/NestJS 모두 `provider adapter` 단위 테스트 작성
- `fallback` 시나리오(429/5xx/timeout) 통합 테스트 작성
- 키 저장/조회 경로에서 평문 로그 차단
- `requestId` 기반 추적 로그 적용
- 응답 스키마 검증 추가(Pydantic/class-validator + e2e test)

## 7) 권장 시작 순서
1. `Keys` 모듈 먼저 구현(보안/암호화/검증)
2. `Generate` 단일 provider 경로 구현
3. `Routing/Fallback` 추가
4. `Usage` 및 운영 지표 추가
5. e2e 테스트 + 성능 테스트
