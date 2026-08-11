// 다크모드: 기본은 시스템 설정(prefers-color-scheme)을 따르고,
// 사용자가 토글을 누르면 localStorage에 명시적 선호를 저장해 우선 적용한다.
const THEME_KEY = "theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateToggleLabel();
}

function currentEffectiveTheme() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit) return explicit;
  return media.matches ? "dark" : "light";
}

function updateToggleLabel() {
  const button = document.getElementById("theme-toggle");
  if (!button) return;
  const effective = currentEffectiveTheme();
  button.textContent = effective === "dark" ? "☀️ Light" : "🌙 Dark";
  button.setAttribute("aria-label", effective === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved);

  media.addEventListener("change", () => {
    if (!localStorage.getItem(THEME_KEY)) {
      updateToggleLabel();
    }
  });

  const button = document.getElementById("theme-toggle");
  if (button) {
    button.addEventListener("click", () => {
      const next = currentEffectiveTheme() === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
}
