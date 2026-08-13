// 테트리스 게임 로직 — vanilla JS + Canvas, 프레임워크/외부 라이브러리 없음.

const COLS = 10;
const ROWS = 20;

// 7종 블록의 4방향 회전 좌표를 4x4 그리드 기준으로 미리 정의한다.
// 회전할 때마다 좌표를 계산하지 않고 이 테이블에서 골라 쓴다.
const SHAPES = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
const COLOR_INDEX = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

const BASE_DROP_INTERVAL = 1000;
const MIN_DROP_INTERVAL = 120;
const SOFT_DROP_INTERVAL = 40;
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const BEST_SCORE_KEY = "tetris-best-score";

// ---- DOM ----
const boardCanvas = document.getElementById("board");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");

const pauseOverlay = document.getElementById("pause-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const finalScoreEl = document.getElementById("final-score");

const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const resumeBtn = document.getElementById("resume-btn");
const gameoverRestartBtn = document.getElementById("gameover-restart-btn");

const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const btnDown = document.getElementById("btn-down");
const btnRotate = document.getElementById("btn-rotate");

// ---- 색상 팔레트 (CSS 커스텀 프로퍼티에서 읽어와 canvas fillStyle에 사용) ----
const rootStyle = getComputedStyle(document.documentElement);
const PIECE_COLORS = {
  1: rootStyle.getPropertyValue("--piece-i").trim(),
  2: rootStyle.getPropertyValue("--piece-o").trim(),
  3: rootStyle.getPropertyValue("--piece-t").trim(),
  4: rootStyle.getPropertyValue("--piece-s").trim(),
  5: rootStyle.getPropertyValue("--piece-z").trim(),
  6: rootStyle.getPropertyValue("--piece-j").trim(),
  7: rootStyle.getPropertyValue("--piece-l").trim(),
};

// ---- 게임 상태 ----
let board = createEmptyBoard();
let currentPiece = null;
let bag = [];
let nextType = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let dropInterval = BASE_DROP_INTERVAL;
let dropCounter = 0;
let lastTime = 0;
let softDropping = false;
let paused = false;
let gameOver = false;
let cellSize = 0;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// 7-bag: 7종을 섞은 가방에서 순서대로 꺼내 쓰고, 비면 다시 채운다.
function refillBag() {
  const shuffled = [...TYPES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  bag.push(...shuffled);
}

function drawBag() {
  if (bag.length === 0) refillBag();
  return bag.shift();
}

function spawnPiece() {
  const type = nextType !== null ? nextType : drawBag();
  nextType = drawBag();
  const piece = { type, rotation: 0, x: 3, y: 0 };
  currentPiece = piece;
  renderNextPreview();
  if (!isValidPosition(getShape(piece), piece.x, piece.y)) {
    endGame();
  }
}

function getShape(piece) {
  return SHAPES[piece.type][piece.rotation];
}

// 공통 충돌 판정: 이동/회전/드롭 모두 이 함수 하나로 처리한다.
function isValidPosition(shape, x, y) {
  for (const [cx, cy] of shape) {
    const boardX = x + cx;
    const boardY = y + cy;
    if (boardX < 0 || boardX >= COLS) return false;
    if (boardY >= ROWS) return false;
    if (boardY >= 0 && board[boardY][boardX] !== 0) return false;
  }
  return true;
}

function moveLeft() {
  if (paused || gameOver || !currentPiece) return;
  const shape = getShape(currentPiece);
  if (isValidPosition(shape, currentPiece.x - 1, currentPiece.y)) {
    currentPiece.x -= 1;
  }
}

function moveRight() {
  if (paused || gameOver || !currentPiece) return;
  const shape = getShape(currentPiece);
  if (isValidPosition(shape, currentPiece.x + 1, currentPiece.y)) {
    currentPiece.x += 1;
  }
}

function rotate() {
  if (paused || gameOver || !currentPiece) return;
  const nextRotation = (currentPiece.rotation + 1) % 4;
  const shape = SHAPES[currentPiece.type][nextRotation];
  const kicks = [0, -1, 1, -2, 2];
  for (const dx of kicks) {
    if (isValidPosition(shape, currentPiece.x + dx, currentPiece.y)) {
      currentPiece.rotation = nextRotation;
      currentPiece.x += dx;
      return;
    }
  }
  // 모든 킥이 실패하면 회전을 취소한다.
}

function dropOne() {
  if (!currentPiece) return true;
  const shape = getShape(currentPiece);
  if (isValidPosition(shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
    return true;
  }
  lockPiece();
  return false;
}

function softDrop() {
  if (paused || gameOver) return;
  const moved = dropOne();
  if (moved) {
    score += 1;
    updateStats();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (paused || gameOver || !currentPiece) return;
  let cells = 0;
  const shape = getShape(currentPiece);
  while (isValidPosition(shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
    cells += 1;
  }
  score += cells * 2;
  lockPiece();
  dropCounter = 0;
  updateStats();
}

function lockPiece() {
  const shape = getShape(currentPiece);
  const colorIdx = COLOR_INDEX[currentPiece.type];
  for (const [cx, cy] of shape) {
    const boardX = currentPiece.x + cx;
    const boardY = currentPiece.y + cy;
    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
      board[boardY][boardX] = colorIdx;
    }
  }
  clearLines();
  if (!gameOver) spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== 0)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(0));
      cleared += 1;
      row += 1; // 같은 인덱스를 다시 검사 (아래 행이 내려왔으므로)
    }
  }
  if (cleared > 0) {
    linesCleared += cleared;
    level = Math.floor(linesCleared / 10) + 1;
    dropInterval = Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL * Math.pow(0.9, level - 1));
    score += (LINE_SCORES[cleared] || 0) * level;
    updateStats();
  }
}

