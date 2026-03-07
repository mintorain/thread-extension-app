class KeyService:
    def __init__(self) -> None:
        self._store: dict[tuple[str, str], str] = {}

    async def save_key(self, user_id: str, provider: str, plain_key: str) -> None:
        self._store[(user_id, provider)] = plain_key

    async def get_decrypted_key(self, user_id: str, provider: str) -> str:
        key = self._store.get((user_id, provider))
        if not key:
            raise RuntimeError(f'No key registered for provider={provider}')
        return key
