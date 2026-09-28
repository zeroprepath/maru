---
name: adr-format
description: ADR 템플릿과 Plan.md 11장 ADR 목록. 기술 결정을 기록하거나 PR의 AI 사용 기록을 작성할 때 사용.
---

# adr-format

원본: `/Users/junic/Documents/workspace/projects/maru-journal/source/Plan.md` **L296–347** (10-2 PR 템플릿 · 11장 ADR 목록).

**Plan 11장이 ADR 번호의 정본이다.** Concept.md·Design.md는 이 번호를 인용만 한다. 새 결정이 생기면 Plan 11장에 먼저 추가하고 번호를 받아온다 — 다른 문서에서 임의로 번호를 만들지 않는다.

## ADR 목록 (Plan 11장, ID·주제·Phase)

| ID | 주제 | Phase |
|---|---|---|
| ADR-001 | 아키텍처: P2P 미디어 + 서버 시그널링 분리 | 0 |
| ADR-002 | 모노레포 구성과 패키지 경계 | 0 |
| ADR-003 | RN WebView 셸 vs 네이티브 WebRTC | 0 |
| ADR-004 | 폴더 구조(FSD) 채택 범위 | 0 |
| ADR-005 | 번역 파이프라인·벤더 선택 | 3 |
| ADR-006 | 번역 세션 배치: 화자측 vs 청자측 | 3 |
| ADR-007 | ephemeral token 설계와 남용 방지 | 3 |
| ADR-008 | SSR/CSR 경계 기준 | 1 |
| ADR-009 | 자막 partial/final 렌더링 정책 | 3 |
| ADR-010 | 신원 모델: 경로별 계정 요구 분리 | 2 |
| ADR-011 | 매칭 저장소와 원자적 페어링 | 2 |
| ADR-012 | 모더레이션: 클라이언트측 판정 선택과 한계 | 4 |
| ADR-013 | TURN 강제 릴레이와 IP 노출 방지 | 4 |
| ADR-014 | 통역 음성과 원음의 볼륨 정책 | 3 |
| ADR-015 | 재연결 전략과 백오프 파라미터 | 4 |
| ADR-016 | 테스트 전략: 단위와 E2E의 경계 | 4 |
| ADR-017 | 인프라: 단일 인스턴스 + 전송량 포함 요금제 선택 근거 | 1 |
| ADR-018 | 링크 초대 경로의 신고·제재 구조와 잔여 위험 | 1 |
| ADR-019 | 매칭 정책: 완전 무작위 채택과 필터를 두지 않은 이유 | 2 |
| ADR-020 | 서버 상태 관리(TanStack Query)와 캐시 키 규칙 | 2 |
| ADR-021 | 클라이언트 상태 도구 선택과 서버 상태와의 경계 | 1 |
| ADR-022 | 비디오 코덱 협상 전략(하드웨어 가속 기준)과 발열·배터리 트레이드오프 | 1 |

`/adr <주제>` 명령이 위 표에서 다음 번호를 찾아 `/Users/junic/Documents/workspace/projects/maru-journal/docs/adr/ADR-XXX-제목.md`를 생성한다. 표에 없는 새 주제라면 **다음 순번(023~)**을 쓰고 Plan 11장에도 함께 추가한다.

## ADR 파일 템플릿

```markdown
# ADR-XXX: <제목>

- 상태: 제안됨 | 채택됨 | 대체됨
- 시점: Phase N (YYYY-MM-DD)

## 배경
왜 이 결정이 필요했는가.

## 고려한 선택지
1. ...
2. ...

## 결정
무엇을 선택했는가.

## 이유
왜 이 선택인가 — 트레이드오프 포함.

## 결과
이 결정으로 감수하는 것, 나중에 재검토할 조건.
```

## PR 템플릿 (Plan 10-2, `/ai-log`가 채움)

```markdown
## AI 사용 기록
- 도구:
- 위임한 범위:
- 직접 작성한 범위:
- 거부한 제안과 이유:
```
