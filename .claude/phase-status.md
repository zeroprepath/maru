# 현재 상태 (수동 갱신)

- Phase: **1 완료 (2026-10-08)** → 다음 Phase 2 (계정 + 매칭, D12~)
- 완료: M0-01 ~ M0-10 전부, M1-01 ~ **M1-07 전부** (M1-07: PR #13, 2026-10-08 — 통합 검증 + ADR-008·017·018·022)
- 다음: **M2-01 · 계정 + 연령 게이트** — `maru-journal/guide/Backlog.md`에서 확인 — 가이드 `guide/Phase2/M2-01.md`, 따라하기 `tutorial/M2-01.md`

> **2026-09-10 Phase 1 재편.** 12태스크 → **7태스크**. 자기 DoD를 자기 힘으로 검증할 수 없는 태스크들을 묶었다.
> 구→신 매핑표와 사유는 `maru-journal/guide/Backlog.md`의 「Phase 1 재편 기록」에, 태스크를 어디서 자르는지에 대한 규칙은 같은 문서 「1-1」에 있다.
> **이전 번호(M1-08~M1-12)는 더 이상 존재하지 않는다.** 기록물(`docs/specs/*`, `docs/ai-rejections.md`)에 남은 옛 ID는 당시 번호이므로 매핑표로 조회한다.

## Phase 0 DoD — 4항목 전부 충족

| 항목 | 결과 |
|---|---|
| ADR 4건 | ✅ `maru-journal/docs/adr/` ADR-001~004 (004는 M1-03에서 **채택됨**으로 확정) |
| 실기기 WebView `getUserMedia` | ✅ iPhone 12 Pro 3관문 통과 (`docs/specs/m0-08-result.md`) |
| CI가 lint+test를 5분 내 통과 | ✅ **실측 36초** |
| 인프라 견적 | ✅ `docs/specs/m0-10-infra-estimate.md` · 월 고정비 설계값 **$33.18** |

**태스크 ID의 정본은 `maru-journal/guide/Backlog.md`다.** 진행 상태도 거기 표를 함께 갱신한다.

## M1-02 착수 전 구멍 2개 — 해결됨 (M1-02에서 처리)

- `apps/server`에 `typecheck` 스크립트 추가됨.
- `apps/web`에 vitest `test` 스크립트 추가됨.

## Phase 1 결과 요약

| 항목 | 결과 |
|---|---|
| 교차 네트워크 relay 연결 | ✅ Mac Wi-Fi + iPhone 셀룰러 5/5 성공 |
| 통화 1분 서버 송신량 | ✅ 14.89MB (견적 15MB 대비 -0.75%, n=1) |
| ADR | ✅ 008·017·018·022 `채택됨` (017은 구성만 확정, 크레딧 종료 후 공급자는 보류) |
| Vercel Production 통화 | ✅ 환경변수(`NEXT_PUBLIC_WS_URL`·`API_URL`·`FORCE_RELAY`)를 Production에도 설정하고 재배포 후 통화 확인 (2026-10-08) — Preview와 Production의 환경변수는 따로다 |
| 알려진 한계 | 신고·제재 미구현(Phase 4), EC2 `t3.micro` 1GB(Phase 2 DB·Redis 전 메모리 증설 + Elastic IP 먼저), iPhone 발열은 코덱 원인으로 단정하지 않음(가설) |

## Phase 2에서 처리할 미결 사항

- **크레딧 소진 한 달 전**: AWS 계속 사용 여부를 별도 ADR로 결정 (ADR-017 보류 항목). EC2 실제 청구서로 월 고정 운영비 KPI 재측정.
- **PostgreSQL·Redis를 EC2에 올리기 직전**: 메모리 증설. 인스턴스 유형을 바꾸면 IP가 바뀌므로 Elastic IP를 먼저 붙인다.
- 서버에서 직접 이미지를 빌드하면 `t3.micro`에서 메모리·디스크 부족이 났다(2026-10-07) — 빌드를 CI로 옮기는 것을 검토.
- 보안 점검(`/security-check`)은 보안 기능(계정·신고·모더레이션)이 갖춰진 베타 테스터 전에 몰아서 한다.
- 산정 보정치: **새 도구를 처음 연결하는 태스크는 +50%** (Phase 0에서 M0-05가 도구 간 버전 충돌로 초과한 경험)

> 이 파일은 자동 갱신되지 않는다. Phase나 진행 중인 태스크가 바뀌면 직접 고친다.
