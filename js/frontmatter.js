// YAML frontmatter(--- ... ---) 블록을 파싱해 메타데이터와 본문을 분리한다.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, content: raw };
  }

  const [, block, content] = match;
  const meta = {};

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    value = value.replace(/^["'](.*)["']$/, "$1");

    if (key === "tags") {
      meta.tags = value
        .replace(/^\[(.*)\]$/, "$1")
        .split(",")
        .map((tag) => tag.trim().replace(/^["'](.*)["']$/, "$1"))
        .filter(Boolean);
    } else {
      meta[key] = value;
    }
  }

  return { meta, content };
}
