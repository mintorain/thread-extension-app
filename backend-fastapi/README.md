# FastAPI Backend (Railway Ready)

## Local Run
```bash
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Railway Deploy (Recommended)
1. GitHub 저장소를 Railway에 연결
2. `New Project` -> `Deploy from GitHub repo`
3. 서비스 Root Directory를 `backend-fastapi`로 지정
4. Build 방식은 `Dockerfile` 자동 감지 사용
5. 배포 후 `https://<railway-domain>/health` 확인

### Required Settings
- Start command: Dockerfile CMD 사용 (별도 입력 불필요)
- Healthcheck path: `/health`
- Environment Variables: (현재 필수 없음)

### Notes
- 현재 API/OAuth 키 저장은 인메모리 방식이라 재배포/재시작 시 초기화됩니다.
- 운영용으로는 DB/Redis 저장소로 교체를 권장합니다.
