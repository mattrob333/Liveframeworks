"use client";

import React from "react";

// Markdown-lite for agent chat output: bold, italic, inline code, links,
// headings, bullet/numbered lists, and fenced code blocks. Rendered as React
// elements (never raw HTML), so model output cannot inject markup.

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
const LINK_PATTERN = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

export function renderInline(text, keyPrefix = "t") {
  const parts = String(text).split(INLINE_PATTERN);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(LINK_PATTERN);
    if (link) {
      return <a key={key} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    }
    return part;
  });
}

function flushParagraph(blocks, lines) {
  if (!lines.length) return;
  const key = `p-${blocks.length}`;
  blocks.push(
    <p key={key}>
      {lines.map((line, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 && <br />}
          {renderInline(line, `${key}-${index}`)}
        </React.Fragment>
      ))}
    </p>,
  );
  lines.length = 0;
}

function flushList(blocks, items, ordered) {
  if (!items.length) return;
  const key = `l-${blocks.length}`;
  const children = items.map((item, index) => <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>);
  blocks.push(ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>);
  items.length = 0;
}

export default function RichText({ text }) {
  const blocks = [];
  const paragraph = [];
  const listItems = [];
  let listOrdered = false;
  let codeLines = null;

  const flushAll = () => {
    flushParagraph(blocks, paragraph);
    flushList(blocks, listItems, listOrdered);
  };

  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");

    if (codeLines !== null) {
      if (/^```/.test(line)) {
        blocks.push(<pre key={`c-${blocks.length}`}>{codeLines.join("\n")}</pre>);
        codeLines = null;
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }
    if (/^```/.test(line)) {
      flushAll();
      codeLines = [];
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push(<strong className="rich-heading" key={`h-${blocks.length}`}>{renderInline(heading[2], `h-${blocks.length}`)}</strong>);
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph(blocks, paragraph);
      const ordered = Boolean(numbered);
      if (listItems.length && listOrdered !== ordered) flushList(blocks, listItems, listOrdered);
      listOrdered = ordered;
      listItems.push((bullet || numbered)[1]);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList(blocks, listItems, listOrdered);
    paragraph.push(line);
  }

  if (codeLines !== null) blocks.push(<pre key={`c-${blocks.length}`}>{codeLines.join("\n")}</pre>);
  flushAll();

  return <div className="rich">{blocks}</div>;
}
