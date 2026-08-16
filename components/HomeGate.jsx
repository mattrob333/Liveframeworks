"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getArtifact, getBucket, setBucket, clearCompanyWork } from "@/lib/store";
import { applyDemoBuckets } from "@/lib/demoPacks";
import { hasHomeCanvas, resolveHomeMode, shouldClearPriorCompany } from "@/lib/homeMode";
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
      if (
        applied.ok
        && shouldClearPriorCompany({
          bucketsChanged: applied.writes.some(write => write.previous !== write.next),
        })
      ) {
        clearCompanyWork();
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
