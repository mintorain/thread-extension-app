from __future__ import annotations

import httpx

from app.adapters.base import (
    GenerateInput, GenerateOptions, GenerateResult, LLMAdapter,
    build_thread_prompt, parse_thread_json,
)

_ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
_DEFAULT_MODEL = 'claude-sonnet-4-20250514'


class AnthropicAdapter(LLMAdapter):
    provider_name = 'claude'

    async def validate_key(self, api_key: str) -> bool:
        return api_key.startswith('sk-') and len(api_key) > 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        model = opt.model or _DEFAULT_MODEL
        prompt = build_thread_prompt(data, opt)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                _ANTHROPIC_API_URL,
                headers={
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                json={
                    'model': model,
                    'max_tokens': 1024,
                    'messages': [{'role': 'user', 'content': prompt}],
                },
            )

        if resp.status_code != 200:
            detail = resp.text[:300]
            raise RuntimeError(f'Anthropic API error {resp.status_code}: {detail}')

        body = resp.json()
        raw_text = body.get('content', [{}])[0].get('text', '')
        usage = body.get('usage', {})
        parsed = parse_thread_json(raw_text)

        return GenerateResult(
            provider_used=self.provider_name,
            model=model,
            hook=parsed.get('hook', ''),
            points=parsed.get('points', []),
            insight=parsed.get('insight', ''),
            hashtags=parsed.get('hashtags', []),
            source=data.url,
            token_in=usage.get('input_tokens', 0),
            token_out=usage.get('output_tokens', 0),
        )
