# Thread Extension App

브라우저에서 보고 있는 뉴스/블로그 페이지를 기반으로 스레드형 정보글 초안을 생성하는 MVP 프로젝트입니다.

## 구성
- `thread-extension-app`: Chrome 확장앱(MVP)
- `backend-fastapi`: FastAPI 서버 템플릿
- `backend-nestjs`: NestJS 서버 템플릿
- `docs`: 기획/명세 문서 및 설치 온보딩 페이지

## 주요 기능(MVP)
- 현재 페이지 제목/URL/본문 추출
- Provider 선택 및 API Key 저장
- 스레드 초안 생성 요청
- 생성 결과 클립보드 자동 복사

## 빠른 시작

### 1) 저장소 준비
```bash
git clone https://github.com/mintorain/thread-extension-app.git
cd thread-extension-app
```

### 2) 백엔드 실행 (둘 중 하나)

#### FastAPI
```bash
cd backend-fastapi
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### NestJS
```bash
cd backend-nestjs
npm install
npm run start:dev
```

### 3) Chrome 확장앱 설치
1. Chrome에서 `chrome://extensions` 접속
2. 우측 상단 `개발자 모드` ON
3. `압축해제된 확장 프로그램을 로드` 클릭
4. 사용자가 내려받은 저장소 위치의 `thread-extension-app` 폴더 선택

### 4) 확장앱 사용
1. 확장 아이콘 클릭
2. `Backend URL` 입력
  - FastAPI: `http://127.0.0.1:8000`
  - NestJS: `http://127.0.0.1:3000`
3. Provider 선택 + API Key 입력 후 `키 저장`
4. `페이지 추출` -> `스레드 생성`
5. 생성 성공 시 결과가 자동으로 클립보드에 복사됨

## 설치 안내 페이지
- 로컬 파일: `docs/install-landing.html`
- 브라우저에서 열면 스크린샷 포함 온보딩 가이드를 볼 수 있습니다.

## 문서
- `docs/03_PRD_및_API명세.md`: PRD + API 명세
- `docs/04_DB스키마_SQL_및_OpenAPI초안.md`: DB 스키마 + OpenAPI 초안
- `docs/05_FastAPI_NestJS_서버구조_핸들러템플릿.md`: 서버 구조/핸들러 템플릿

## 참고
- 현재 서버 키 저장은 데모용 템플릿 구조이며, 운영 환경에서는 DB + KMS 기반 암호화 저장으로 교체해야 합니다.
- 일부 브라우저 내부 페이지에서는 콘텐츠 추출이 제한될 수 있습니다.

## Railway 배포
ackend-fastapi는 Railway에 바로 배포할 수 있도록 Dockerfile이 포함되어 있습니다.

1. Railway에서 GitHub 저장소 연결
2. 서비스 Root Directory를 ackend-fastapi로 설정
3. 배포 완료 후 /health 확인

예시:
- https://<railway-domain>/health -> {\"ok\":true}

확장앱 Backend URL에는 Railway 도메인을 입력하면 됩니다.
