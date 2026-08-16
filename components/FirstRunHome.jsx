"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCompanyWork, getArtifact, getBucket, getKey, setBucket, setKey } from "@/lib/store";
import { hasHomeCanvas, shouldClearPriorCompany } from "@/lib/homeMode";
import { formatBizIntake, parseBizIntake, validateBizIntake } from "@/lib/intake";
import { validateApiKey } from "@/lib/apiKey";
import BizIntakeFields from "@/components/BizIntakeFields";

export default function FirstRunHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [keyField, setKeyField] = useState("");
  const [status, setStatus] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const parsed = parseBizIntake(getBucket("biz"));
    setUrl(parsed.url);
    setParagraph(parsed.paragraph);
    setKeyField(getKey());
    setReturning(hasHomeCanvas(getArtifact("bmc")));
    setHydrated(true);
  }, []);

  const intake = validateBizIntake({ url, paragraph });
  const keyCheck = validateApiKey(keyField);
  const canDraw = Boolean(hydrated && intake.ok && keyCheck.ok);

  function drawCanvas(event) {
    event.preventDefault();
    if (!intake.ok) {
      setStatus(intake.error);
      return;
    }
    if (!keyCheck.ok) {
      setStatus(keyCheck.error);
      return;
    }
    const savedKey = setKey(keyCheck.value);
    if (!savedKey.ok) {
      setStatus(`Could not save the key: ${savedKey.error}`);
      return;
    }
    const formatted = formatBizIntake({
      ...parseBizIntake(getBucket("biz")),
      url: intake.url,
      paragraph: intake.paragraph,
    });
    if (shouldClearPriorCompany({ committingDraw: true })) {
      const cleared = clearCompanyWork();
      if (!cleared.ok) {
        setStatus(`Could not start a new company: ${cleared.error}`);
        return;
      }
    }
    const saved = setBucket("biz", formatted);
    if (!saved.ok) {
      setStatus(`Could not save: ${saved.error}`);
      return;
    }
    setStatus("");
    router.push("/?autorun=1");
  }

  return (
    <main className="landing">
      <header className="landing-hero">
        <h1>{returning ? "New company." : "Paste a company URL. Get a Business Model Canvas."}</h1>
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
        {intake.ok && (
          <div className="landing-key-field">
            <label className="i-label" htmlFor="first-run-key">Anthropic API key</label>
            <input
              id="first-run-key"
              className="area key-input"
              type="password"
              autoComplete="off"
              value={keyField}
              onChange={event => { setKeyField(event.target.value); setStatus(""); }}
              placeholder="sk-ant-…"
            />
            <p className="landing-key-note">Key stays in this browser.</p>
          </div>
        )}
        <div className="landing-cta">
          <button className="btn primary landing-open" type="submit" disabled={!canDraw}>
            Draw the canvas
          </button>
          {status && <p className="status warning" role="alert">{status}</p>}
        </div>
      </form>

      <p className="landing-expert">
        {returning && <><Link href="/">Back to the canvas</Link><span aria-hidden="true"> · </span></>}
        <Link href="/pipeline">Expert pipeline</Link>
      </p>
    </main>
  );
}
