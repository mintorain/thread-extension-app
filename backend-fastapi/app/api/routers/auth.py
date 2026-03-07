from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.services.key_service import key_service

router = APIRouter(tags=['Auth'])

_pending_states: dict[str, tuple[str, str]] = {}


class OAuthStartRequest(BaseModel):
    provider: str


@router.post('/auth/oauth/start')
async def oauth_start(body: OAuthStartRequest, request: Request) -> dict:
    user_id = 'demo-user'
    state = uuid4().hex
    _pending_states[state] = (user_id, body.provider)

    base = str(request.base_url).rstrip('/')
    auth_url = f"{base}/v1/auth/oauth/mock-consent?provider={body.provider}&state={state}"

    return {
        'provider': body.provider,
        'state': state,
        'authorizationUrl': auth_url,
        'message': 'Open the authorization URL and click approve.',
    }


@router.get('/auth/oauth/status')
async def oauth_status(provider: str = Query(...)) -> dict:
    user_id = 'demo-user'
    connected = await key_service.has_auth(user_id=user_id, provider=provider)
    auth_type = await key_service.get_auth_type(user_id=user_id, provider=provider)
    return {
        'provider': provider,
        'connected': connected,
        'authType': auth_type,
    }


@router.get('/auth/oauth/mock-consent', response_class=HTMLResponse)
async def oauth_mock_consent(provider: str = Query(...), state: str = Query(...), request: Request = None) -> str:
    base = str(request.base_url).rstrip('/')
    approve = f"{base}/v1/auth/oauth/mock-approve?provider={provider}&state={state}"
    cancel = f"{base}/v1/auth/oauth/mock-cancel?provider={provider}&state={state}"

    return f"""
    <!doctype html>
    <html lang=\"ko\"><head><meta charset=\"UTF-8\"><title>OAuth Mock Consent</title>
    <style>body{{font-family:Arial,sans-serif;padding:24px;max-width:760px;margin:auto}} .box{{border:1px solid #ddd;border-radius:12px;padding:18px}} a.btn{{display:inline-block;margin-right:8px;padding:10px 14px;border-radius:8px;text-decoration:none}} .ok{{background:#0f766e;color:#fff}} .no{{background:#e2e8f0;color:#0f172a}}</style>
    </head><body>
    <div class=\"box\">
      <h2>{provider} OAuth 인증(모의)</h2>
      <p>확장앱에서 OAuth 등록을 테스트하기 위한 데모 동의 화면입니다.</p>
      <p>승인을 누르면 demo-user 계정에 OAuth 인증이 등록됩니다.</p>
      <a class=\"btn ok\" href=\"{approve}\">승인</a>
      <a class=\"btn no\" href=\"{cancel}\">취소</a>
    </div>
    </body></html>
    """


@router.get('/auth/oauth/mock-approve', response_class=HTMLResponse)
async def oauth_mock_approve(provider: str = Query(...), state: str = Query(...)) -> str:
    pending = _pending_states.pop(state, None)
    if not pending:
        raise HTTPException(status_code=400, detail='Invalid or expired OAuth state')

    user_id, pending_provider = pending
    if provider != pending_provider:
        raise HTTPException(status_code=400, detail='Provider does not match OAuth state')

    token = f"oauth-{provider}-{uuid4().hex[:10]}"
    await key_service.save_oauth_token(user_id=user_id, provider=provider, access_token=token)

    return """
    <!doctype html>
    <html lang=\"ko\"><head><meta charset=\"UTF-8\"><title>OAuth 완료</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;max-width:760px;margin:auto} .ok{border:1px solid #99f6e4;background:#f0fdfa;padding:16px;border-radius:12px}</style>
    </head><body><div class=\"ok\"><h3>OAuth 등록 완료</h3><p>확장앱으로 돌아가 상태를 확인하세요.</p></div></body></html>
    """


@router.get('/auth/oauth/mock-cancel', response_class=HTMLResponse)
async def oauth_mock_cancel(provider: str = Query(...), state: str = Query(...)) -> str:
    _pending_states.pop(state, None)
    return f"""
    <!doctype html>
    <html lang=\"ko\"><head><meta charset=\"UTF-8\"><title>OAuth 취소</title></head>
    <body style=\"font-family:Arial,sans-serif;padding:24px\"><h3>{provider} OAuth 인증이 취소되었습니다.</h3></body></html>
    """
