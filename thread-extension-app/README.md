# ThreadHook Extension MVP

## 포함 기능
- 현재 탭의 제목/URL/본문 요약 텍스트 추출
- Backend URL 설정
- Provider 선택 + API Key 저장
- 스레드 초안 생성 호출(`/v1/generate/thread`)

## 설치 방법 (Chrome)
1. `chrome://extensions` 이동
2. 개발자 모드 켜기
3. `압축해제된 확장 프로그램을 로드` 클릭
4. 이 폴더(`thread-extension-app`) 선택

## 사전 실행
- FastAPI: `http://127.0.0.1:8000`
- NestJS: `http://127.0.0.1:3000`

## 사용 순서
1. 확장 아이콘 클릭
2. Backend URL 입력
3. Provider 선택 + API Key 입력 후 `키 저장`
4. `페이지 추출`
5. `스레드 생성`

## 참고
- 일부 사이트(Chrome Web Store, 내부 브라우저 페이지)는 콘텐츠 스크립트 접근이 제한될 수 있습니다.
- 현재는 MVP라 키 저장/보안/권한 처리가 데모 수준입니다.


