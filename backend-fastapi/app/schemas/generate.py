from typing import Optional
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

class GenerateThreadRequest(BaseModel):
    input: GenerateInput
    options: GenerateOptions
    providerMode: str = 'priority'
    provider: Optional[str] = None

