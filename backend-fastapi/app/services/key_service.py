class KeyService:
    def __init__(self) -> None:
        self._store: dict[tuple[str, str], str] = {}
        self._oauth_store: dict[tuple[str, str], str] = {}

    async def save_key(self, user_id: str, provider: str, plain_key: str) -> None:
        self._store[(user_id, provider)] = plain_key

    async def save_oauth_token(self, user_id: str, provider: str, access_token: str) -> None:
        self._oauth_store[(user_id, provider)] = access_token

    async def has_auth(self, user_id: str, provider: str) -> bool:
        return (user_id, provider) in self._store or (user_id, provider) in self._oauth_store

    async def get_auth_type(self, user_id: str, provider: str) -> str | None:
        if (user_id, provider) in self._store:
            return 'api_key'
        if (user_id, provider) in self._oauth_store:
            return 'oauth'
        return None

    async def get_decrypted_key(self, user_id: str, provider: str) -> str:
        key = self._store.get((user_id, provider))
        if key:
            return key

        oauth_token = self._oauth_store.get((user_id, provider))
        if oauth_token:
            return oauth_token

        raise RuntimeError(f'No API key or OAuth token registered for provider={provider}')


key_service = KeyService()
