import test from "node:test";
import assert from "node:assert/strict";
import { INTAKE } from "../lib/frameworks.js";
import { DEMO_PACKS, applyDemoBuckets, resolveDemoPack } from "../lib/demoPacks.js";

test("demo packs cover the three fictional companies and the four intake keys", () => {
  assert.deepEqual(Object.keys(DEMO_PACKS).sort(), ["coffee", "garage-doors", "saas"]);
  for (const pack of Object.values(DEMO_PACKS)) {
    assert.deepEqual(Object.keys(pack.files).sort(), INTAKE.map(source => source.key).sort());
    for (const source of INTAKE) {
      assert.ok(pack.files[source.key].startsWith(`${pack.company}-`));
      assert.ok(!pack.files[source.key].startsWith("bic-"));
    }
  }
});

test("demo slugs resolve like PRODUCT's driftline example, plus folder aliases", () => {
  assert.deepEqual(resolveDemoPack(""), { kind: "none" });
  assert.deepEqual(resolveDemoPack(undefined), { kind: "none" });
  assert.deepEqual(resolveDemoPack("   "), { kind: "none" });

  const driftline = resolveDemoPack("driftline");
  assert.equal(driftline.kind, "pack");
  assert.equal(driftline.id, "coffee");
  assert.equal(resolveDemoPack("coffee").id, "coffee");
  assert.equal(resolveDemoPack(" Driftline ").id, "coffee");

  assert.equal(resolveDemoPack("ironwood").id, "garage-doors");
  assert.equal(resolveDemoPack("garage-doors").id, "garage-doors");

  assert.equal(resolveDemoPack("quartermast").id, "saas");
  assert.equal(resolveDemoPack("saas").id, "saas");

  assert.deepEqual(resolveDemoPack("not-a-pack"), { kind: "unknown", slug: "not-a-pack" });
  assert.deepEqual(resolveDemoPack(["driftline", "saas"]).id, "coffee");
});

test("applyDemoBuckets writes all four keys through setBucket and refuses a partial pack", () => {
  const store = {};
  const getBucket = key => store[key] || "";
  const setBucket = (key, value) => {
    store[key] = value;
    return { ok: true };
  };

  const full = Object.fromEntries(INTAKE.map(source => [source.key, `${source.key} evidence`]));
  full.biz = "Website URL: https://driftline.example\nIn their own words, what the business does: We roast coffee.";

  assert.equal(applyDemoBuckets(null, { getBucket, setBucket }).ok, false);
  assert.equal(applyDemoBuckets({ biz: full.biz }, { getBucket, setBucket }).ok, false);
  assert.deepEqual(store, {});

  const applied = applyDemoBuckets(full, { getBucket, setBucket });
  assert.equal(applied.ok, true);
  assert.equal(applied.writes.length, 4);
  for (const source of INTAKE) {
    assert.equal(store[source.key], full[source.key]);
  }
});
