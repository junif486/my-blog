// 해시 라우터: "#/" -> 글 목록, "#/post/<slug>" -> 글 상세.
const app = document.getElementById("app");
const postNav = document.getElementById("post-nav");

// 빠르게 연속 이동할 때 늦게 끝난 이전 렌더링이 최신 화면을 덮어쓰지 않도록
// 라우팅마다 세대(generation) 토큰을 발급해, 최신 토큰일 때만 DOM에 반영한다.
let renderGeneration = 0;

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function excerptFrom(content, length = 120) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`\[\]!]/g, "")
    .replace(/\(([^)]*)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

async function loadManifest() {
  const res = await fetch("posts/manifest.json");
  if (!res.ok) throw new Error("manifest fetch failed");
  return res.json();
}

async function loadPost(filename) {
  const res = await fetch(`posts/${filename}`);
  if (!res.ok) throw new Error(`post fetch failed: ${filename}`);
  return parseFrontmatter(await res.text());
}

function renderTags(tags) {
  if (!tags || !tags.length) return "";
  return `<ul class="tags">${tags.map((tag) => `<li class="tag">${tag}</li>`).join("")}</ul>`;
}

// 글 메타데이터는 사이드바 내비게이션과 목록 화면 양쪽에서 필요하므로
// 한 번만 fetch하도록 결과를 캐싱해 공유한다.
let postsMetaPromise = null;

async function loadPostsMeta() {
  if (!postsMetaPromise) {
    postsMetaPromise = (async () => {
      const filenames = await loadManifest();
      const posts = await Promise.all(
        filenames.map(async (filename) => {
          try {
            const { meta, content } = await loadPost(filename);
            return {
              slug: slugFromFilename(filename),
              title: meta.title || slugFromFilename(filename),
              date: meta.date || "",
              tags: meta.tags || [],
              excerpt: excerptFrom(content),
            };
          } catch {
            return null;
          }
        })
      );
      return posts.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    })();
  }
  return postsMetaPromise;
}

async function renderSidebar(activeSlug, token) {
  try {
    const posts = await loadPostsMeta();
    if (token !== renderGeneration) return;
    postNav.innerHTML = `
      <a class="nav-link ${!activeSlug ? "active" : ""}" href="#/">전체 글</a>
      <ul class="nav-list">
        ${posts
          .map(
            (post) => `
          <li>
            <a class="nav-link ${post.slug === activeSlug ? "active" : ""}" href="#/post/${post.slug}">${post.title}</a>
          </li>`
          )
          .join("")}
      </ul>
    `;
  } catch {
    if (token === renderGeneration) postNav.innerHTML = "";
  }
}

async function renderList(token) {
  app.innerHTML = `<p class="status">글을 불러오는 중…</p>`;

  let posts;
  try {
    posts = await loadPostsMeta();
  } catch {
    if (token === renderGeneration) app.innerHTML = `<p class="status">글 목록을 불러오지 못했습니다.</p>`;
    return;
  }

  if (token !== renderGeneration) return;

  if (!posts.length) {
    app.innerHTML = `<p class="status">아직 작성된 글이 없습니다.</p>`;
    return;
  }

  app.innerHTML = `
    <ul class="post-list">
      ${posts
        .map(
          (post) => `
        <li class="post-card">
          <a href="#/post/${post.slug}">
            <h2>${post.title}</h2>
            ${post.date ? `<time>${formatDate(post.date)}</time>` : ""}
            <p>${post.excerpt}</p>
            ${renderTags(post.tags)}
          </a>
        </li>`
        )
        .join("")}
    </ul>
  `;
}

async function renderDetail(slug, token) {
  app.innerHTML = `<p class="status">글을 불러오는 중…</p>`;

  let filenames;
  try {
    filenames = await loadManifest();
  } catch {
    if (token === renderGeneration) app.innerHTML = `<p class="status">글을 불러오지 못했습니다.</p>`;
    return;
  }

  if (token !== renderGeneration) return;

  const filename = filenames.find((name) => slugFromFilename(name) === slug);
  if (!filename) {
    renderNotFound();
    return;
  }

  try {
    const { meta, content } = await loadPost(filename);
    if (token !== renderGeneration) return;
    app.innerHTML = `
      <article class="post">
        <a class="back-link" href="#/">← 목록으로</a>
        <h1>${meta.title || slug}</h1>
        ${meta.date ? `<time>${formatDate(meta.date)}</time>` : ""}
        ${renderTags(meta.tags)}
        <div class="prose">${renderMarkdown(content)}</div>
      </article>
    `;
  } catch {
    if (token === renderGeneration) renderNotFound();
  }
}

function renderNotFound() {
  app.innerHTML = `
    <div class="status">
      <p>글을 찾을 수 없습니다.</p>
      <a class="back-link" href="#/">← 목록으로</a>
    </div>
  `;
}

function route() {
  const token = ++renderGeneration;
  const hash = window.location.hash;
  const postMatch = hash.match(/^#\/post\/(.+)$/);
  const slug = postMatch ? decodeURIComponent(postMatch[1]) : null;

  renderSidebar(slug, token);

  if (slug) {
    renderDetail(slug, token);
  } else {
    renderList(token);
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
