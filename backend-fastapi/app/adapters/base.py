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
    language: str = 'ko'
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
