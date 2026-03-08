# ThreadHook

브라우저에서 보고 있는 뉴스/블로그 페이지를 기반으로 AI가 스레드형 정보글 초안을 생성하는 Chrome 확장앱입니다.

## 주요 기능
- 현재 페이지 제목/URL/본문 자동 추출
- 멀티 AI Provider 지원 (Claude, ChatGPT, Gemini, Grok)
- Tone(전문/중립/캐주얼) 및 Length(짧게/보통/길게) 선택
- 생성 결과 클립보드 자동 복사

## 빠른 시작 (서버 설치 없이 바로 사용)

백엔드가 이미 배포되어 있어 별도 서버 설치 없이 확장앱만 설치하면 됩니다.

### 1) 확장앱 설치
1. [저장소 ZIP 다운로드](https://github.com/mintorain/thread-extension-app/archive/refs/heads/master.zip) 또는 `git clone`
2. Chrome에서 `chrome://extensions` 접속
3. 우측 상단 **개발자 모드** ON
4. **압축해제된 확장 프로그램을 로드** 클릭
5. `thread-extension-app` 폴더 선택

### 2) API Key 등록
1. 확장앱 아이콘 클릭 (사이드 패널 열림)
2. 설정(⚙) 아이콘 클릭
3. **Backend URL**: `https://threadhook-api-production.up.railway.app` (기본값)
4. **Provider** 선택 (claude / chatgpt / gemini / grok)
5. **API Key** 입력 후 `API 등록` 클릭

### 3) 스레드 생성
1. 뉴스/블로그 페이지를 연 상태에서 확장앱 사이드 패널 열기
2. `페이지 추출` 클릭
3. Tone / Length 선택
4. `스레드 생성` 클릭
5. 결과가 자동으로 클립보드에 복사됨

## 구성

| 폴더 | 설명 |
|------|------|
| `thread-extension-app/` | Chrome 확장앱 (Manifest V3, Side Panel) |
| `backend-fastapi/` | FastAPI 백엔드 서버 |
| `backend-nestjs/` | NestJS 백엔드 서버 (대안) |
| `docs/` | 기획/명세 문서 및 온보딩 페이지 |

## 배포 정보

- **백엔드 URL**: https://threadhook-api-production.up.railway.app
- **Health 체크**: https://threadhook-api-production.up.railway.app/health

## 로컬 개발 (선택사항)

로컬에서 백엔드를 직접 실행하려면:

```bash
cd backend-fastapi
python -m venv .venv
.venv/Scripts/activate   # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

확장앱 설정에서 Backend URL을 `http://127.0.0.1:8000`으로 변경하면 로컬 서버를 사용합니다.

## 지원 Provider 및 API Key 발급

| Provider | API Key 발급처 | Key 형식 |
|----------|---------------|---------|
| Claude | https://console.anthropic.com | `sk-ant-...` |
| ChatGPT | https://platform.openai.com/api-keys | `sk-...` |
| Gemini | https://aistudio.google.com/apikey | 영숫자 문자열 |
| Grok | https://console.x.ai | `xai-...` |

## 참고
- API Key는 서버 메모리에 임시 저장됩니다 (서버 재시작 시 초기화).
- Chrome 내부 페이지(`chrome://`)에서는 콘텐츠 추출이 제한됩니다.
- API 사용량과 비용은 각 Provider 콘솔에서 확인하세요.
