"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { FW, SOURCES, INTAKE } from "@/lib/frameworks";
import { getActive, getOutput, getBucket } from "@/lib/store";
import Chat from "@/components/Chat";

const BMC_CELLS = [
  ["bmc-kp", "1 · Key Partnerships", "Who are our key partners and suppliers? Which key resources do we source from them?"],
  ["bmc-ka", "2 · Key Activities", "What key activities does the value proposition require?"],
  ["bmc-kr", "3 · Key Resources", "Physical, intellectual, human, financial."],
  ["bmc-vp", "4 · Value Propositions", "What value do we deliver? Which problems are we solving?"],
  ["bmc-cr", "5 · Customer Relationships", "Personal, self-service, automated, community, co-creation."],
  ["bmc-ch", "6 · Channels", "Awareness, evaluation, purchase, delivery, after-sales."],
  ["bmc-cs", "7 · Customer Segments", "For whom are we creating value? Who pays the bills?"],
  ["bmc-cost", "8 · Cost Structure", "Most important costs. Cost-driven vs. value-driven."],
  ["bmc-rev", "9 · Revenue Streams", "Asset sale, subscription, licensing, brokerage."],
];

export default function FrameworkPage({ params }) {
  const { id } = use(params);
  const f = FW[id];
  const [active, setActive] = useState(["bmc"]);
  const [output, setOutput] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => { setActive(getActive()); setOutput(getOutput(id)); }, [id, tick]);

  if (!f) return <main style={{ padding: "60px 0" }}><h1>Unknown framework</h1><p className="sub"><Link href="/">← back to the pipeline</Link></p></main>;

  const on = active.includes(id);
  const myBuckets = INTAKE.filter(s => s.readers.includes(id));

  return (
    <main>
      <header style={{ padding: "34px 0 8px" }}>
        <div className="eyebrow">Framework Agent · {on ? "● ONLINE" : "○ STANDBY"}</div>
        <h1><span style={{ color: "var(--amber)" }}>{f.icon}</span> {f.name}</h1>
        <p className="sub" style={{ color: "var(--amber)" }}>{f.role}</p>
      </header>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div>
          <div className="voice">{f.voice}</div>

          {id === "bmc" && (
            <div className="panel mt">
              <div className="i-label">Template — nine blocks · Osterwalder &amp; Pigneur, 2010</div>
              <div className="bmc-grid">
                {BMC_CELLS.map(([cls, t, d]) => (
                  <div key={cls} className={"bmc-cell " + cls}><div className="t">{t}</div><div className="d">{d}</div></div>
                ))}
              </div>
            </div>
          )}

          <div className="panel mt">
            <div className="i-sec">
              <div className="i-label">Reads (inputs)</div>
              <ul>{f.reads.map((r, i) => <li key={i}>{r[0]} <span style={{ color: "var(--dim)" }}>· {r[1]}</span></li>)}</ul>
            </div>
            <div className="i-sec">
              <div className="i-label">Evidence buckets it reads</div>
              <div className="linkchips">
                {myBuckets.map(s => {
                  const loaded = !!(getBucket(s.key) || "").trim();
                  return <Link key={s.key} href="/" className={loaded ? "" : "off"}>▤ {s.name} {loaded ? "· loaded" : "· empty"}</Link>;
                })}
              </div>
            </div>
            <div className="i-sec">
              <div className="i-label">Tool calls</div>
              <div className="toolchips">{f.tools.map(t => <span key={t}>{t}</span>)}</div>
            </div>
            <div className="i-sec">
              <div className="i-label">Working documents</div>
              <div className="docchips">{f.docs.map(d => <span key={d}>{d}</span>)}</div>
            </div>
            <div className="i-sec">
              <div className="i-label">Insight produced</div>
              <div className="i-insight">{f.insight}</div>
            </div>
            <div className="i-sec">
              <div className="i-label">Supplied by</div>
              <div className="linkchips">
                {SOURCES[id].length
                  ? SOURCES[id].map(u => <Link key={u} href={"/framework/" + u}>{FW[u].icon} {FW[u].name}{getOutput(u) ? " · output ✓" : " · not run"}</Link>)
                  : <span style={{ fontSize: 11, color: "var(--dim)" }}>Intake buckets only</span>}
              </div>
            </div>
            <div className="i-sec">
              <div className="i-label">Wakes these agents</div>
              <div className="linkchips">
                {f.feeds.length
                  ? f.feeds.map(d => <Link key={d} href={"/framework/" + d}>{FW[d].icon} {FW[d].name}</Link>)
                  : <span style={{ fontSize: 11, color: "var(--dim)" }}>End of pipeline → work executes → loop runs again</span>}
              </div>
            </div>
          </div>

          <div className="panel mt">
            <div className="i-label">Locked first-pass output</div>
            {output
              ? <div className="output">{output}</div>
              : <p style={{ fontSize: 12, color: "var(--dim)" }}>Nothing locked yet. Work with the agent in chat until it declares itself satisfied — its first-pass output will be saved here and passed downstream.</p>}
          </div>
        </div>

        <div>
          <div className="i-label" style={{ marginBottom: 8 }}>Talk to {f.role}</div>
          <Chat fwKey={id} onSatisfied={() => setTick(t => t + 1)} />
          <p className="note" style={{ marginTop: 10 }}>The agent only claims what it can trace to loaded evidence, upstream outputs, this chat, or a live web search — everything else is labeled as its inference. Your answers here count as evidence.</p>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 28 }}><Link href="/" style={{ color: "var(--amber)" }}>← back to the pipeline</Link></p>
    </main>
  );
}
