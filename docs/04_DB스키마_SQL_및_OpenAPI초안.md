# DB 스키마 SQL 초안 + OpenAPI 3.1 YAML 초안

## DB 스키마 SQL 초안 (PostgreSQL)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_name') THEN
    CREATE TYPE provider_name AS ENUM ('claude', 'chatgpt', 'gemini', 'grok');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_mode') THEN
    CREATE TYPE provider_mode AS ENUM ('single', 'priority');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'key_status') THEN
    CREATE TYPE key_status AS ENUM ('active', 'invalid', 'revoked', 'unknown');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_status') THEN
    CREATE TYPE generation_status AS ENUM ('success', 'failed', 'fallback_success', 'fallback_failed');
  END IF;
END$$;

-- Users (minimal; replace with your auth user table if already exists)
CREATE TABLE IF NOT EXISTS app_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI settings per user
CREATE TABLE IF NOT EXISTS user_ai_settings (
  user_id                 UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  mode                    provider_mode NOT NULL DEFAULT 'single',
  primary_provider        provider_name NOT NULL DEFAULT 'chatgpt',
  provider_priority       provider_name[] NOT NULL DEFAULT ARRAY['chatgpt','claude','gemini','grok']::provider_name[],
  fallback_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  default_model_by_provider JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_settings_updated_at
  ON user_ai_settings(updated_at DESC);

-- API keys (encrypted; never store plaintext)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider              provider_name NOT NULL,
  encrypted_key         BYTEA NOT NULL,
  key_fingerprint       TEXT NOT NULL, -- e.g., SHA-256 of key (for dedupe/audit)
  key_status            key_status NOT NULL DEFAULT 'unknown',
  last_validated_at     TIMESTAMPTZ,
  validation_error_code TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider
  ON user_api_keys(user_id, provider);

-- Optional extraction cache
CREATE TABLE IF NOT EXISTS content_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash        TEXT NOT NULL UNIQUE, -- SHA-256(url)
  url             TEXT NOT NULL,
  title           TEXT,
  source_domain   TEXT,
  published_at    TIMESTAMPTZ,
  content         TEXT NOT NULL,
  extracted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_extractions_expires_at
  ON content_extractions(expires_at);

-- Generation logs
CREATE TABLE IF NOT EXISTS generation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider_used       provider_name NOT NULL,
  model               TEXT NOT NULL,
  status              generation_status NOT NULL,
  fallback_used       BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_from       provider_name,
  latency_ms          INTEGER CHECK (latency_ms >= 0),
  token_in            INTEGER CHECK (token_in >= 0),
  token_out           INTEGER CHECK (token_out >= 0),
  estimated_cost_usd  NUMERIC(12,6) CHECK (estimated_cost_usd >= 0),
  request_id          TEXT,
  error_code          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_user_created
  ON generation_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_logs_provider_created
  ON generation_logs(provider_used, created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_ai_settings_updated_at ON user_ai_settings;
CREATE TRIGGER trg_user_ai_settings_updated_at
BEFORE UPDATE ON user_ai_settings
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER trg_user_api_keys_updated_at
BEFORE UPDATE ON user_api_keys
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
```

## OpenAPI 3.1 YAML 초안

```yaml
openapi: 3.1.0
info:
  title: ThreadHook API
  version: 1.0.0
  description: API for multi-provider thread generation from web content.
servers:
  - url: https://api.threadhook.com
security:
  - bearerAuth: []

tags:
  - name: Providers
  - name: Keys
  - name: Settings
  - name: Content
  - name: Generate
  - name: Usage

paths:
  /v1/providers:
    get:
      tags: [Providers]
      summary: List supported providers and models
      operationId: listProviders
      responses:
        '200':
          description: Provider list
          content:
            application/json:
              schema:
                type: object
                properties:
                  providers:
                    type: array
                    items:
                      $ref: '#/components/schemas/ProviderInfo'
                required: [providers]

  /v1/keys/{provider}/validate:
    post:
      tags: [Keys]
      summary: Validate provider API key
      operationId: validateProviderKey
      parameters:
        - $ref: '#/components/parameters/ProviderPath'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ValidateKeyRequest'
      responses:
        '200':
          description: Validation result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidateKeyResponse'
        '422':
          $ref: '#/components/responses/ValidationFailed'

  /v1/keys/{provider}:
    put:
      tags: [Keys]
      summary: Save or update provider API key
      operationId: upsertProviderKey
      parameters:
        - $ref: '#/components/parameters/ProviderPath'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SaveKeyRequest'
      responses:
        '200':
          description: Key saved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SaveKeyResponse'
        '422':
          $ref: '#/components/responses/ValidationFailed'
    delete:
      tags: [Keys]
      summary: Delete provider API key
      operationId: deleteProviderKey
      parameters:
        - $ref: '#/components/parameters/ProviderPath'
      responses:
        '200':
          description: Key deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteKeyResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /v1/settings/ai:
    get:
      tags: [Settings]
      summary: Get AI settings
      operationId: getAiSettings
      responses:
        '200':
          description: AI settings
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AiSettings'
    put:
      tags: [Settings]
      summary: Update AI settings
      operationId: updateAiSettings
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAiSettingsRequest'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  updated:
                    type: boolean
                required: [updated]
        '400':
          $ref: '#/components/responses/InvalidRequest'

  /v1/content/extract:
    post:
      tags: [Content]
      summary: Extract normalized content from URL
      operationId: extractContent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExtractContentRequest'
      responses:
        '200':
          description: Extracted content
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExtractContentResponse'

  /v1/generate/thread:
    post:
      tags: [Generate]
      summary: Generate thread-ready post from extracted content
      operationId: generateThread
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateThreadRequest'
      responses:
        '200':
          description: Generated thread
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateThreadResponse'
        '429':
          $ref: '#/components/responses/RateLimited'
        '503':
          $ref: '#/components/responses/ProviderUnavailable'

  /v1/usage/summary:
    get:
      tags: [Usage]
      summary: Usage summary by date range
      operationId: getUsageSummary
      parameters:
        - name: from
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: to
          in: query
          required: true
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Usage summary
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageSummaryResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    ProviderPath:
      name: provider
      in: path
      required: true
      schema:
        $ref: '#/components/schemas/ProviderName'

  responses:
    InvalidRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    ValidationFailed:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    RateLimited:
      description: Rate limited
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    ProviderUnavailable:
      description: Provider unavailable
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'

  schemas:
    ProviderName:
      type: string
      enum: [claude, chatgpt, gemini, grok]

    ProviderInfo:
      type: object
      properties:
        name:
          $ref: '#/components/schemas/ProviderName'
        models:
          type: array
          items:
            type: string
      required: [name, models]

    ValidateKeyRequest:
      type: object
      properties:
        apiKey:
          type: string
          minLength: 8
      required: [apiKey]

    ValidateKeyResponse:
      type: object
      properties:
        valid:
          type: boolean
        provider:
          $ref: '#/components/schemas/ProviderName'
        validatedAt:
          type: string
          format: date-time
      required: [valid, provider, validatedAt]

    SaveKeyRequest:
      allOf:
        - $ref: '#/components/schemas/ValidateKeyRequest'

    SaveKeyResponse:
      type: object
      properties:
        saved:
          type: boolean
        provider:
          $ref: '#/components/schemas/ProviderName'
        keyStatus:
          type: string
          enum: [active, invalid, revoked, unknown]
      required: [saved, provider, keyStatus]

    DeleteKeyResponse:
      type: object
      properties:
        deleted:
          type: boolean
        provider:
          $ref: '#/components/schemas/ProviderName'
      required: [deleted, provider]

    AiSettings:
      type: object
      properties:
        mode:
          type: string
          enum: [single, priority]
        primaryProvider:
          $ref: '#/components/schemas/ProviderName'
        providerPriority:
          type: array
          items:
            $ref: '#/components/schemas/ProviderName'
        fallbackEnabled:
          type: boolean
        defaultModelByProvider:
          type: object
          additionalProperties:
            type: string
      required:
        [mode, primaryProvider, providerPriority, fallbackEnabled, defaultModelByProvider]

    UpdateAiSettingsRequest:
      allOf:
        - $ref: '#/components/schemas/AiSettings'

    ExtractContentRequest:
      type: object
      properties:
        url:
          type: string
          format: uri
      required: [url]

    ExtractContentResponse:
      type: object
      properties:
        title:
          type: string
        url:
          type: string
          format: uri
        publishedAt:
          type: string
          format: date-time
          nullable: true
        content:
          type: string
        source:
          type: string
      required: [title, url, content, source]

    GenerateThreadRequest:
      type: object
      properties:
        input:
          type: object
          properties:
            title:
              type: string
            url:
              type: string
              format: uri
            content:
              type: string
          required: [title, url, content]
        options:
          type: object
          properties:
            tone:
              type: string
              enum: [neutral, professional, casual]
            length:
              type: string
              enum: [short, medium, long]
            language:
              type: string
              example: ko
            providerMode:
              type: string
              enum: [single, priority]
            provider:
              $ref: '#/components/schemas/ProviderName'
            model:
              type: string
          required: [tone, length, language, providerMode]
      required: [input, options]

    GenerateThreadResponse:
      type: object
      properties:
        providerUsed:
          $ref: '#/components/schemas/ProviderName'
        model:
          type: string
        thread:
          type: object
          properties:
            hook:
              type: string
            points:
              type: array
              items:
                type: string
            insight:
              type: string
            hashtags:
              type: array
              items:
                type: string
            source:
              type: string
              format: uri
          required: [hook, points, insight, hashtags, source]
        metrics:
          type: object
          properties:
            latencyMs:
              type: integer
              minimum: 0
            tokenIn:
              type: integer
              minimum: 0
            tokenOut:
              type: integer
              minimum: 0
          required: [latencyMs, tokenIn, tokenOut]
      required: [providerUsed, model, thread, metrics]

    UsageByProvider:
      type: object
      properties:
        provider:
          $ref: '#/components/schemas/ProviderName'
        requests:
          type: integer
          minimum: 0
      required: [provider, requests]

    UsageSummaryResponse:
      type: object
      properties:
        totalRequests:
          type: integer
          minimum: 0
        byProvider:
          type: array
          items:
            $ref: '#/components/schemas/UsageByProvider'
        estimatedCostUsd:
          type: number
          minimum: 0
      required: [totalRequests, byProvider, estimatedCostUsd]

    ErrorEnvelope:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
              example: VALIDATION_FAILED
            message:
              type: string
            requestId:
              type: string
          required: [code, message, requestId]
      required: [error]
```
