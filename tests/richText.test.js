import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RichText from "../components/RichText.jsx";

const render = text => renderToStaticMarkup(React.createElement(RichText, { text }));

test("bold, italic, and inline code render as elements, not literal asterisks", () => {
  const html = render("This is **important**, this is *nuance*, and this is `code`.");
  assert.match(html, /<strong>important<\/strong>/);
  assert.match(html, /<em>nuance<\/em>/);
  assert.match(html, /<code>code<\/code>/);
  assert.doesNotMatch(html, /\*\*/);
});

test("bullet and numbered lists become real lists", () => {
  const html = render("Findings:\n- first point\n- **second** point\n\n1. step one\n2. step two");
  assert.match(html, /<ul><li>first point<\/li><li><strong>second<\/strong> point<\/li><\/ul>/);
  assert.match(html, /<ol><li>step one<\/li><li>step two<\/li><\/ol>/);
});

test("headings, code fences, and paragraphs are structured", () => {
  const html = render("## Market read\nLine one\nLine two\n\n```\nraw block\n```");
  assert.match(html, /rich-heading/);
  assert.match(html, /Market read/);
  assert.match(html, /Line one<br\/>Line two/);
  assert.match(html, /<pre>raw block<\/pre>/);
});

test("only http(s) links become anchors and markup cannot be injected", () => {
  const linked = render("See [the site](https://example.com/page) for detail.");
  assert.match(linked, /<a href="https:\/\/example.com\/page"[^>]*>the site<\/a>/);

  const hostile = render("[x](javascript:alert(1)) and <script>alert(1)</script>");
  assert.doesNotMatch(hostile, /<a /);
  assert.doesNotMatch(hostile, /<script>/);
  assert.match(hostile, /&lt;script&gt;/);
});
