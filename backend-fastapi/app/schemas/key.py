from pydantic import BaseModel

class SaveKeyRequest(BaseModel):
    apiKey: str
