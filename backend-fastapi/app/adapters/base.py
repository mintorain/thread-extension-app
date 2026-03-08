from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel

class GenerateInput(BaseModel):
    title: str
    url: str
    content: str

class GenerateOptions(BaseModel):
    tone: str
    length: str
    language: str = 'ko'
    model: Optional[str] = None

class GenerateResult(BaseModel):
    provider_used: str
    model: str
    hook: str
    points: List[str]
    insight: str
    hashtags: List[str]
    source: str
    token_in: int = 0
    token_out: int = 0

_LENGTH_RULES = {
    'short': {
        'hook_max': 40,
        'points_count': 3,
        'point_max': 50,
        'insight_max': 40,
        'hashtag_count': 3,
        'total_hint': '전체 300자 이내',
    },
    'medium': {
        'hook_max': 60,
        'points_count': 4,
        'point_max': 80,
        'insight_max': 60,
        'hashtag_count': 4,
        'total_hint': '전체 500자 이내',
    },
    'long': {
        'hook_max': 80,
        'points_count': 6,
        'point_max': 100,
        'insight_max': 80,
        'hashtag_count': 5,
        'total_hint': '전체 800자 이내',
    },
}


def build_thread_prompt(data: GenerateInput, opt: GenerateOptions) -> str:
    rules = _LENGTH_RULES.get(opt.length, _LENGTH_RULES['medium'])

    return (
        f'다음 기사를 기반으로 SNS 스레드 형태의 정보글 초안을 작성해줘.\n\n'
        f'제목: {data.title}\n'
        f'URL: {data.url}\n'
        f'본문:\n{data.content[:4000]}\n\n'
        f'톤: {opt.tone}, 언어: {opt.language}\n\n'
        f'## 글자수 규칙 (반드시 지켜야 함)\n'
        f'- hook: {rules["hook_max"]}자 이내의 시선을 끄는 첫 문장\n'
        f'- points: 정확히 {rules["points_count"]}개, 각 {rules["point_max"]}자 이내\n'
        f'- insight: {rules["insight_max"]}자 이내 한 줄 인사이트\n'
        f'- hashtags: {rules["hashtag_count"]}개\n'
        f'- {rules["total_hint"]}\n\n'
        f'반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만 반환해:\n'
        '{{\n'
        '  "hook": "첫 문장",\n'
        '  "points": ["포인트1", "포인트2"],\n'
        '  "insight": "인사이트",\n'
        '  "hashtags": ["#태그1", "#태그2"]\n'
        '}}'
    )


def parse_thread_json(text: str) -> dict:
    import json

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


class LLMAdapter(ABC):
    provider_name: str

    @abstractmethod
    async def validate_key(self, api_key: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        raise NotImplementedError

