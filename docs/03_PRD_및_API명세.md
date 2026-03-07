# PRD (요구사항 ID 포함) + 백엔드 API 명세

문서 버전: `v1.0`  
작성일: `2026-03-06`  
제품명: `ThreadHook` (가칭)

## 1. 제품 목표
- 사용자가 뉴스/블로그 페이지를 읽는 중, 스레드 공유용 정보글을 빠르게 생성한다.
- 설정에서 `Claude / ChatGPT / Gemini / Grok` 중 선택한 제공자 API 키로 생성 기능을 동작시킨다.
- 실패 시 정책 기반으로 대체 제공자 전환을 지원한다.

## 2. 범위
- 포함: 페이지 추출, 요약/스레드 생성, 편집, 복사/공유, API 키 관리, 제공자 라우팅.
- 제외: 완전 자동 게시, 팀 협업 권한 체계, 대규모 실시간 트렌드 수집 대시보드.

## 3. 사용자 스토리
- `US-01` 사용자는 현재 페이지에서 클릭 1~2번으로 스레드 초안을 생성하고 싶다.
- `US-02` 사용자는 원하는 AI 제공자만 선택해 API 키를 등록하고 싶다.
- `US-03` 사용자는 생성 실패 시 자동으로 다른 제공자로 전환되길 원한다.
- `US-04` 사용자는 생성 결과를 게시 전 직접 수정하고 싶다.

## 4. 기능 요구사항 (FR)
- `FR-001` 확장앱은 현재 탭 URL/제목/본문/발행일/대표이미지를 추출해야 한다.
- `FR-002` 확장앱은 노이즈(네비게이션/광고/댓글)를 제거한 본문 텍스트를 생성해야 한다.
- `FR-003` 시스템은 스레드 형식(`훅-핵심포인트-인사이트-출처`)으로 초안을 생성해야 한다.
- `FR-004` 시스템은 길이 옵션(`short/medium/long`)과 톤 옵션(`neutral/professional/casual`)을 지원해야 한다.
- `FR-005` 시스템은 출처 URL을 자동 삽입해야 한다.
- `FR-006` 시스템은 제공자 선택 모드(`single/priority`)를 지원해야 한다.
- `FR-007` 시스템은 제공자별 API 키 등록/수정/삭제를 지원해야 한다.
- `FR-008` 시스템은 API 키 저장 전 연결 테스트를 지원해야 한다.
- `FR-009` 시스템은 생성 실패 시 설정에 따라 fallback을 수행해야 한다.
- `FR-010` 시스템은 제공자별 모델 선택을 지원해야 한다.
- `FR-011` 시스템은 사용량(요청 수, 토큰 추정, 지연시간)을 조회 가능해야 한다.
- `FR-012` 시스템은 사용자가 생성 결과를 편집 후 복사/공유할 수 있어야 한다.

## 5. 비기능 요구사항 (NFR)
- `NFR-001` 평균 생성 응답시간 5초 이내(정상 트래픽 기준).
- `NFR-002` API 가용성 99.5% 이상(월 기준).
- `NFR-003` API 키 평문 저장 금지, 저장 시 암호화 필수.
- `NFR-004` 로그에 API 키/민감정보 마스킹 필수.
- `NFR-005` 실패 재시도 및 백오프 전략 적용.
- `NFR-006` 응답 포맷 일관성(JSON schema 준수율 99% 이상).

## 6. 시스템 아키텍처
- 확장앱(Chrome MV3): UI, content script, background worker.
- 백엔드 API: 인증, 키 관리, 생성 요청, 라우팅, 사용량 집계.
- LLM Adapter Layer: `Anthropic/OpenAI/Gemini/Grok` 공통 인터페이스.
- Routing Engine: `single` 또는 `priority` 모드로 제공자 선택/전환.
- Secret Storage: KMS 또는 비밀관리 시스템 사용.

## 7. 데이터 모델(요약)
- `user_ai_settings(user_id, mode, primary_provider, provider_priority, fallback_enabled, updated_at)`
- `user_api_keys(user_id, provider, encrypted_key, key_status, last_validated_at, created_at)`
- `generation_logs(id, user_id, provider_used, model, latency_ms, token_in, token_out, status, created_at)`

## 8. 백엔드 API 명세

### 8.1 인증
- 방식: `Bearer JWT`
- 헤더: `Authorization: Bearer <token>`

### 8.2 엔드포인트

1. `GET /v1/providers`
- 목적: 지원 제공자/모델 목록 조회
- 응답 예시:
```json
{
  "providers": [
    {"name":"claude","models":["sonnet","haiku"]},
    {"name":"chatgpt","models":["gpt-4.1","gpt-4o-mini"]},
    {"name":"gemini","models":["gemini-2.0-flash"]},
    {"name":"grok","models":["grok-3"]}
  ]
}
```

2. `POST /v1/keys/{provider}/validate`
- 목적: 키 유효성 테스트
- 요청 예시:
```json
{"apiKey":"sk-***"}
```
- 응답 예시:
```json
{"valid":true,"provider":"chatgpt","validatedAt":"2026-03-06T10:20:00Z"}
```

