from fastapi import APIRouter

router = APIRouter(tags=['Content'])

@router.post('/content/extract')
async def extract_content(payload: dict) -> dict:
    url = payload.get('url', '')
    domain = url.split('/')[2] if '//' in url else 'unknown'
    return {
        'title': '샘플 기사 제목',
        'url': url,
        'publishedAt': None,
        'content': '정제된 본문 텍스트 샘플입니다.',
        'source': domain,
    }
