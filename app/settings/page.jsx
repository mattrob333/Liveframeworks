"use client";

import { useEffect, useState } from "react";
import { getKey, resetAll, setKey } from "@/lib/store";
import { clearGenerationRecords } from "@/lib/generationStore";

export default function Settings() {
  const [key, setKeyState] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { setKeyState(getKey()); }, []);

  function saveKey() {
    const result = setKey(key.trim());
    setStatus(result.ok ? "Key saved to this browser." : `Could not save the key: ${result.error}`);
  }

  return (
    <main>
      <header className="pipeline-header">
        <div className="eyebrow">Access</div>
        <h1>Bring Your Own Key</h1>
        <p className="sub">LiveFrameworks runs Claude Sonnet 5 on your Anthropic API key. The key remains in this browser and is sent only with an explicit agent request.</p>
      </header>

      <div className="panel mt settings-panel">
        <label className="i-label" htmlFor="anthropic-api-key">Anthropic API key</label>
        <input
          id="anthropic-api-key"
          className="area key-input"
          type="password"
          value={key}
          onChange={event => setKeyState(event.target.value)}
          placeholder="sk-ant-…"
        />
        <div className="btnrow">
          <button className="btn primary" onClick={saveKey}>SAVE KEY</button>
          <button className="btn" onClick={() => { setKeyState(""); setKey(""); setStatus("Key removed."); }}>REMOVE</button>
        </div>
        <div className={`status${status ? " ok" : ""}`}>{status || "Every framework run and follow-up agent can use live web research."}</div>
      </div>

      <div className="panel mt settings-panel">
        <div className="i-label">Danger zone</div>
        <p className="muted-copy">Clears all buckets, run records, artifacts, activation state, and chats in this browser. Your API key is kept.</p>
        <div className="btnrow">
          <button className="btn danger" onClick={async () => {
            if (confirm("Reset the whole engagement? This clears all evidence and artifacts in this browser.")) {
              setStatus("Resetting engagement…");
              const result = resetAll();
              if (!result.ok) {
                setStatus(result.error);
                return;
              }
              try {
                await clearGenerationRecords();
                setStatus("Engagement reset.");
              } catch (error) {
                setStatus(`Browser state was cleared, but the full run archive could not be removed: ${error?.message || "unknown error"}`);
              }
            }
          }}>RESET ENGAGEMENT</button>
        </div>
      </div>
    </main>
  );
}
