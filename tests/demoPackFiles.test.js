import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { INTAKE } from "../lib/frameworks.js";
import { DEMO_PACKS, applyDemoBuckets } from "../lib/demoPacks.js";
import { isBizIntakeReady, validateBucketSave } from "../lib/intake.js";
import { readDemoPack } from "../lib/server/demoPacks.js";

const ROOT = path.join(process.cwd(), "demo-data");

test("readDemoPack returns the four fictional files from demo-data/, not the BIC profiles", () => {
  assert.equal(readDemoPack("missing"), null);

  for (const pack of Object.values(DEMO_PACKS)) {
    const loaded = readDemoPack(pack.id);
    assert.ok(loaded, `expected to load ${pack.id}`);
    assert.deepEqual(Object.keys(loaded).sort(), INTAKE.map(source => source.key).sort());

    for (const source of INTAKE) {
      const disk = readFileSync(path.join(ROOT, pack.directory, pack.files[source.key]), "utf8");
      assert.equal(loaded[source.key], disk);
      assert.equal(validateBucketSave(source.key, loaded[source.key]).ok, true);
      assert.ok(!pack.files[source.key].includes("bic-"));
    }

    assert.equal(isBizIntakeReady(loaded.biz), true);
  }
});

test("each real pack fills all four buckets through applyDemoBuckets", () => {
  for (const pack of Object.values(DEMO_PACKS)) {
    const store = {};
    const applied = applyDemoBuckets(readDemoPack(pack.id), {
      getBucket: key => store[key] || "",
      setBucket: (key, value) => {
        store[key] = value;
        return { ok: true };
      },
    });
    assert.equal(applied.ok, true, pack.id);
    assert.equal(Object.keys(store).length, 4);
    assert.equal(isBizIntakeReady(store.biz), true);
  }
});
