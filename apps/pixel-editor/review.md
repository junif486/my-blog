# 픽셀 아트 에디터 — Review 결과

검증 환경: `npx live-server`(포트 8181)로 `D:\claudecode_exam\my-blog`를 서빙, Claude Browser 도구로 `/apps/pixel-editor/index.html`을 열어 실제 클릭/드래그, DOM 상태 조회, Canvas 픽셀 데이터 조회, 콘솔 로그 확인을 통해 검증했다. 클릭/드래그가 화면 좌표계 문제로 애매한 경우에는 `PointerEvent`를 직접 dispatch하여 앱의 이벤트 핸들러 로직 자체를 검증했다.

## 검증 항목과 결과

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | spec.md 숙지 | 통과 | 16x16 canvas, 16색 팔레트, 커스텀 색상, 지우개, 전체 지우기, PNG(256x256, 투명) 저장, 반응형, 접근성 요구사항 확인 |
| 2 | 로컬 서버로 페이지 로드 | 통과 | live-server(8181)에서 정상 로드, 레이아웃이 spec 6절 구조(헤더 + 캔버스/컨트롤 패널 좌우 배치)와 일치 |
| 3 | 콘솔 에러 없음 | **초기 실패 → 수정 후 통과** | `setPointerCapture` 호출 시 `NotFoundError`가 uncaught로 발생하는 경우 발견. try/catch로 방어 처리 후 재검증 완료(§"발견하여 수정한 문제" 참고) |
| 4 | 캔버스 클릭/드래그로 칠하기 | 통과 | 클릭 시 즉시 1칸 채색, 연속 pointermove로 여러 칸이 이어서 채색됨을 확인(동일 칸 중복 렌더 방지 로직도 정상 동작) |
| 5 | 팔레트 색상 선택 → 이후 그리기 색 변경, 선택 표시 | 통과 | 스와치 클릭 시 `aria-pressed="true"` + 네온 글로우 테두리로 표시되고, 이후 칠하는 색이 즉시 반영됨을 DOM 상태와 캔버스 픽셀로 확인 |
| 6 | 커스텀 색상(`<input type="color">`) | 통과 | `input` 이벤트로 값 변경 시 현재 색상 미리보기와 실제 채색 색상이 즉시 반영됨(임의 색 `#12ab34`로 검증) |
| 7 | 지우개 | 통과 | 지우개 선택 후 칠한 칸이 `null`로 설정되어 체커보드로 되돌아감을 확인. 지우개 버튼도 동일한 `aria-pressed`/글로우 표시 공유 |
| 8 | 전체 지우기(confirm) | 통과 | 이 브라우저 자동화 환경은 네이티브 `confirm()`을 항상 억제하고 `false`를 반환하는 정책이라(콘솔에 "Page dialog suppressed" 로그로 명시됨) 취소 시 그리드가 유지되는 안전한 동작을 확인. `window.confirm`을 임시로 `true`로 오버라이드해 승인 경로도 테스트하여 그리드가 정상적으로 전체 초기화됨을 확인 |
| 9 | PNG 저장 | 통과 | `save-btn` 클릭 시 `off.toBlob(...)`으로 `image/png` Blob 생성 → `pixel-art.png` 다운로드 트리거를 확인. Blob을 다시 `Image`로 디코드해 실제 픽셀을 검사: **256x256**, 칠하지 않은 모서리 픽셀은 `RGBA(0,0,0,0)`(완전 투명), 칠한 중앙 픽셀은 선택한 색상과 정확히 일치(`#ff2fd0` → `RGBA(255,47,208,255)`) |
| 10 | 모바일 폭(375px) 반응형 | 통과 | 640px 미디어쿼리에 따라 캔버스가 위, 컨트롤 패널이 아래로 세로 스택됨. `document.documentElement.scrollWidth === clientWidth`로 가로 스크롤 없음을 확인. `touch-action: none` 적용 확인. `pointerType: 'touch'`로 합성한 pointerdown/move 이벤트로 실제 터치 드래그 경로도 정상 동작함을 확인 |
| 11 | 블로그로 돌아가기 링크 | 통과 | `href="../../index.html"`이 실제로 블로그 루트로 이동함을 확인(클릭 후 페이지 타이틀이 "my-blog"로 전환) |
| 12 | 문제 수정 후 재검증 | 통과 | 아래 "발견하여 수정한 문제" 참고 |

## 발견하여 수정한 문제

### 1. `setPointerCapture` 호출 시 uncaught `NotFoundError` (수정함)

