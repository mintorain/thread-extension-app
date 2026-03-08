from __future__ import annotations

import json

import httpx

from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult, LLMAdapter

_GROK_API_URL = 'https://api.x.ai/v1/chat/completions'
_DEFAULT_MODEL = 'grok-3'


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


class GrokAdapter(LLMAdapter):
    provider_name = 'grok'

    async def validate_key(self, api_key: str) -> bool:
        key = (api_key or '').strip()
        return key.startswith('xai-') and len(key) > 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        model = opt.model or _DEFAULT_MODEL
        prompt = _build_prompt(data, opt)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                _GROK_API_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': model,
                    'max_tokens': 1024,
                    'messages': [
                        {'role': 'system', 'content': 'JSON 형식으로만 응답하는 SNS 스레드 작성 도우미입니다.'},
                        {'role': 'user', 'content': prompt},
                    ],
                },
            )

        if resp.status_code != 200:
            detail = resp.text[:300]
            raise RuntimeError(f'Grok API error {resp.status_code}: {detail}')

        body = resp.json()
        raw_text = body.get('choices', [{}])[0].get('message', {}).get('content', '')
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
            token_in=usage.get('prompt_tokens', 0),
            token_out=usage.get('completion_tokens', 0),
        )
