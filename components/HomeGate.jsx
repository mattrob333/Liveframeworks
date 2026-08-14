"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getArtifact } from "@/lib/store";
import { artifactIsComplete } from "@/lib/agentContext";
import { resolveHomeMode } from "@/lib/homeMode";
import FirstRunHome from "@/components/FirstRunHome";
import FrameworkWorkspace from "@/components/FrameworkWorkspace";
import LoadingState from "@/components/LoadingState";

export default function HomeGate() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [hasCanvas, setHasCanvas] = useState(false);

  useEffect(() => {
    const sync = () => setHasCanvas(artifactIsComplete(getArtifact("bmc"), "bmc"));
    sync();
    setReady(true);
    window.addEventListener("lf:storage", sync);
    return () => window.removeEventListener("lf:storage", sync);
  }, []);

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
