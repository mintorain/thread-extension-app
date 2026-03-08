from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.services.key_service import key_service

router = APIRouter(tags=['Auth'])

import os as _os

_STATE_SECRET = _os.environ.get('OAUTH_STATE_SECRET', 'threadhook-oauth-state-secret-change-me').encode('utf-8')
_STATE_TTL_SECONDS = 15 * 60


class OAuthStartRequest(BaseModel):
    provider: str


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')


def _b64url_decode(text: str) -> bytes:
    padding = '=' * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _sign_state_payload(payload: bytes) -> str:
    sig = hmac.new(_STATE_SECRET, payload, hashlib.sha256).digest()
    return _b64url_encode(sig)


def _build_state(user_id: str, provider: str) -> str:
    payload_obj = {
        'uid': user_id,
        'provider': provider,
        'ts': int(time.time()),
        'nonce': uuid4().hex,
    }
    payload = json.dumps(payload_obj, separators=(',', ':')).encode('utf-8')
    payload_b64 = _b64url_encode(payload)
    sig_b64 = _sign_state_payload(payload)
    return f'{payload_b64}.{sig_b64}'


def _parse_state(state: str) -> dict:
    try:
        payload_b64, sig_b64 = state.split('.', 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail='Invalid OAuth state format') from exc

    payload = _b64url_decode(payload_b64)
    expected_sig = _sign_state_payload(payload)
    if not hmac.compare_digest(sig_b64, expected_sig):
        raise HTTPException(status_code=400, detail='Invalid OAuth state signature')

    try:
        data = json.loads(payload.decode('utf-8'))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail='Invalid OAuth state payload') from exc

    ts = int(data.get('ts', 0))
    if ts <= 0 or int(time.time()) - ts > _STATE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail='Expired OAuth state')

    if not data.get('uid') or not data.get('provider'):
        raise HTTPException(status_code=400, detail='Missing OAuth state fields')

    return data


@router.post('/auth/oauth/start')
async def oauth_start(body: OAuthStartRequest, request: Request) -> dict:
    user_id = 'demo-user'
    state = _build_state(user_id=user_id, provider=body.provider)

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
    state_data = _parse_state(state)

    user_id = state_data['uid']
    pending_provider = state_data['provider']
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
    _ = provider
    _ = state
    return """
    <!doctype html>
    <html lang=\"ko\"><head><meta charset=\"UTF-8\"><title>OAuth 취소</title></head>
    <body style=\"font-family:Arial,sans-serif;padding:24px\"><h3>OAuth 인증이 취소되었습니다.</h3></body></html>
    """
