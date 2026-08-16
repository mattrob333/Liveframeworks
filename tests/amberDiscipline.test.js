import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
const [screenCss, printCss = ""] = CSS.split("@media print");
const LOADER = readFileSync(fileURLToPath(new URL("../components/LoadingState.module.css", import.meta.url)), "utf8");

test("ToC proof chips stay amber; artifact-meta chips do not", () => {
  assert.match(
    screenCss,
    /\.toc-proof-chips \.basis-inferred,\.toc-proof-chips \.basis-assumed,\.toc-proof-chips \.confidence-medium\{color:var\(--amber\)\}/,
  );
  assert.doesNotMatch(
    screenCss,
    /\.artifact-meta \.basis-inferred,\.artifact-meta \.basis-assumed,\.artifact-meta \.confidence-medium\{[^}]*var\(--amber\)/,
  );
  assert.match(screenCss, /\.artifact-meta>span\{[^}]*color:var\(--dim\)/);
});

test("constraint lines are amber; export engagement stays ink", () => {
  assert.match(screenCss, /\.framework-constraint\{[^}]*color:var\(--amber\)/);
  assert.match(screenCss, /\.export-constraint\{[^}]*color:var\(--amber\)/);
  assert.match(screenCss, /\.toc-constraint-lockup\{[^}]*color:var\(--amber\)/);
  assert.match(screenCss, /\.export-engagement\{[^}]*color:var\(--line\)/);
  assert.doesNotMatch(screenCss, /\.export-engagement,\.export-constraint/);
});

test("focus rings stay amber", () => {
  assert.match(screenCss, /:focus-visible\{outline:2px solid var\(--amber\);outline-offset:3px\}/);
  assert.match(
    screenCss,
    /\.btnrow label:has\(input\[type=file\]:focus-visible\)\{outline:2px solid var\(--amber\);outline-offset:3px\}/,
  );
  assert.match(screenCss, /\.area:focus\{border-color:var\(--amber\)\}/);
});

test("print block has no amber", () => {
  assert.match(printCss, /background:#fff/);
  assert.doesNotMatch(printCss, /--amber|#E39A2B|#C47A08/i);
});

test("LoadingState leftover paper-orange is gone", () => {
  assert.doesNotMatch(LOADER, /#C47A08/);
  assert.doesNotMatch(LOADER, /#E39A2B/);
  assert.doesNotMatch(LOADER, /rgba\(\s*196\s*,\s*122\s*,\s*8/);
  assert.doesNotMatch(LOADER, /--amber/);
});

test("LoadingState has no light-paper comma hex fallbacks", () => {
  assert.doesNotMatch(LOADER, /var\(--[\w-]+\s*,\s*#[0-9A-Fa-f]{3,8}\)/);
});

test("LoadingState grid is an ink wash, not a solid lattice", () => {
  assert.match(
    LOADER,
    /\.root\s*\{[^}]*linear-gradient\(\s*90deg\s*,\s*color-mix\(\s*in\s+srgb\s*,\s*var\(--(?:line|faint)\)\s+\d+%\s*,\s*transparent\s*\)/,
  );
  assert.doesNotMatch(LOADER, /linear-gradient\([^)]*var\(--amber\)/);
  assert.doesNotMatch(LOADER, /linear-gradient\([^)]*#(?:FBF8F1|F4F0E6|D4CDBB|C47A08|E39A2B)/i);
});

test(":root amber tokens remain for KEEP / LEAVE / PROMOTE", () => {
  const root = CSS.slice(CSS.indexOf(":root{"), CSS.indexOf("html{"));
  assert.match(root, /--amber:#E39A2B/);
  assert.match(root, /--amber-dim:rgba\(227,154,43,\.12\)/);
  assert.match(root, /--amber-line:rgba\(227,154,43,\.45\)/);
});
