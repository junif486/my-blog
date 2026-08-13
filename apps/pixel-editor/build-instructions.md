# 픽셀 아트 에디터 — Build 단계 지침

## 목표

`/apps/pixel-editor/spec.md`에 승인된 설계를 그대로 구현한다. 반드시 먼저 `spec.md`를 읽고, 그 내용에서 벗어나지 않게 구현한다.

## 범위 (중요)

- 아래 세 파일만 새로 만든다. 그 외 어떤 파일도 생성·수정하지 않는다.
  - `D:\claudecode_exam\my-blog\apps\pixel-editor\index.html`
  - `D:\claudecode_exam\my-blog\apps\pixel-editor\style.css`
  - `D:\claudecode_exam\my-blog\apps\pixel-editor\editor.js`
- 블로그 루트의 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, 이미 완성된 `/apps/2048/` 등은 절대 건드리지 않는다.
- `plan-instructions.md`, `spec.md`는 참고용으로만 읽고 수정하지 않는다.

## 프로젝트 제약 (CLAUDE.md 기준)

- HTML, CSS, JavaScript만 사용. 프레임워크 금지, 번들러/빌드 도구 없이 브라우저에서 바로 동작해야 한다.
- 외부 라이브러리는 사용하지 않는다 (Canvas API만으로 구현).
- `/apps/pixel-editor/` 폴더 안에서 완전히 자체 완결되어야 한다 — 블로그 루트의 CSS/JS를 참조하지 않는다.
- 모바일에서도 사용 가능해야 한다.
- 불필요한 추상화나 설정을 추가하지 않는다. 주석은 WHY가 명확하지 않은 경우에만 최소한으로.

## 구현 시 spec.md에서 특히 지켜야 할 것

- `<canvas>` 기반 16x16 논리 격자 (1차원 배열, `null` = 빈 칸).
- Pointer Events(`pointerdown/move/up/cancel`)로 마우스+터치 통합 처리, 캔버스에 `touch-action: none`.
- 빈 칸은 체커보드 패턴으로 화면에 표시하되 PNG 내보내기에는 포함하지 않음(투명 처리).
- 반응형 셀 크기: 캔버스 CSS 크기는 `min(90vw, 480px)` + `aspect-ratio: 1/1`, cellSize는 매 렌더링 시 동적 계산, resize 시 재계산.
- 16색 고정 팔레트(스펙 4.1의 색상표 그대로) + `<input type="color">` 커스텀 색상 1개 + 지우개 버튼. 선택 상태는 `aria-pressed` + 글로우 테두리로 표시.
- 전체 지우기 버튼: `confirm()`으로 한 번 확인 후 초기화.
- PNG 저장: 오프스크린 256x256 캔버스에 16배 확대로 재그리기(스무딩 없이 `fillRect`), 빈 칸은 그리지 않아 투명 유지, `toBlob()` + `URL.createObjectURL()` + 임시 `<a download="pixel-art.png">` 클릭 트리거, 이후 `URL.revokeObjectURL()`로 해제.
- 헤더 좌측 상단에 `<a class="back-link" href="../../index.html">← 블로그로 돌아가기</a>` — `/apps/2048/index.html`을 참고해 동일한 패턴으로 작성해도 된다(단, 파일을 열어 참고만 하고 2048 파일 자체는 수정하지 않는다).
- 데스크톱은 캔버스+컨트롤 패널 좌우 배치, 약 640px 이하에서 세로 스택.
- 접근성: 모든 버튼은 실제 `<button>`, 팔레트 스와치에 `aria-label`/`aria-pressed`, 캔버스에 `role="img"` + `aria-label`, color input에 `aria-label`.

## 완료 조건

- 세 파일이 모두 작성되어 `apps/pixel-editor/index.html`을 브라우저로 열면(로컬 서버로 서빙 시) 클릭/드래그/터치로 칠하기, 팔레트 색 변경, 지우개, 전체 지우기, PNG 저장이 코드 상으로 완결되어 있어야 한다.
- 완료 후 만든 파일 목록과 구현 시 spec.md에서 벗어나거나 판단이 필요했던 부분(있다면)을 간단히 보고한다.
