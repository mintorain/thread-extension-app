from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult, LLMAdapter

class OpenAIAdapter(LLMAdapter):
    provider_name = 'chatgpt'

    async def validate_key(self, api_key: str) -> bool:
        return api_key.startswith('sk-') and len(api_key) > 10

    async def generate_thread(self, api_key: str, data: GenerateInput, opt: GenerateOptions) -> GenerateResult:
        return GenerateResult(
            provider_used=self.provider_name,
            model=opt.model or 'gpt-4.1',
            hook=f'지금 봐야 할 이슈: {data.title}',
            points=['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
            insight='정책과 데이터 교차 지점을 확인할 필요가 있습니다.',
            hashtags=['#브리핑', '#업계동향', '#정보공유'],
            source=data.url,
            token_in=1300,
            token_out=300,
        )
