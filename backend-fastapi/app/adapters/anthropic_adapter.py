from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult, LLMAdapter

class AnthropicAdapter(LLMAdapter):
    provider_name = 'claude'

    async def validate_key(self, api_key: str) -> bool:
        return api_key.startswith('sk-') and len(api_key) > 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        return GenerateResult(
            provider_used=self.provider_name,
            model=opt.model or 'sonnet',
            hook=f'{data.title} 핵심 정리',
            points=['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
            insight='후속 시장 반응 추적이 필요합니다.',
            hashtags=['#이슈정리', '#트렌드', '#뉴스'],
            source=data.url,
            token_in=1200,
            token_out=280,
        )