function updateStats() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  linesEl.textContent = String(linesCleared);
  const best = Math.max(score, Number(localStorage.getItem(BEST_SCORE_KEY) || 0));
  bestEl.textContent = String(best);
  if (score > Number(localStorage.getItem(BEST_SCORE_KEY) || 0)) {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  }
}

function endGame() {
  gameOver = true;
  finalScoreEl.textContent = String(score);
  gameoverOverlay.hidden = false;
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  pauseOverlay.hidden = !paused;
}

function restart() {
  board = createEmptyBoard();
  bag = [];
  nextType = null;
  score = 0;
  level = 1;
  linesCleared = 0;
  dropInterval = BASE_DROP_INTERVAL;
  dropCounter = 0;
  softDropping = false;
  paused = false;
  gameOver = false;
  pauseOverlay.hidden = true;
  gameoverOverlay.hidden = true;
  updateStats();
  spawnPiece();
}

// ---- 렌더링 ----
function resizeCanvas() {
  const displaySize = boardCanvas.clientWidth;
  // 초기 로드 타이밍에 따라 레이아웃이 아직 계산되지 않아 0이 읽히는 경우가 있다(예: 탭이
  // 아직 화면에 표시되지 않은 시점). 이때 그대로 적용하면 캔버스가 0x0이 되어 이후 리사이즈
  // 이벤트가 없으면 보드가 영구히 보이지 않게 되므로, 0이면 무시하고 이전 크기를 유지한다.
  if (!displaySize) return;
  boardCanvas.width = displaySize;
  boardCanvas.height = displaySize * 2;
  cellSize = boardCanvas.width / COLS;
}

function drawCell(ctx, x, y, size, colorIdx) {
  const color = PIECE_COLORS[colorIdx];
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.4;
  ctx.fillRect(x, y, size - 1, size - 1);
  ctx.shadowBlur = 0;
}

function draw() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  // 배경 그리드
  boardCtx.strokeStyle = "rgba(255,255,255,0.05)";
  boardCtx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    boardCtx.beginPath();
    boardCtx.moveTo(c * cellSize, 0);
    boardCtx.lineTo(c * cellSize, boardCanvas.height);
    boardCtx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    boardCtx.beginPath();
    boardCtx.moveTo(0, r * cellSize);
    boardCtx.lineTo(boardCanvas.width, r * cellSize);
    boardCtx.stroke();
  }

  // 고정된 블록
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const val = board[row][col];
      if (val !== 0) {
        drawCell(boardCtx, col * cellSize, row * cellSize, cellSize, val);
      }
    }
  }

  // 현재 낙하 중인 블록
  if (currentPiece) {
    const shape = getShape(currentPiece);
    const colorIdx = COLOR_INDEX[currentPiece.type];
    for (const [cx, cy] of shape) {
      const boardX = currentPiece.x + cx;
      const boardY = currentPiece.y + cy;
      if (boardY >= 0) {
        drawCell(boardCtx, boardX * cellSize, boardY * cellSize, cellSize, colorIdx);
      }
    }
  }
}

