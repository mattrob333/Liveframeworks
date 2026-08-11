"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { STAGES, INTAKE, FW, ORDER } from "@/lib/frameworks";
import { getBucket, setBucket, getActive, getOutput } from "@/lib/store";

export default function Pipeline() {
  const [sel, setSel] = useState(null);          // selected intake key
  const [tick, setTick] = useState(0);           // re-render trigger
  const [active, setActiveState] = useState(["bmc"]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { setActiveState(getActive()); }, [tick]);
  useEffect(() => { if (sel) { setText(getBucket(sel)); setStatus(""); } }, [sel]);

  const src = sel ? INTAKE.find(s => s.key === sel) : null;

  function save() {
    setBucket(sel, text);
    setStatus("Saved. " + src.readers.map(r => FW[r].role).join(", ") + " will read this in chat.");
    setTick(t => t + 1);
  }
  async function onFiles(e) {
    let v = text;
    for (const file of [...e.target.files]) {
      const t = await file.text();
      v += (v.trim() ? "\n\n" : "") + `=== FILE: ${file.name} ===\n` + t;
    }
    setText(v); setBucket(sel, v);
    setStatus(e.target.files.length + " file(s) loaded and saved.");
    setTick(t => t + 1);
  }
  function copyTmpl() {
    navigator.clipboard.writeText(src.template).then(() => setStatus("Template copied — fill it in and paste it back."));
  }

  return (
    <main>
      <header style={{ padding: "40px 0 8px" }}>
        <div className="eyebrow">Fig. 01·B — Agent Roster</div>
        <h1>The Frameworks Are Alive Now</h1>
        <p className="sub">These used to be posterboard in a consultant&apos;s office. Run as code, each framework is a teammate: an agent with its own expertise, tools, and working documents — reading from shared state, writing back to it, and waking the agents downstream. Load evidence into the buckets, satisfy the Cartographer, and watch the roster come online.</p>
      </header>

      <div className="grid2" style={{ marginTop: 22 }}>
        <div>
          <section className="stage" data-num="00">
            <div className="stage-title">Live Intake</div>
            <div className="stage-role">Evidence buckets every agent reads — click one to see what it needs and load it</div>
            <div className="chips">
              {INTAKE.map(s => {
                const loaded = !!(getBucket(s.key) || "").trim();
                return (
                  <span key={s.key} className={"chip" + (sel === s.key ? " sel" : "")} onClick={() => setSel(sel === s.key ? null : s.key)}>
                    {s.name} <span className={"st" + (loaded ? " loaded" : "")}>{loaded ? "● LOADED" : "EMPTY"}</span>
                  </span>
                );
              })}
            </div>
            <div className="note"><b>LOAD WHAT YOU HAVE</b> — agents run on partial evidence and ask for what&apos;s missing. The Cartographer starts online; satisfy it and it wakes the rest.</div>
          </section>

          {STAGES.map(st => (
            <section key={st.key} className="stage" data-num={st.num}>
              <div className="stage-title">{st.title}</div>
              <div className="stage-role">{st.role}</div>
              <div className="nodes">
                {ORDER.filter(k => FW[k].stage === st.key).map(k => {
                  const on = active.includes(k);
                  const done = !!getOutput(k);
                  return (
                    <Link key={k} href={"/framework/" + k} className={"node" + (on ? " online" : " standby")}>
                      <div className="n-top"><span className="n-icon">{FW[k].icon}</span><span className="n-name">{FW[k].name}</span></div>
                      <div className="n-out">→ {FW[k].out}</div>
                      <div className="n-status">{on ? "ONLINE" : "STANDBY"}</div>
                      {done && <div className="n-done">▸ OUTPUT SAVED — OPEN PAGE</div>}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="note" style={{ borderTop: "1px dashed var(--amber)", paddingTop: 10 }}>↺ FEEDBACK — outputs write back to shared state · the constraint moves · the loop runs again</div>
        </div>

        <aside className="panel" style={{ position: "sticky", top: 18, maxHeight: "calc(100vh - 36px)", overflowY: "auto" }}>
          {!src ? (
            <div>
              <div className="i-label">Bucket</div>
              <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>No bucket selected.</p>
              <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>Click an intake chip to see what it carries, get the interview template, and load evidence. Click any framework card to open its dedicated page and talk to the agent.</p>
              <p style={{ fontSize: 12, color: "var(--amber)", marginTop: 8 }}>Start with Business description &amp; URL — two minutes, and the web-enabled agents take it from there.</p>
            </div>
          ) : (
            <div>
              <div className="i-sec">
                <div className="i-label">{src.name}</div>
                <p style={{ fontSize: 12.5 }}>{src.desc}</p>
                <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>{src.from}</p>
              </div>
              <div className="i-sec">
                <div className="i-label">How to get it — client interview guide</div>
                <ul>{src.guide.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
              <div className="i-sec">
                <div className="i-label">Template</div>
                <div className="tmpl">{src.template}</div>
                <div className="btnrow"><button className="btn" onClick={copyTmpl}>⧉ COPY TEMPLATE</button></div>
              </div>
              <div className="i-sec">
                <div className="i-label">Bucket contents {text.trim() ? <span style={{ color: "var(--ok)" }}>· loaded</span> : <span style={{ color: "var(--dim)" }}>· empty</span>}</div>
                <textarea className="area" value={text} onChange={e => setText(e.target.value)} placeholder="Paste the filled template, transcripts, or raw evidence here…" />
                <div className="btnrow">
                  <button className="btn primary" onClick={save}>▸ SAVE TO BUCKET</button>
                  <label>▤ UPLOAD .TXT / .MD<input type="file" accept=".txt,.md,.csv,.json" multiple onChange={onFiles} /></label>
                  <button className="btn" onClick={() => { setText(""); setBucket(sel, ""); setStatus("Bucket cleared."); setTick(t => t + 1); }}>✕ CLEAR</button>
                </div>
                <div className={"status" + (status ? " ok" : "")}>{status || "Saved evidence persists in this browser — agents read it when you chat."}</div>
              </div>
              <div className="i-sec">
                <div className="i-label">Read by these agents</div>
                <div className="linkchips">{src.readers.map(r => <Link key={r} href={"/framework/" + r}>{FW[r].icon} {FW[r].name}</Link>)}</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
