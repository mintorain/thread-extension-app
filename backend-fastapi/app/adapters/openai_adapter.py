from __future__ import annotations

import httpx

from app.adapters.base import (
    GenerateInput, GenerateOptions, GenerateResult, LLMAdapter,
    build_thread_prompt, parse_thread_json,
)

_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
_DEFAULT_MODEL = 'gpt-4.1'


class OpenAIAdapter(LLMAdapter):
    provider_name = 'chatgpt'

    async def validate_key(self, api_key: str) -> bool:
        key = (api_key or '').strip()
        if len(key) < 20:
            return False
        known_prefixes = ('sk-', 'sk-proj-', 'oai-')
        if key.startswith(known_prefixes):
            return True
        return ' ' not in key and '\t' not in key and '\n' not in key

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        model = opt.model or _DEFAULT_MODEL
        prompt = build_thread_prompt(data, opt)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                _OPENAI_API_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': model,
                    'max_tokens': 1024,
                    'messages': [
                        {'role': 'system', 'content': 'JSON 형식으로만 응답하는 SNS 스레드 작성 도우미입니다. 지정된 글자수 규칙을 반드시 지켜야 합니다.'},
                        {'role': 'user', 'content': prompt},
                    ],
                },
            )

        if resp.status_code != 200:
            detail = resp.text[:300]
            raise RuntimeError(f'OpenAI API error {resp.status_code}: {detail}')

        body = resp.json()
        raw_text = body.get('choices', [{}])[0].get('message', {}).get('content', '')
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
            token_in=usage.get('prompt_tokens', 0),
            token_out=usage.get('completion_tokens', 0),
        )
