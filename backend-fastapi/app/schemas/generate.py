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

class GenerateThreadRequest(BaseModel):
    input: GenerateInput
    options: GenerateOptions
    providerMode: str = 'priority'
    provider: str | None = None
