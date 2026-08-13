(function () {
  "use strict";

  var GRID_SIZE = 16;
  var EXPORT_SCALE = 16;

  var PALETTE = [
    { name: "검정", value: "#000000" },
    { name: "흰색", value: "#ffffff" },
    { name: "회색", value: "#888888" },
    { name: "진회색", value: "#333333" },
    { name: "빨강", value: "#ff3b3b" },
    { name: "주황", value: "#ff8c1a" },
    { name: "노랑", value: "#ffe135" },
    { name: "연두", value: "#9dff1a" },
    { name: "초록", value: "#1aff6f" },
    { name: "청록", value: "#0ff0fc" },
    { name: "파랑", value: "#1a6bff" },
    { name: "남색", value: "#3a1aff" },
    { name: "보라", value: "#a01aff" },
    { name: "분홍", value: "#ff2fd0" },
    { name: "갈색", value: "#8a5a2b" },
    { name: "살구색", value: "#ffcba4" }
  ];

  var CHECKER_A = "#16161f";
  var CHECKER_B = "#1c1c28";

  var grid = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  var currentColor = PALETTE[9].value; // 청록, default
  var isEraser = false;
  var isDrawing = false;
  var lastIndex = -1;
  var cellSize = 0;

  var canvas = document.getElementById("pixel-canvas");
  var ctx = canvas.getContext("2d");
  var paletteEl = document.getElementById("palette");
  var currentColorPreview = document.getElementById("current-color-preview");
  var customColorInput = document.getElementById("custom-color");
  var eraserBtn = document.getElementById("eraser-btn");
  var clearBtn = document.getElementById("clear-btn");
  var saveBtn = document.getElementById("save-btn");

  var swatchButtons = [];

  function buildPalette() {
    PALETTE.forEach(function (color) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.style.backgroundColor = color.value;
      btn.setAttribute("aria-label", "색상: " + color.name);
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        setCurrentColor(color.value);
      });
      paletteEl.appendChild(btn);
      swatchButtons.push({ btn: btn, value: color.value });
    });
  }

  function updateSelectionUI() {
    swatchButtons.forEach(function (entry) {
      var pressed = !isEraser && entry.value === currentColor;
      entry.btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
    eraserBtn.setAttribute("aria-pressed", isEraser ? "true" : "false");
    currentColorPreview.style.backgroundColor = isEraser ? "transparent" : currentColor;
    currentColorPreview.style.boxShadow = isEraser ? "none" : "0 0 10px " + currentColor;
  }

  function setCurrentColor(value) {
    currentColor = value;
    isEraser = false;
    updateSelectionUI();
  }

  function setEraser() {
    isEraser = true;
    updateSelectionUI();
  }

  function resizeCanvas() {
    var displaySize = canvas.getBoundingClientRect().width;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(displaySize * dpr);
    canvas.height = Math.round(displaySize * dpr);
    cellSize = canvas.width / GRID_SIZE;
    render();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var idx = row * GRID_SIZE + col;
        var value = grid[idx];
        var x = col * cellSize;
        var y = row * cellSize;
        if (value === null) {
          var isEven = (row + col) % 2 === 0;
          ctx.fillStyle = isEven ? CHECKER_A : CHECKER_B;
        } else {
          ctx.fillStyle = value;
        }
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  function cellIndexFromEvent(evt) {
    var rect = canvas.getBoundingClientRect();
    var relX = evt.clientX - rect.left;
    var relY = evt.clientY - rect.top;
    var col = Math.floor((relX / rect.width) * GRID_SIZE);
    var row = Math.floor((relY / rect.height) * GRID_SIZE);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
      return -1;
    }
    return row * GRID_SIZE + col;
  }

  function paintAt(evt) {
    var idx = cellIndexFromEvent(evt);
    if (idx === -1 || idx === lastIndex) {
      return;
    }
    lastIndex = idx;
    grid[idx] = isEraser ? null : currentColor;
    render();
  }

  function onPointerDown(evt) {
    isDrawing = true;
    lastIndex = -1;
    paintAt(evt);
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch (err) {
        // Some browsers/input types may not have an "active" pointer to
        // capture at this point; drawing still works via pointermove.
      }
    }
  }

  function onPointerMove(evt) {
    if (!isDrawing) {
      return;
    }
    paintAt(evt);
  }

  function onPointerUp() {
    isDrawing = false;
    lastIndex = -1;
  }

  function clearGrid() {
    var ok = window.confirm("전체 그림을 지우시겠습니까? 되돌릴 수 없습니다.");
    if (!ok) {
      return;
    }
    grid = new Array(GRID_SIZE * GRID_SIZE).fill(null);
    render();
  }

  function saveAsPng() {
    var exportSize = GRID_SIZE * EXPORT_SCALE;
    var off = document.createElement("canvas");
    off.width = exportSize;
    off.height = exportSize;
    var offCtx = off.getContext("2d");

    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var value = grid[row * GRID_SIZE + col];
        if (value === null) {
          continue;
        }
        offCtx.fillStyle = value;
        offCtx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }

    off.toBlob(function (blob) {
      if (!blob) {
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "pixel-art.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  buildPalette();
  updateSelectionUI();

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  // Fallback in case pointer capture isn't supported/succeeds: if the
  // pointer is released after leaving the canvas, the canvas-level
  // listener above never fires, so isDrawing would stay stuck true.
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  eraserBtn.addEventListener("click", setEraser);
  clearBtn.addEventListener("click", clearGrid);
  saveBtn.addEventListener("click", saveAsPng);
  customColorInput.addEventListener("input", function (evt) {
    setCurrentColor(evt.target.value);
  });

  window.addEventListener("resize", debounce(resizeCanvas, 150));

  resizeCanvas();
})();
