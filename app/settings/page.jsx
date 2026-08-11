"use client";
import { useEffect, useState } from "react";
import { getKey, setKey, resetAll } from "@/lib/store";

export default function Settings() {
  const [key, setKeyState] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { setKeyState(getKey()); }, []);

  return (
    <main>
      <header style={{ padding: "40px 0 8px" }}>
        <div className="eyebrow">Access</div>
        <h1>Bring Your Own Key</h1>
        <p className="sub">LiveFrameworks runs Claude Sonnet 5 on your Anthropic API key. The key is stored only in this browser, sent per-request to power the agents, and never saved on any server. Get a key at console.anthropic.com.</p>
      </header>

      <div className="panel mt" style={{ maxWidth: 640 }}>
        <div className="i-label">Anthropic API key</div>
        <input className="area" style={{ minHeight: 0, height: 44 }} type="password" value={key}
          onChange={e => setKeyState(e.target.value)} placeholder="sk-ant-…" />
        <div className="btnrow">
          <button className="btn primary" onClick={() => { setKey(key.trim()); setStatus("Key saved to this browser."); }}>▸ SAVE KEY</button>
          <button className="btn" onClick={() => { setKeyState(""); setKey(""); setStatus("Key removed."); }}>✕ REMOVE</button>
        </div>
        <div className={"status" + (status ? " ok" : "")}>{status || "Web-enabled agents (Cartographer, Terrain Scout, Weather Station, Moat Inspector, Map Redrawer) will also use your key for live web search."}</div>
      </div>

      <div className="panel mt" style={{ maxWidth: 640 }}>
        <div className="i-label">Danger zone</div>
        <p style={{ fontSize: 12, color: "var(--dim)" }}>Clears all buckets, agent outputs, activation state, and chats in this browser. Your API key is kept.</p>
        <div className="btnrow">
          <button className="btn" onClick={() => { if (confirm("Reset the whole engagement? This clears all evidence and outputs in this browser.")) { resetAll(); setStatus("Engagement reset."); } }}>⟲ RESET ENGAGEMENT</button>
        </div>
      </div>
    </main>
  );
}
