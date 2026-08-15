// Reads the fictional intake files from demo-data/. Server-only: the browser
// cannot see the filesystem. Callers still write with setBucket.

import { readFileSync } from "node:fs";
import { INTAKE } from "@/lib/frameworks";
import { DEMO_PACKS } from "@/lib/demoPacks";

// Literal URLs so the bundler / file tracer can see each pack file.
const PACK_TEXT = {
  coffee: {
    biz: readFileSync(new URL("../../demo-data/coffee/driftline-biz.md", import.meta.url), "utf8"),
    leadership: readFileSync(new URL("../../demo-data/coffee/driftline-leadership-interviews.md", import.meta.url), "utf8"),
    calls: readFileSync(new URL("../../demo-data/coffee/driftline-calls.md", import.meta.url), "utf8"),
    org: readFileSync(new URL("../../demo-data/coffee/driftline-org.md", import.meta.url), "utf8"),
  },
  "garage-doors": {
    biz: readFileSync(new URL("../../demo-data/garage-doors/ironwood-biz.md", import.meta.url), "utf8"),
    leadership: readFileSync(new URL("../../demo-data/garage-doors/ironwood-leadership-interviews.md", import.meta.url), "utf8"),
    calls: readFileSync(new URL("../../demo-data/garage-doors/ironwood-calls.md", import.meta.url), "utf8"),
    org: readFileSync(new URL("../../demo-data/garage-doors/ironwood-org.md", import.meta.url), "utf8"),
  },
  saas: {
    biz: readFileSync(new URL("../../demo-data/saas/quartermast-biz.md", import.meta.url), "utf8"),
    leadership: readFileSync(new URL("../../demo-data/saas/quartermast-leadership-interviews.md", import.meta.url), "utf8"),
    calls: readFileSync(new URL("../../demo-data/saas/quartermast-calls.md", import.meta.url), "utf8"),
    org: readFileSync(new URL("../../demo-data/saas/quartermast-org.md", import.meta.url), "utf8"),
  },
};

export function readDemoPack(packId) {
  const text = PACK_TEXT[packId];
  if (!text) return null;
  return Object.fromEntries(INTAKE.map(source => [source.key, text[source.key]]));
}