`onPointerDown`에서 `canvas.setPointerCapture(evt.pointerId)`를 방어 없이 호출하고 있었다. 브라우저가 해당 `pointerId`를 "활성 포인터"로 인식하지 못하는 경로(예: 이 검증에 사용한 자동화 브라우저의 합성 포인터 이벤트, 혹은 일부 환경의 예외적인 포인터 트래킹 케이스)에서 `NotFoundError`가 uncaught 예외로 콘솔에 출력되었다. try/catch로 감싸 예외를 무해하게 흡수하도록 수정했다(포인터 캡처가 실패해도 `pointermove` 기반 그리기 자체는 계속 동작하므로 기능 손실 없음).

```js
// editor.js — onPointerDown
if (canvas.setPointerCapture) {
  try {
    canvas.setPointerCapture(evt.pointerId);
  } catch (err) {
    // Some browsers/input types may not have an "active" pointer to
    // capture at this point; drawing still works via pointermove.
  }
}
```

### 2. 포인터 캡처 실패 시 `isDrawing`이 고착될 수 있는 잠재 버그 (수정함)

캔버스 밖에서 포인터를 놓았을 때 `isDrawing = false`로 되돌리는 로직이 `canvas` 요소의 `pointerup`/`pointercancel` 리스너에만 의존하고 있었다. 정상적으로 `setPointerCapture`가 성공하면 캔버스 밖에서 놓아도 `pointerup`이 캔버스로 캡처되어 문제가 없지만, (1) 캡처를 지원하지 않는 환경, (2) 위 1번처럼 캡처가 실패하는 예외적 경로에서는 `pointerup`이 캔버스가 아닌 다른 요소에서 발생해 리스너가 전혀 호출되지 않고 `isDrawing`이 `true`로 고착될 수 있었다. 이 경우 이후 버튼을 누르지 않은 상태로 캔버스 위에서 마우스를 움직이기만 해도 의도치 않게 칠해지는 문제로 이어질 수 있다.

spec.md 3.3절이 "포인터가 캔버스 밖으로 나가거나 취소된 경우 포함"을 명시적으로 요구하고 있어, `window` 레벨에 동일한 `pointerup`/`pointercancel` 폴백 리스너를 추가해 캡처 성공 여부와 무관하게 항상 `isDrawing`이 해제되도록 보강했다.

```js
// editor.js
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
```

수정 후, 포인터를 캔버스 밖(예: `document.body`)에서 놓는 시나리오를 합성 이벤트로 재현해 `isDrawing`이 정상적으로 해제되고 이후 무의도 채색이 발생하지 않음을 확인했다.

## 수정하지 않고 남겨둔 사소한 이슈 (우선순위 낮음)

- **`willReadFrequently` 경고**: 리뷰 검증 과정에서 PNG 결과물을 픽셀 단위로 검사하기 위해 리뷰어가 임시로 만든 별도 canvas에서 발생한 경고이며, 앱 자체 코드(`editor.js`)와는 무관하다. 앱의 실제 오프스크린 export canvas는 `getImageData`를 호출하지 않으므로 해당되지 않는다.
- **`devicePixelRatio` 반올림에 따른 셀 경계 미세 오차**: `cellSize = canvas.width / GRID_SIZE`에서 `canvas.width`가 `Math.round(displaySize * dpr)`로 반올림되므로, `dpr`이 정수가 아닌 화면(예: 1.25, 1.5)에서는 셀 경계에 1px 미만의 누적 오차가 생길 수 있다. 시각적으로 거의 감지되지 않고 PNG 내보내기(오프스크린 canvas는 별도의 고정 `EXPORT_SCALE=16` 기준으로 그려 이 오차의 영향을 받지 않음)에는 전혀 영향이 없어 수정하지 않았다.
- **`confirm()` 취소/승인 경로의 실제 브라우저 차이**: 이번 검증 환경은 네이티브 dialog를 항상 억제하는 정책이라 실제 대화상자 UI 자체(버튼 텍스트/모양)는 확인할 수 없었다. 다만 `window.confirm(...)` 호출과 그 반환값 처리 로직은 코드 리뷰 및 오버라이드 테스트로 정상 동작을 확인했다.

## 최종 결론

**Embed 단계 진행 가능.**

spec.md에 정의된 모든 핵심 기능(캔버스 드로잉, 팔레트, 커스텀 색상, 지우개, 전체 지우기, PNG 저장, 반응형 레이아웃, 뒤로가기 링크, 접근성 속성)이 정상 동작함을 확인했다. 검증 중 발견한 콘솔 에러 1건과 관련 잠재 버그 1건은 `editor.js` 내에서 직접 수정하고 재검증까지 완료했다. `index.html`, `style.css`는 수정하지 않았으며, 세 파일 외 다른 파일은 건드리지 않았다.
