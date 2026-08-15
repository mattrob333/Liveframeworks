"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { INTAKE } from "@/lib/frameworks";
import { getArtifact, getBucket, setBucket } from "@/lib/store";
import { getBucketAffectedFrameworks } from "@/lib/agentContext";
import { applyDemoBuckets } from "@/lib/demoPacks";
import { markDependentArtifactsStale } from "@/lib/frameworkRunClient";
import { hasHomeCanvas, resolveHomeMode } from "@/lib/homeMode";
import FirstRunHome from "@/components/FirstRunHome";
import FrameworkWorkspace from "@/components/FrameworkWorkspace";
import LoadingState from "@/components/LoadingState";

export default function HomeGate({ demoBuckets = null }) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [hasCanvas, setHasCanvas] = useState(false);

  useEffect(() => {
    // Apply before ready flips so FirstRunHome hydrates from the filled biz bucket.
    if (demoBuckets) {
      const applied = applyDemoBuckets(demoBuckets, { getBucket, setBucket });
      if (applied.ok) {
        for (const write of applied.writes) {
          if (write.previous === write.next) continue;
          const source = INTAKE.find(item => item.key === write.key);
          markDependentArtifactsStale(
            getBucketAffectedFrameworks(write.key),
            `${source.name} changed.`,
          );
        }
      }
    }
    const sync = () => setHasCanvas(hasHomeCanvas(getArtifact("bmc")));
    sync();
    setReady(true);
    window.addEventListener("lf:storage", sync);
    return () => window.removeEventListener("lf:storage", sync);
  }, [demoBuckets]);

  const wantNew = searchParams.get("new") === "1";
  const autorun = searchParams.get("autorun") === "1";
  const mode = resolveHomeMode({ ready, autorun, hasCanvas, wantNew });

  if (mode === "loading") {
    return <main className="page-loading"><LoadingState label="Opening engagement" variant="Drive" /></main>;
  }
  if (mode === "canvas") {
    return <FrameworkWorkspace id="bmc" home />;
  }
  return <FirstRunHome />;
}
