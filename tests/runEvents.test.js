import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  interpretRunEvent,
  isAllowlistedRunEventType,
  RUN_EVENT_ALLOWLIST,
  runEventLine,
} from "../lib/runEvents.js";

const ALLOWLIST = [
  "phase",
  "search_query",
  "search_results",
  "writing",
  "research_complete",
  "result",
  "error",
];

const FABRICATED_TYPES = [
  "narration",
  "thinking",
  "scanning",
  "watching_the_market",
  "status",
  "log",
  "insight",
  "compiling_sources",
];

function progressTypesFrom(source) {
  return [...source.matchAll(/onProgress\?\.\(\{\s*type:\s*"([a-z_]+)"/g)].map(match => match[1]);
}

test("the allowlist is the closed set of representable run event types", () => {
  assert.deepEqual([...RUN_EVENT_ALLOWLIST], ALLOWLIST);
  assert.equal(Object.isFrozen(RUN_EVENT_ALLOWLIST), true);
  for (const type of ALLOWLIST) assert.equal(isAllowlistedRunEventType(type), true);
  for (const type of FABRICATED_TYPES) assert.equal(isAllowlistedRunEventType(type), false);
});

test("interpretRunEvent passes the raw event type through and never invents one", () => {
  const samples = [
    { type: "phase", phase: "research" },
    { type: "search_query", query: "acme competitors" },
    { type: "search_results", count: 4 },
    { type: "writing", phase: "synthesis", chars: 400 },
    { type: "research_complete", searches: 3, sources: 7 },
    { type: "result", status: "complete" },
    { type: "error", error: "failed" },
    { type: "narration", detail: "Scanning competitor filings…" },
    { type: "thinking" },
  ];

  for (const raw of samples) {
    const interpreted = interpretRunEvent(raw);
    assert.equal(interpreted.type, raw.type, `invented or remapped type for ${raw.type}`);
  }

  assert.equal(interpretRunEvent(null).type, undefined);
  assert.equal(interpretRunEvent({ detail: "Snapshotting evidence and opening the run…" }).type, undefined);
});

test("fabricated narration types cannot become a run UI line", () => {
  for (const type of FABRICATED_TYPES) {
    const interpreted = interpretRunEvent({
      type,
      detail: "Scanning competitor filings and inventing a research line…",
      query: "should not render",
    });
    assert.equal(interpreted.type, type);
    assert.equal(interpreted.detail, undefined);
    assert.equal(runEventLine(interpreted), null);
    assert.equal(runEventLine({ type, detail: "a fake research line" }), null);
  }

  assert.equal(runEventLine({ detail: "Snapshotting evidence and opening the run…" }), null);
  assert.equal(runEventLine({ detail: "Saving the validated artifact…" }), null);
  assert.equal(runEventLine({ type: "unknown", detail: "Reading the room…" }), null);
});

test("allowlisted progress events still produce honest lines from the raw type", () => {
  const phase = interpretRunEvent({ type: "phase", phase: "research" });
  assert.equal(phase.type, "phase");
  assert.equal(phase.phase, 1);
  assert.equal(runEventLine(phase), "Reading the company and planning searches…");

  const search = interpretRunEvent({ type: "search_query", query: "acme competitors" }, 0);
  assert.equal(search.type, "search_query");
  assert.equal(search.searchCount, 1);
  assert.match(runEventLine(search), /acme competitors/);

  const results = interpretRunEvent({ type: "search_results", count: 1 });
  assert.equal(results.type, "search_results");
  assert.match(runEventLine(results), /1 search result/);

  const writing = interpretRunEvent({ type: "writing", phase: "research", chars: 80 });
  assert.equal(writing.type, "writing");
  assert.match(runEventLine(writing), /evidence brief/);

  const done = interpretRunEvent({ type: "research_complete", searches: 2, sources: 5 });
  assert.equal(done.type, "research_complete");
  assert.match(runEventLine(done), /2 searches, 5 sources/);

  const result = interpretRunEvent({ type: "result", status: "complete" });
  assert.equal(result.type, "result");
  assert.equal(result.result.status, "complete");
  assert.equal(runEventLine(result), null);

  const error = interpretRunEvent({ type: "error", error: "failed" });
  assert.equal(error.type, "error");
  assert.equal(error.error, "failed");
  assert.equal(runEventLine(error), null);
});

test("the server only emits allowlisted types, and the allowlist adds no extras", () => {
  const server = readFileSync("lib/server/frameworkRun.js", "utf8");
  const route = readFileSync("app/api/framework-run/route.js", "utf8");
  const emitted = new Set([
    ...progressTypesFrom(server),
    ...[...route.matchAll(/type:\s*"(result|error)"/g)].map(match => match[1]),
  ]);

  assert.deepEqual([...emitted].sort(), [...ALLOWLIST].sort());
  for (const type of emitted) {
    assert.equal(isAllowlistedRunEventType(type), true, `${type} is emitted but not allowlisted`);
  }
  for (const type of ALLOWLIST) {
    assert.equal(emitted.has(type), true, `${type} is allowlisted but never emitted`);
  }
});

test("pipeline and workspace run logs render only through runEventLine", () => {
  const workspace = readFileSync("components/FrameworkWorkspace.jsx", "utf8");
  const pipeline = readFileSync("app/pipeline/page.jsx", "utf8");
  const client = readFileSync("lib/frameworkRunClient.js", "utf8");

  for (const source of [workspace, pipeline]) {
    assert.match(source, /runEventLine/);
    assert.match(source, /const line = runEventLine\(event\)/);
    assert.match(source, /if \(line\) setRunDetail\(line\)/);
    assert.doesNotMatch(source, /if \(detail\) setRunDetail\(detail\)/);
    assert.doesNotMatch(source, /Snapshotting evidence/);
    assert.doesNotMatch(source, /Saving the validated artifact/);
    assert.doesNotMatch(source, /setRunDetail\("[^"]+"\)/);
  }

  assert.match(client, /isAllowlistedRunEventType\(interpreted\.type\)/);
  assert.doesNotMatch(client, /Snapshotting evidence/);
  assert.doesNotMatch(client, /Saving the validated artifact/);
});
