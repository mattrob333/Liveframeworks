"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FW, ORDER } from "@/lib/frameworks";
import { getArtifact, getBucket, setBucket, hasApiKey } from "@/lib/store";
import { artifactIsComplete, getBucketAffectedFrameworks } from "@/lib/agentContext";
import { formatBizIntake, parseBizIntake, validateBizIntake } from "@/lib/intake";
import { markDependentArtifactsStale } from "@/lib/frameworkRunClient";
import BizIntakeFields from "@/components/BizIntakeFields";

export default function FirstRunHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [status, setStatus] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [hasCanvas, setHasCanvas] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const parsed = parseBizIntake(getBucket("biz"));
      setUrl(parsed.url);
      setParagraph(parsed.paragraph);
      setHasKey(hasApiKey());
      setHasCanvas(artifactIsComplete(getArtifact("bmc"), "bmc"));
      setHydrated(true);
    };
    refresh();
    window.addEventListener("lf:storage", refresh);
    return () => window.removeEventListener("lf:storage", refresh);
  }, []);

  const validation = validateBizIntake({ url, paragraph });
  const canDraw = Boolean(hydrated && hasKey && validation.ok);

  // Save the two fields into the existing lf:bucket:biz key, then open the
  // BMC workspace with autorun=1 so the nine-box draws without a chat gate.
  function drawCanvas(event) {
    event.preventDefault();
    if (!hasKey) {
      setStatus("Add your Anthropic API key in Settings before drawing the canvas.");
      return;
    }
    if (!validation.ok) {
      setStatus(validation.error);
      return;
    }
    const formatted = formatBizIntake({ url: validation.url, paragraph: validation.paragraph });
    const previous = getBucket("biz");
    const saved = setBucket("biz", formatted);
    if (!saved.ok) {
      setStatus(`Could not save: ${saved.error}`);
      return;
    }
    if (previous !== formatted) {
      markDependentArtifactsStale(getBucketAffectedFrameworks("biz"), "Business description & URL changed.");
    }
    setStatus("");
    router.push("/framework/bmc?autorun=1");
  }

  return (
    <main className="landing">
      <header className="landing-hero">
        <div className="eyebrow">Fig. 01·A — First pass</div>
        <h1>Paste a company URL. Get a Business Model Canvas.</h1>
        <p className="landing-sub">
          One link and one paragraph is enough. The Cartographer researches the company and
          draws the nine-box map. <b>Chat is for arguing with that map</b> — it does not gate seeing it.
        </p>
      </header>

      <form className="landing-form" onSubmit={drawCanvas}>
        <BizIntakeFields
          url={url}
          paragraph={paragraph}
          onUrlChange={value => { setUrl(value); setStatus(""); }}
          onParagraphChange={value => { setParagraph(value); setStatus(""); }}
          idPrefix="first-run"
        />
        <div className="landing-cta">
          <button className="btn primary landing-open" type="submit" disabled={!canDraw}>
            DRAW THE CANVAS ▸
          </button>
          {!hasKey && (
            <p className="status warning">
              An Anthropic API key is required. <Link href="/settings">Open Settings →</Link>
            </p>
          )}
          {status && <p className="status warning" role="alert">{status}</p>}
          <p className="landing-key-note">The key stays in this browser and is sent only with this run. Downstream frameworks live in the expert pipeline.</p>
        </div>
      </form>

      <p className="landing-expert">
        {hasCanvas && <Link href="/framework/bmc">Open your canvas</Link>}
        {hasCanvas && <span aria-hidden="true"> · </span>}
        <Link href="/pipeline">Expert pipeline — {FW.bmc.icon} all {ORDER.length} agents</Link>
      </p>

      <section className="landing-steps" aria-label="How it works">
        <article className="landing-step" data-num="01">
          <h2>Point it at a company</h2>
          <p>Paste the URL and one paragraph in their own words. That is the whole first-run form — the 16-agent roster stays in the expert pipeline.</p>
        </article>
        <article className="landing-step" data-num="02">
          <h2>Watch the nine-box appear</h2>
          <p>The Cartographer researches the company and auto-draws the Business Model Canvas. You see the map as soon as it is ready — no [SATISFIED] wall.</p>
        </article>
        <article className="landing-step" data-num="03">
          <h2>Argue with the map</h2>
          <p>Chat challenges boxes, evidence, and gaps. When you want the rest of the strategy stack, open the expert pipeline.</p>
        </article>
      </section>
    </main>
  );
}
