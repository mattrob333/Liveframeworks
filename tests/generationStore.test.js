import test from "node:test";
import assert from "node:assert/strict";
import { mergeGenerationRecord } from "../lib/generationStore.js";

test("generation lifecycle patches preserve the full archived record and id", () => {
  const archived = {
    id: "run-123",
    frameworkId: "bmc",
    status: "researching",
    context: { id: "ctx-1", buckets: [{ key: "biz", content: "Full context" }] },
    research: { providerTurns: [[{ type: "text", text: "Evidence" }]] },
  };

  const updated = mergeGenerationRecord(archived, {
    id: "attempted-id-change",
    status: "interrupted",
    completedAt: "2026-08-11T12:00:00.000Z",
  });

  assert.equal(updated.id, archived.id);
  assert.equal(updated.status, "interrupted");
  assert.equal(updated.completedAt, "2026-08-11T12:00:00.000Z");
  assert.deepEqual(updated.context, archived.context);
  assert.deepEqual(updated.research, archived.research);
});
