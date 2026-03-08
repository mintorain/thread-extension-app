from __future__ import annotations

import json

import httpx

from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult, LLMAdapter

_ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
_DEFAULT_MODEL = 'claude-sonnet-4-20250514'


def _build_prompt(data: GenerateInput, opt: GenerateOptions) -> str:
    return (
        f'다음 기사를 기반으로 SNS 스레드 형태의 정보글 초안을 작성해줘.\n\n'
        f'제목: {data.title}\n'
        f'URL: {data.url}\n'
        f'본문:\n{data.content[:4000]}\n\n'
        f'톤: {opt.tone}, 길이: {opt.length}, 언어: {opt.language}\n\n'
        f'반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만 반환해:\n'
        '{{\n'
        '  "hook": "시선을 끄는 첫 문장",\n'
        '  "points": ["핵심 포인트 1", "핵심 포인트 2", ...],\n'
        '  "insight": "인사이트 한 줄",\n'
        '  "hashtags": ["#해시태그1", "#해시태그2", ...]\n'
        '}}'
    )


def _parse_thread_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith('```'):
        lines = cleaned.split('\n')
        lines = lines[1:]
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        cleaned = '\n'.join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            'hook': cleaned[:100],
            'points': [cleaned[:200]],
            'insight': '',
            'hashtags': [],
        }


class AnthropicAdapter(LLMAdapter):
    provider_name = 'claude'

    async def validate_key(self, api_key: str) -> bool:
        return api_key.startswith('sk-') and len(api_key) > 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        model = opt.model or _DEFAULT_MODEL
        prompt = _build_prompt(data, opt)

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

        parsed = _parse_thread_json(raw_text)

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
