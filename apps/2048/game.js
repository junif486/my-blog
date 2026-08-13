(function () {
  "use strict";

  var SIZE = 4;
  var WIN_VALUE = 2048;
  var BEST_SCORE_KEY = "2048-best-score";
  var SWIPE_THRESHOLD = 30;

  var dom = {};
  var state = {
    board: [],
    score: 0,
    best: 0,
    hasWon: false,
    isGameOver: false
  };

  function cacheDom() {
    dom.board = document.getElementById("board");
    dom.gridBg = document.getElementById("grid-bg");
    dom.tileLayer = document.getElementById("tile-layer");
    dom.scoreEl = document.getElementById("score");
    dom.bestEl = document.getElementById("best");
    dom.restartBtn = document.getElementById("restart-btn");
    dom.winOverlay = document.getElementById("win-overlay");
    dom.loseOverlay = document.getElementById("lose-overlay");
    dom.continueBtn = document.getElementById("continue-btn");
    dom.winRestartBtn = document.getElementById("win-restart-btn");
    dom.loseRestartBtn = document.getElementById("lose-restart-btn");
    dom.finalScoreEl = document.getElementById("final-score");
  }

  function buildGridBackground() {
    dom.gridBg.innerHTML = "";
    for (var i = 0; i < SIZE * SIZE; i++) {
      var cell = document.createElement("div");
      cell.className = "cell";
      dom.gridBg.appendChild(cell);
    }
  }

  function createEmptyBoard() {
    var board = [];
    for (var r = 0; r < SIZE; r++) {
      board.push([0, 0, 0, 0]);
    }
    return board;
  }

  function getEmptyCells(board) {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  function addRandomTile(board) {
    var empties = getEmptyCells(board);
    if (empties.length === 0) return null;
    var cell = empties[Math.floor(Math.random() * empties.length)];
    var value = Math.random() < 0.9 ? 2 : 4;
    board[cell.row][cell.col] = value;
    return { row: cell.row, col: cell.col, value: value };
  }

  function boardHasTile(board, value) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === value) return true;
      }
    }
    return false;
  }

  // Compress + merge a single line of 4 values toward index 0.
  // Each tile merges at most once per move (merged results are not re-merged).
  function processLine(values) {
    var filtered = [];
    var i;
    for (i = 0; i < values.length; i++) {
      if (values[i] !== 0) filtered.push(values[i]);
    }

    var result = [];
    var mergedIndices = [];
    var scoreGain = 0;

    i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var merged = filtered[i] * 2;
        result.push(merged);
        mergedIndices.push(result.length - 1);
        scoreGain += merged;
        i += 2;
      } else {
        result.push(filtered[i]);
        i += 1;
      }
    }

    while (result.length < values.length) result.push(0);

    return { result: result, mergedIndices: mergedIndices, scoreGain: scoreGain };
  }

  // Returns the coordinate lines (in merge-direction order) for a move direction.
  function getLines(direction) {
    var lines = [];
    var r, c;
    if (direction === "left") {
      for (r = 0; r < SIZE; r++) {
        lines.push([[r, 0], [r, 1], [r, 2], [r, 3]]);
      }
    } else if (direction === "right") {
      for (r = 0; r < SIZE; r++) {
        lines.push([[r, 3], [r, 2], [r, 1], [r, 0]]);
      }
    } else if (direction === "up") {
      for (c = 0; c < SIZE; c++) {
        lines.push([[0, c], [1, c], [2, c], [3, c]]);
      }
    } else if (direction === "down") {
      for (c = 0; c < SIZE; c++) {
        lines.push([[3, c], [2, c], [1, c], [0, c]]);
      }
    }
    return lines;
  }

  // Core move function: all four directions reduce to processing "left-oriented" lines.
  function moveBoard(board, direction) {
    var newBoard = board.map(function (row) {
      return row.slice();
    });
    var moved = false;
    var scoreGain = 0;
    var mergedCells = [];

    var lines = getLines(direction);
    for (var li = 0; li < lines.length; li++) {
      var coords = lines[li];
      var values = coords.map(function (rc) {
        return board[rc[0]][rc[1]];
      });
      var processed = processLine(values);
      scoreGain += processed.scoreGain;

      for (var i = 0; i < coords.length; i++) {
        var r = coords[i][0];
        var c = coords[i][1];
        if (newBoard[r][c] !== processed.result[i]) moved = true;
        newBoard[r][c] = processed.result[i];
      }

      for (var m = 0; m < processed.mergedIndices.length; m++) {
        var idx = processed.mergedIndices[m];
        mergedCells.push({ row: coords[idx][0], col: coords[idx][1] });
      }
    }

    return { board: newBoard, moved: moved, scoreGain: scoreGain, mergedCells: mergedCells };
  }

  function canMove(board) {
    var directions = ["left", "right", "up", "down"];
    for (var i = 0; i < directions.length; i++) {
      if (moveBoard(board, directions[i]).moved) return true;
    }
    return false;
  }

  function loadBest() {
    var raw = localStorage.getItem(BEST_SCORE_KEY);
    var value = parseInt(raw, 10);
    return isNaN(value) ? 0 : value;
  }

  function saveBest(value) {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  }

  function isModalOpen() {
    return !dom.winOverlay.hidden || !dom.loseOverlay.hidden;
  }

  function showWinOverlay() {
    dom.winOverlay.hidden = false;
  }

  function hideWinOverlay() {
    dom.winOverlay.hidden = true;
  }

  function showLoseOverlay() {
    dom.finalScoreEl.textContent = state.score;
    dom.loseOverlay.hidden = false;
  }

  function hideLoseOverlay() {
    dom.loseOverlay.hidden = true;
  }

  function updateScoreboard() {
    dom.scoreEl.textContent = state.score;
    dom.bestEl.textContent = state.best;
  }

  function render(meta) {
    meta = meta || {};
    var mergedCells = meta.mergedCells || [];
    var newCell = meta.newCell || null;

    var rect = dom.tileLayer.getBoundingClientRect();
    var gapPx = parseFloat(getComputedStyle(dom.tileLayer).left) || 0;
    var cellSize = (rect.width - gapPx * (SIZE - 1)) / SIZE;

    dom.tileLayer.innerHTML = "";

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var value = state.board[r][c];
        if (value === 0) continue;

        var tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.value = String(value);
        tile.textContent = String(value);

        var x = c * (cellSize + gapPx);
        var y = r * (cellSize + gapPx);
        tile.style.width = cellSize + "px";
        tile.style.height = cellSize + "px";
        tile.style.transform = "translate(" + x + "px, " + y + "px)";

        var isMerged = mergedCells.some(function (m) {
          return m.row === r && m.col === c;
        });
        if (isMerged) tile.classList.add("tile-merged");

        if (newCell && newCell.row === r && newCell.col === c) {
          tile.classList.add("tile-new");
        }

        dom.tileLayer.appendChild(tile);
      }
    }

    updateScoreboard();
  }

  function newGame() {
    state.board = createEmptyBoard();
    state.score = 0;
    state.hasWon = false;
    state.isGameOver = false;

    hideWinOverlay();
    hideLoseOverlay();

    addRandomTile(state.board);
    var second = addRandomTile(state.board);

    render({ newCell: second });
  }

  function handleDirection(direction) {
    if (state.isGameOver || isModalOpen()) return;

    var result = moveBoard(state.board, direction);
    if (!result.moved) return;

    state.board = result.board;
    state.score += result.scoreGain;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }

    var newCell = addRandomTile(state.board);

    var wonBefore = state.hasWon;
    if (!wonBefore && boardHasTile(state.board, WIN_VALUE)) {
      state.hasWon = true;
    }

    state.isGameOver = !canMove(state.board);

    render({ mergedCells: result.mergedCells, newCell: newCell });

    if (state.hasWon && !wonBefore) {
      showWinOverlay();
    } else if (state.isGameOver) {
      showLoseOverlay();
    }
  }

  var KEY_DIRECTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right"
  };

  function onKeyDown(e) {
    var direction = KEY_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    handleDirection(direction);
  }

  var touchStart = null;

  function onTouchStart(e) {
    var t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    touchStart = null;

    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

    var direction;
    if (absX > absY) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }
    handleDirection(direction);
  }

  function onResize() {
    render({});
  }

  function attachEvents() {
    document.addEventListener("keydown", onKeyDown);
    dom.board.addEventListener("touchstart", onTouchStart, { passive: true });
    dom.board.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);

    dom.restartBtn.addEventListener("click", newGame);
    dom.winRestartBtn.addEventListener("click", newGame);
    dom.loseRestartBtn.addEventListener("click", newGame);
    dom.continueBtn.addEventListener("click", function () {
      hideWinOverlay();
      // Edge case: the winning move can also be the last possible move
      // (board full, no merges left) — surface the lose overlay once the
      // player dismisses the win overlay instead of leaving input dead.
      if (state.isGameOver) {
        showLoseOverlay();
      }
    });
  }

  function init() {
    cacheDom();
    buildGridBackground();
    state.best = loadBest();
    attachEvents();
    newGame();
  }

  init();
})();
