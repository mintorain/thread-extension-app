from __future__ import annotations

import httpx

from app.adapters.base import (
    GenerateInput, GenerateOptions, GenerateResult, LLMAdapter,
    build_thread_prompt, parse_thread_json,
)

_DEFAULT_MODEL = 'gemini-2.0-flash'


class GeminiAdapter(LLMAdapter):
    provider_name = 'gemini'

    async def validate_key(self, api_key: str) -> bool:
        key = (api_key or '').strip()
        return len(key) >= 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        model = opt.model or _DEFAULT_MODEL
        prompt = build_thread_prompt(data, opt)
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                url,
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'maxOutputTokens': 1024},
                },
            )

        if resp.status_code != 200:
            detail = resp.text[:300]
            raise RuntimeError(f'Gemini API error {resp.status_code}: {detail}')

        body = resp.json()
        candidates = body.get('candidates', [])
        raw_text = ''
        if candidates:
            parts = candidates[0].get('content', {}).get('parts', [])
            if parts:
                raw_text = parts[0].get('text', '')

        usage = body.get('usageMetadata', {})
        parsed = parse_thread_json(raw_text)

        return GenerateResult(
            provider_used=self.provider_name,
            model=model,
            hook=parsed.get('hook', ''),
            points=parsed.get('points', []),
            insight=parsed.get('insight', ''),
            hashtags=parsed.get('hashtags', []),
            source=data.url,
            token_in=usage.get('promptTokenCount', 0),
            token_out=usage.get('candidatesTokenCount', 0),
        )
