# 테트리스 게임 — Build 단계 지침

## 목표

`/apps/tetris/spec.md`에 승인된 설계를 그대로 구현한다. 반드시 먼저 `spec.md`를 읽고, 그 내용에서 벗어나지 않게 구현한다.

## 범위 (중요)

- 아래 세 파일만 새로 만든다. 그 외 어떤 파일도 생성·수정하지 않는다.
  - `D:\claudecode_exam\my-blog\apps\tetris\index.html`
  - `D:\claudecode_exam\my-blog\apps\tetris\style.css`
  - `D:\claudecode_exam\my-blog\apps\tetris\game.js`
- 블로그 루트, `CLAUDE.md`, 이미 완성된 `/apps/2048/`, `/apps/pixel-editor/`는 절대 건드리지 않는다. (`/apps/2048/index.html`을 back-link 패턴 참고용으로 읽는 것은 허용하되 수정은 금지.)
- `plan-instructions.md`, `spec.md`는 참고용으로만 읽고 수정하지 않는다.

## 프로젝트 제약 (CLAUDE.md 기준)

- HTML, CSS, JavaScript만 사용. 프레임워크·번들러 금지, 외부 라이브러리 없이 vanilla JS + Canvas로 구현.
- `/apps/tetris/` 폴더 안에서 완전히 자체 완결.
- 모바일에서도 사용 가능해야 한다 (spec.md 5.2의 터치 버튼).
- 불필요한 추상화나 설정을 추가하지 않는다. 주석은 WHY가 명확하지 않은 경우에만 최소한으로.

## 구현 시 spec.md에서 특히 지켜야 할 것

- 10x20 보드 2차원 배열 + 별도 `currentPiece` 상태, Canvas 렌더링.
- 7종 테트로미노를 4방향 좌표 테이블로 미리 정의 (`SHAPES` 객체).
- 회전: 단순 킥(x -1/+1/-2/+2 순서 시도, 모두 실패 시 회전 취소). SRS 풀 구현 금지.
- 낙하: `requestAnimationFrame` + 경과시간 누적 방식, 레벨(= 줄수/10)마다 낙하 간격 단축(하한 존재).
- 좌우 이동/소프트드롭/하드드롭/충돌판정(`isValidPosition` 공통 함수).
- 줄 제거: 가득 찬 행 splice + 상단 unshift, 점수 100/300/500/800 × 레벨, 최고점수 `localStorage`(`tetris-best-score`).
- 다음 블록 미리보기(7-bag 랜덤 셔플), 미리보기용 보조 캔버스.
- 게임오버: 스폰 위치 충돌 시 처리, 최종 점수 오버레이.
- 키보드: ←/→ 이동, ↓ 소프트드롭, ↑ 회전, Space 하드드롭, P 일시정지. `preventDefault()`로 스크롤 방지. 커스텀 반복 타이머 없이 브라우저 키 반복 활용.
- 모바일 터치 버튼: 좌/우/회전/소프트드롭만 (하드드롭 버튼은 생략 가능). `touch-action: manipulation`.
- 일시정지 오버레이("PAUSED")와 게임오버 오버레이(최종 점수 + 다시 시작 버튼), 사이드 패널(SCORE/LEVEL/LINES/NEXT)에 `aria-live="polite"`.
- 헤더 최상단에 `<a class="back-link" href="../../index.html">← 블로그로 돌아가기</a>` (`/apps/2048/index.html` 패턴 참고).
- 반응형: 860px 이하에서 세로 스택, 보드 캔버스는 `min(90vw, 300px)` + `aspect-ratio: 1/2`, 터치 버튼 최소 44px, 가로 스크롤 없음.
- 접근성: 버튼은 실제 `<button>`, 보드 캔버스에 `role="img"` + `aria-label`.

## 완료 조건

- 세 파일이 모두 작성되어 `apps/tetris/index.html`을 브라우저로 열면(로컬 서버로 서빙 시) 블록 낙하, 이동/회전/드롭, 줄 제거, 점수, 다음 블록 미리보기, 일시정지, 게임오버가 코드 상으로 완결되어 있어야 한다.
- 완료 후 만든 파일 목록과 구현 시 spec.md에서 벗어나거나 판단이 필요했던 부분(있다면)을 간단히 보고한다.
