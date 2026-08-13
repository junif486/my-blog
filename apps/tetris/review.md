# 테트리스 게임 — Review 결과

검증 대상: `apps/tetris/index.html`, `style.css`, `game.js`
검증 방법: `D:\claudecode_exam\my-blog` 루트에서 `npx http-server -p 8091 -c-1`으로 로컬 정적 서버를 띄우고
(포트 3000은 이미 다른 서비스가 점유 중이라 8091 사용, 검증 종료 후 서버는 정상 종료함) 브라우저 도구로
`/apps/tetris/index.html`을 열어 검증. 이번 검증 환경에서는 브라우저 패널이 실제로 화면에 표시(compositing)
되지 않아 `requestAnimationFrame`이 전혀 발화하지 않는 제약이 있어(스크린샷 시도 시 "the Browser pane is not
displayed, so the page is not compositing frames" 오류로 확인), 순수 대기(sleep) 방식으로는 자동 낙하 등
rAF 기반 루프를 관찰할 수 없었다. 이 경우 지침 6항에 따라 `update(time)`, `dropOne()`, `lockPiece()`,
`clearLines()`, `spawnPiece()`, `rotate()` 등 내부 함수를 페이지의 JS 컨텍스트에서 직접 호출/상태 조작하여
로직을 검증했고, 이벤트 기반 동작(버튼 클릭/터치, 키 입력에 의한 즉시 이동/회전/드롭, localStorage, 리사이즈,
back-link 이동)은 실제 DOM 이벤트 디스패치와 `document.location` 변화로 검증했다.

## 검증 항목과 결과

| 항목 | 결과 | 비고 |
|---|---|---|
| 콘솔 에러 없음 | 통과 | 초기 로드, 리사이즈, 각종 조작 후 모두 콘솔 로그 없음 |
| 좌우 이동 (moveLeft/moveRight) | 통과 | `x` 값이 정확히 ±1 이동 |
| 회전 (rotate, 시계방향 회전 테이블 진행) | 통과 | rotation 0→1 정상 전환 |
| 자동 낙하 타이머 로직 | 통과(간접 검증) | `update(time)`을 시뮬레이션된 타임스탬프로 직접 호출해 `dropCounter`가 `dropInterval`(1000ms) 초과 시 정확히 1칸 낙하함을 확인. 실제 rAF 스케줄링 자체는 이 테스트 환경 제약으로 실시간 관찰 불가했으나 로직은 표준적인 `requestAnimationFrame(update)` 재귀 호출로, 실제(화면에 표시되는) 브라우저 탭에서는 정상 동작하는 패턴 |
| 소프트 드롭(키보드 홀드, `softDropping` 플래그) | 통과(간접 검증) | `softDropping=true` 상태에서 `update()`가 40ms 간격으로 더 빠르게 낙하하고 틱당 +1점 부여함을 확인 |
| 소프트 드롭(터치 버튼) | 통과 | `btn-down` 홀드 시 60ms 간격으로 `dropOne()` 반복 호출, 점수 증가 확인 |
| 하드 드롭 | 통과 | 스페이스바 대응 `hardDrop()` 직접 호출로 즉시 바닥까지 낙하, 칸 수×2점 가산, 즉시 고정 확인 |
| 벽/바닥 근처 단순 킥 | 통과 | I 블록을 오른쪽 벽에 걸치도록 강제 배치 후 회전 시 x가 자동 보정되어 유효 위치로 이동함을 확인(우측). 좌측 벽에서도 `kicks=[0,-1,1,-2,2]` 순서대로 시도해 `dx=+1`에서 성공적으로 킥됨을 확인. 바닥 근처(세로 초과) 회전은 스펙대로 가로 킥만 시도하므로 실패 처리되는 것도 스펙에 부합(가로 킥으로 세로 초과를 해결할 수 없는 것은 설계상 정상) |
| 라인 클리어 + 점수 | 통과 | board 배열을 조작해 한 줄을 채운 뒤 `lockPiece()` 호출 → 해당 줄 제거, 위쪽 블록이 한 칸씩 내려옴, 점수 +100(1줄×레벨1) 정확히 반영 |
| 레벨업 / 낙하속도 증가 | 통과 | 10줄 제거 시뮬레이션 후 `level`이 2로, `dropInterval`이 1000→900(10% 감소)으로 정확히 변경됨 |
| 다음 블록 미리보기 정확성 | 통과 | `spawnPiece()` 호출 전 `nextType` 값과, 호출 후 실제로 스폰된 `currentPiece.type`이 일치함을 확인 |
| 일시정지(P)/재개 | 통과 | `togglePause()` 호출로 `paused` 플래그와 오버레이 hidden 속성이 정확히 토글되고, 일시정지 중 `moveRight()` 등 입력이 무시됨을 확인. 재개 시 정상 복귀 |
| 게임오버 | 통과 | board 전체를 채운 뒤 `spawnPiece()` 호출 → 스폰 위치 충돌로 `endGame()` 트리거, `gameOver=true`, 게임오버 오버레이 표시, 최종 점수 텍스트 정확히 반영 |
| 다시 시작(restart) | 통과 | 게임오버 상태에서 `restart()` 호출 시 board 전체 초기화, `gameOver=false`, 오버레이 숨김, 통계 초기화 확인 |
| 최고 점수 localStorage 저장/유지 | 통과 | `updateStats()`로 최고 점수 갱신 후 `localStorage.getItem('tetris-best-score')` 값 확인, 페이지 새로고침 후에도 BEST 표시와 저장값이 유지됨을 확인 |
| 모바일 터치 버튼 홀드/릴리즈(interval 누수 여부) | 통과(수정 후) | 좌/우/아래 버튼: `mousedown`→일정 시간 대기→`mouseup` 시 이동이 정확히 멈추고 이후 추가 이동이 없음을 확인. **`touchstart` 발생 직후 합성 `mousedown`이 이어지는 상황(Build 단계에서 발견된 것과 같은 유형)을 재현 시뮬레이션했을 때도 중복 시작 없이 정상 작동**(Build 단계 수정이 유효함을 재확인). **회전 버튼(`btn-rotate`)에서는 별도의 버그를 새로 발견하여 수정함(아래 "발견 및 수정한 문제" 참고)** |
| 모바일 폭(375px) 레이아웃 | 통과 | `document.documentElement.scrollWidth <= window.innerWidth` (가로 스크롤 없음), `.game-area`가 column 방향으로 전환, `.touch-controls`가 `display:flex`로 노출됨을 확인 |
| "블로그로 돌아가기" 링크 | 통과 | 링크 클릭 시 `document.location.href`가 `http://localhost:8091/index.html`(블로그 루트)로 정확히 이동하고 페이지 타이틀이 "my-blog"로 바뀜을 확인 |

## 발견해서 수정한 문제

### 1. (중요) 회전 버튼의 터치 후 합성 클릭으로 인한 중복 회전 — `game.js`

기존 코드는 `btn-rotate`에 `click`과 `touchstart` 리스너를 각각 독립적으로 바인딩하고 있었다:

```js
btnRotate.addEventListener("click", rotate);
btnRotate.addEventListener("touchstart", (e) => { e.preventDefault(); rotate(); }, { passive: false });
```

터치스크린에서 `touchstart`로 회전이 처리된 뒤, 브라우저가 호환용 합성 `click` 이벤트를 이어서 발생시키면
(`touchstart`에서의 `preventDefault()`가 합성 클릭 억제를 보장하지 않는 브라우저/웹뷰가 존재함) 탭 1회에
회전이 2번 일어나는 문제를 실제로 재현했다(합성 `touchstart` + `click` 순서로 디스패치해 `rotation`이
0→1→2로 두 번 바뀌는 것을 확인). 이는 `bindHoldButton`에서 이미 한 번 수정된 "touchstart 이후 합성
mousedown으로 인한 중복 시작"과 동일한 버그 클래스이며, 스펙 5.2 "회전 버튼은 탭 1회당 1번 회전한다"를
위반한다.

**수정**: 마지막 `touchstart` 발생 시각을 기록해두고, 그 직후(500ms 이내) 들어오는 `click`은 무시하도록
변경했다.

```js
let lastRotateTouchTime = 0;
btnRotate.addEventListener("touchstart", (e) => {
  e.preventDefault();
  lastRotateTouchTime = Date.now();
  rotate();
}, { passive: false });
btnRotate.addEventListener("click", () => {
  if (Date.now() - lastRotateTouchTime < 500) return;
  rotate();
});
```

수정 후 동일한 재현 시나리오(합성 `touchstart` + `click`)에서 회전이 정확히 1번만 일어나는 것을 확인했고,
터치 없이 마우스로만 `click`하는 데스크톱 시나리오도 정상적으로 회전됨을 별도로 확인했다.

### 2. (경미, 예방적 수정) 초기 로드 시 캔버스가 0×0 크기로 굳어질 수 있는 경쟁 상태 — `game.js`

검증 중 최초 1회, 페이지 로드 직후 `boardCanvas.width`/`height`가 `0`으로 남아있는 것을 관찰했다
(`resizeCanvas()`가 실행되는 시점에 `boardCanvas.clientWidth`가 아직 레이아웃 계산 전이라 `0`을 반환한
것으로 추정됨 — 이 검증 환경은 브라우저 패널이 화면에 실제로 표시(compositing)되지 않는 특수한 상태였고,
이후 재로드에서는 매번 정상적으로 크기가 잡혔기 때문에 일반적인(화면에 보이는) 브라우저 탭에서 항상
재현되는 문제인지는 확정하지 못했다). 다만 기존 코드는 `resizeCanvas()`를 최초 1회 호출 + `window`의
`resize` 이벤트에서만 재호출하므로, 만약 최초 호출 시점에 레이아웃이 아직 확정되지 않아 `0`을 읽는
브라우저/상황이 있다면 사용자가 창 크기를 조절하기 전까지 보드 전체가 영구히 보이지 않는(게임 자체는
내부적으로 동작하지만 캔버스에 아무것도 그려지지 않는) 심각한 사용자 경험 문제로 이어질 수 있다.

**수정**: 두 가지 방어 로직을 추가했다.
1. `resizeCanvas()`에서 `clientWidth`가 `0`이면 기존 크기를 그대로 유지하고 반환하도록(0으로 덮어쓰지 않도록) 가드를 추가.
2. `window`의 `resize` 이벤트 대신(미지원 브라우저에서는 폴백으로 유지) `ResizeObserver`로 `boardCanvas`의 실제 레이아웃 크기 변화를 관찰하도록 변경 — 창 크기 변경뿐 아니라 초기 레이아웃이 늦게 확정되는 경우에도 크기가 실제로 잡히는 시점에 자동으로 다시 계산되도록 함.

이 수정은 스펙 3.3/7항의 "JS에서 캔버스의 실제 렌더링 해상도를 표시 크기에 맞춰 동기화"라는 요구사항을
더 견고하게 만족시키는 방향이며, 다른 두 파일이나 다른 앱에는 영향을 주지 않는다.

수정 후 여러 차례 재로드 및 375px 모바일 폭 재로드에서 `boardCanvas.width > 0`, `cellSize > 0`임을
확인했고, 기존에 정상 동작하던 항목들에 회귀가 없음을 전체 재검증(이동/회전/홀드버튼/라인클리어/일시정지/
게임오버/재시작/최고점수)으로 확인했다.

## 수정하지 않고 남겨둔 사소한 이슈 (우선순위 낮음)

- **키보드 포커스로 터치 버튼 활성화 불가**: `btn-left`/`btn-right`/`btn-down`은 `mousedown`/`touchstart`
  기반으로만 동작해서, 버튼에 포커스를 두고 Enter/Space로 누르는 키보드 사용자는 홀드 반복 이동을 실행할
  수 없다(회전 버튼은 `click`도 바인딩되어 있어 Enter/Space로 동작함). 다만 이 화면은 원래 키보드 방향키로
  동일한 동작이 전부 가능하므로 실사용에 지장은 없고, 스펙 8항의 접근성 요구사항("실제 `<button>` 요소로
  포커스/Enter/Space 활성화 기본 동작")은 요소 자체는 만족하고 있어(button 태그 사용) 치명적이지 않다고
  판단해 수정하지 않았다.
- **`update()`의 `requestAnimationFrame` 체인은 탭이 백그라운드/비표시 상태일 때 브라우저에 의해 스로틀되거나
  중단될 수 있음**: 이는 브라우저의 표준 동작이며(비활성 탭에서 rAF 절전), 게임 특화 이슈가 아니라 rAF 기반
  루프를 쓰는 모든 웹 페이지에 공통되는 특성이라 별도 수정하지 않았다. 필요하다면 `visibilitychange`에서
  `lastTime`을 재동기화하는 정도의 보정을 추가할 수 있으나, 스펙에 명시된 요구사항이 아니고 실사용(탭이
  보이는 상태에서 플레이)에는 영향이 없어 과설계로 판단해 보류했다.

## 최종 결론

**Embed 단계 진행 가능.** 검증 절차 1~13번 항목 모두 통과했고, 검증 중 발견한 진짜 버그 1건(회전 버튼
중복 발화)을 수정해 재검증까지 완료했다. 추가로 사용자 경험에 영향을 줄 수 있는 잠재적 경쟁 상태 1건을
예방적으로 방어 코드로 보강했다. 두 수정 모두 `game.js` 내부에만 있으며 `index.html`/`style.css`는 변경하지
않았다. 남은 이슈는 모두 우선순위 낮음으로 실사용에 지장이 없다고 판단한다.