function renderNextPreview() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (nextType === null) return;
  const shape = SHAPES[nextType][0];
  const colorIdx = COLOR_INDEX[nextType];
  const size = nextCanvas.width / 4;
  for (const [cx, cy] of shape) {
    drawCell(nextCtx, cx * size, cy * size, size, colorIdx);
  }
}

// ---- 메인 루프 (requestAnimationFrame + 경과시간 누적) ----
function update(time) {
  const delta = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver) {
    dropCounter += delta;
    const interval = softDropping ? SOFT_DROP_INTERVAL : dropInterval;
    if (dropCounter > interval) {
      dropCounter = 0;
      const moved = dropOne();
      if (moved && softDropping) {
        score += 1;
        updateStats();
      }
    }
  }

  draw();
  requestAnimationFrame(update);
}

// ---- 키보드 입력 ----
document.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar"].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") {
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.key) {
    case "ArrowLeft":
      moveLeft();
      break;
    case "ArrowRight":
      moveRight();
      break;
    case "ArrowDown":
      softDropping = true;
      break;
    case "ArrowUp":
      rotate();
      break;
    case " ":
    case "Spacebar":
      hardDrop();
      break;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowDown") {
    softDropping = false;
  }
});

// ---- 버튼 ----
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restart);
gameoverRestartBtn.addEventListener("click", restart);

// ---- 모바일 터치 컨트롤 ----
function bindHoldButton(btn, onTick, intervalMs) {
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    // touchstart는 이후 합성 mousedown을 함께 발생시킬 수 있어, 이미 타이머가
    // 돌고 있으면 새로 만들지 않고 무시한다(중복 시작 시 이전 타이머가 고아로
    // 남아 영원히 점수가 오르는 버그 방지).
    if (timer) return;
    onTick();
    timer = setInterval(onTick, intervalMs);
  };
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  btn.addEventListener("touchstart", start, { passive: false });
  btn.addEventListener("touchend", stop);
  btn.addEventListener("touchcancel", stop);
  btn.addEventListener("mousedown", start);
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("mouseleave", stop);
}

bindHoldButton(btnLeft, moveLeft, 120);
bindHoldButton(btnRight, moveRight, 120);
bindHoldButton(btnDown, softDrop, 60);

// touchstart로 회전을 처리한 직후 브라우저가 호환용 합성 click을 이어서 발생시킬 수 있어
// (bindHoldButton의 touchstart/mousedown 중복 문제와 같은 원인), 터치 직후 짧은 시간 내의
// click은 무시해 탭 1회당 회전이 2번 일어나지 않도록 한다.
let lastRotateTouchTime = 0;
btnRotate.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    lastRotateTouchTime = Date.now();
    rotate();
  },
  { passive: false }
);
btnRotate.addEventListener("click", () => {
  if (Date.now() - lastRotateTouchTime < 500) return;
  rotate();
});

// ---- 초기화 ----
// ResizeObserver는 창 크기 변경뿐 아니라, 초기 로드 시 레이아웃이 늦게 확정되는 경우(위
// resizeCanvas의 0 폭 가드 참고)에도 크기가 실제로 잡히는 시점에 다시 호출되어 보드가
// 계속 0x0로 남는 것을 막아준다. 미지원 브라우저에서는 window resize로 대체한다.
if (window.ResizeObserver) {
  new ResizeObserver(resizeCanvas).observe(boardCanvas);
} else {
  window.addEventListener("resize", resizeCanvas);
}
resizeCanvas();
// 초기 호출 시점에 스타일시트/레이아웃이 아직 반영되지 않아 클라이언트 너비가 0으로
// 읽히는 경우를 대비해, 레이아웃이 확정된 뒤(다음 프레임, 그리고 load 이벤트 시점)
// 한 번씩 더 시도한다. resizeCanvas 자체는 0이면 이전 크기를 유지하는 가드가 있어
// 안전하게 반복 호출할 수 있다.
requestAnimationFrame(resizeCanvas);
window.addEventListener("load", resizeCanvas);
restart();
requestAnimationFrame(update);
