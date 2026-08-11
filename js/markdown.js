// 외부 의존성 없는 경량 마크다운 -> HTML 파서.
// 지원 문법: 헤딩, 굵게/기울임, 인라인 코드, 코드블록, 링크/이미지, 목록, 인용, 수평선, 문단.

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text) {
  // 코드/이미지/링크는 raw 텍스트에서 먼저 추출해 자체적으로 escape한 뒤
  // 자리표시자로 치환한다. 나머지 텍스트만 이후 escape + 굵게/기울임 처리하여
  // 이중 escape(예: " -> &quot; 이후 title용 따옴표 매칭 실패)를 방지한다.
  const placeholders = [];
  const stash = (html) => {
    placeholders.push(html);
    return ` ${placeholders.length - 1} `;
  };

  let work = text
    .replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return stash(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}>`);
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return stash(`<a href="${escapeHtml(href)}"${titleAttr}>${escapeHtml(label)}</a>`);
    });

  work = escapeHtml(work)
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
    .replace(/\*([^*]+)\*|(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, (_, a, b) => `<em>${a || b}</em>`);

  return work.replace(/ (\d+) /g, (_, index) => placeholders[Number(index)]);
}

function renderListBlock(lines) {
  const isOrdered = /^\s*\d+\.\s+/.test(lines[0]);
  const marker = isOrdered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
  const items = lines.map((line) => `<li>${renderInline(line.match(marker)[1])}</li>`).join("");
  const tag = isOrdered ? "ol" : "ul";
  return `<${tag}>${items}</${tag}>`;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1];
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const classAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html.push(`<pre><code${classAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push("<hr>");
      i++;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const isOrdered = /^\s*\d+\.\s+/.test(line);
      const listLines = [];
      const test = isOrdered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      while (i < lines.length && test.test(lines[i])) {
        listLines.push(lines[i]);
        i++;
      }
      html.push(renderListBlock(listLines));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    const paragraphLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return html.join("\n");
}