3. `PUT /v1/keys/{provider}`
- 목적: 제공자 API 키 저장/갱신
- 요청 예시:
```json
{"apiKey":"sk-***"}
```
- 응답 예시:
```json
{"saved":true,"provider":"chatgpt","keyStatus":"active"}
```

4. `DELETE /v1/keys/{provider}`
- 목적: 제공자 API 키 삭제
- 응답 예시:
```json
{"deleted":true,"provider":"chatgpt"}
```

5. `GET /v1/settings/ai`
- 목적: AI 설정 조회
- 응답 예시:
```json
{
  "mode":"priority",
  "primaryProvider":"claude",
  "providerPriority":["claude","chatgpt","gemini","grok"],
  "fallbackEnabled":true,
  "defaultModelByProvider":{
    "claude":"sonnet",
    "chatgpt":"gpt-4.1",
    "gemini":"gemini-2.0-flash",
    "grok":"grok-3"
  }
}
```

6. `PUT /v1/settings/ai`
- 목적: AI 설정 저장
- 요청 예시:
```json
{
  "mode":"priority",
  "primaryProvider":"claude",
  "providerPriority":["claude","chatgpt","gemini","grok"],
  "fallbackEnabled":true,
  "defaultModelByProvider":{
    "claude":"sonnet"
  }
}
```
- 응답 예시:
```json
{"updated":true}
```

7. `POST /v1/content/extract`
- 목적: URL 기준 본문 추출
- 요청 예시:
```json
{"url":"https://example.com/news/123"}
```
- 응답 예시:
```json
{
  "title":"기사 제목",
  "url":"https://example.com/news/123",
  "publishedAt":"2026-03-05T02:10:00Z",
  "content":"정제된 본문 텍스트...",
  "source":"example.com"
}
```

8. `POST /v1/generate/thread`
- 목적: 스레드 초안 생성
- 요청 예시:
```json
{
  "input":{
    "title":"기사 제목",
    "url":"https://example.com/news/123",
    "content":"정제된 본문 텍스트..."
  },
  "options":{
    "tone":"professional",
    "length":"medium",
    "language":"ko",
    "providerMode":"priority",
    "provider":"claude",
    "model":"sonnet"
  }
}
```
- 응답 예시:
```json
{
  "providerUsed":"claude",
  "model":"sonnet",
  "thread":{
    "hook":"지금 이 이슈를 봐야 하는 이유",
    "points":[
      "핵심 포인트 1",
      "핵심 포인트 2",
      "핵심 포인트 3"
    ],
    "insight":"시사점 한 줄",
    "hashtags":["#산업동향","#AI","#콘텐츠전략"],
    "source":"https://example.com/news/123"
  },
  "metrics":{
    "latencyMs":3120,
    "tokenIn":1432,
    "tokenOut":322
  }
}
```

9. `GET /v1/usage/summary?from=2026-03-01&to=2026-03-31`
- 목적: 사용량 요약 조회
- 응답 예시:
```json
{
  "totalRequests":128,
  "byProvider":[
    {"provider":"claude","requests":70},
    {"provider":"chatgpt","requests":30},
    {"provider":"gemini","requests":20},
    {"provider":"grok","requests":8}
  ],
  "estimatedCostUsd":12.84
}
```

## 9. 공통 에러 코드
- `400` `INVALID_REQUEST` 필수 파라미터 누락/형식 오류
- `401` `UNAUTHORIZED` 인증 실패
- `403` `FORBIDDEN` 권한 없음
- `404` `NOT_FOUND` 리소스 없음
- `409` `CONFLICT` 중복/상태 충돌
- `422` `VALIDATION_FAILED` 키 검증 실패
- `429` `RATE_LIMITED` 호출 제한 초과
- `500` `INTERNAL_ERROR` 서버 오류
- `503` `PROVIDER_UNAVAILABLE` 외부 제공자 장애

에러 응답 포맷:
```json
{
  "error":{
    "code":"VALIDATION_FAILED",
    "message":"API key is invalid for provider chatgpt",
    "requestId":"req_abc123"
  }
}
```

## 10. 수용 기준 (Acceptance Criteria)
- `AC-001` 유효한 API 키 등록 후 1회 이상 정상 생성 성공.
- `AC-002` 잘못된 키 입력 시 저장 차단 또는 비활성 상태 표시.
- `AC-003` `priority + fallbackEnabled=true`에서 1차 제공자 실패 시 2차 제공자로 자동 전환.
- `AC-004` 생성 결과에 원문 출처 URL 포함.
- `AC-005` 생성 결과 JSON schema 불일치율 1% 미만.
- `AC-006` 키 조회 API에서 평문 키 반환 금지.

## 11. 구현 우선순위
1. 키 관리 API + 암호화 저장 + 검증
2. 단일 제공자 생성 경로(Claude/ChatGPT 우선)
3. 우선순위 라우팅 + fallback
4. Gemini/Grok 어댑터 추가
5. 사용량/비용 요약 및 운영 지표
