"use client";
import { useEffect, useRef, useState } from "react";
import { FW, SOURCES, INTAKE } from "@/lib/frameworks";
import { getKey, getBucket, getOutput, setOutput, getActive, setActive, getChat, setChat } from "@/lib/store";

function agentSources(key) {
  return INTAKE.filter(s => s.readers.includes(key));
}

function evidenceBlock(key) {
  const parts = [];
  agentSources(key).forEach(s => {
    const v = (getBucket(s.key) || "").trim();
    if (v) parts.push(`--- BUCKET: ${s.name} ---\n${v.length > 6000 ? v.slice(0, 6000) + "\n[...truncated]" : v}`);
  });
  SOURCES[key].forEach(u => {
    const v = (getOutput(u) || "").trim();
    if (v) parts.push(`--- UPSTREAM AGENT OUTPUT: ${FW[u].name} (${FW[u].role}) — locked first-pass output, treat as shared state ---\n${v.length > 5000 ? v.slice(0, 5000) + "\n[...truncated]" : v}`);
  });
  return parts.length ? parts.join("\n\n") : "No evidence buckets are loaded and no upstream agent outputs exist yet.";
}

function upstreamStatus(key) {
  if (!SOURCES[key].length) return "You have no upstream agents — you are fed by intake buckets only.";
  return SOURCES[key].map(u =>
    `${FW[u].name} (${FW[u].role}): ${getOutput(u) ? "OUTPUT PRESENT — included in evidence below" : "NOT RUN — has produced NOTHING. It does not exist as evidence."}`
  ).join("\n");
}

function buildPersona(key) {
  const f = FW[key];
  const active = getActive().includes(key);
  return `You are "${f.name}", a framework agent inside LiveFrameworks, a system that runs classic business frameworks as connected programs against a company's shared state. Your role name is "${f.role}". Stay in character at all times — speak in first person as this framework.

Your personality/voice: ${f.voice}
Your expertise: ${f.insight}
Your output spec: ${f.out}
Your inputs: ${f.reads.map(r => r[0] + " (from " + r[1] + ")").join("; ")}
Your tools (conceptual): ${f.tools.join(", ")}
You supply your output to: ${f.feeds.length ? f.feeds.map(d => FW[d].name).join(", ") : "the execution layer — you are the end of the pipeline"}
Your activation status: ${active ? "ONLINE — your upstream prerequisites are satisfied." : "STANDBY — your upstream prerequisites are not yet satisfied. You may still talk, explain what you do, and preview what you'd examine, but be clear that your full run needs upstream work first (name which agent), e.g. 'finish the Business Model Canvas and I can give you a real read.'"}

${f.checklist ? `YOUR OUTPUT SPEC — you are filling the nine boxes of the Business Model Canvas: (1) Customer Segments (2) Value Propositions (3) Channels (4) Customer Relationships (5) Revenue Streams (6) Key Resources (7) Key Activities (8) Key Partners (9) Cost Structure. Treat every piece of evidence and every user answer as material for specific boxes. When reporting status, list which boxes are covered and which are missing. Only emit [SATISFIED] when all nine have a credible first-pass entry — and immediately before the token, deliver the complete nine-box canvas in plain text.

` : ""}${f.web ? `WEB ACCESS: you have a web_search tool. If a company URL is in your evidence, use the web to research the company, its market, and its competitors before claiming evidence is missing. Cite what you found.

` : ""}INTAKE PROTOCOL: You are also running intake. Work with whatever evidence exists — partial is fine. If what you have is not enough for a credible first pass of your output, ask the user for the SPECIFIC missing pieces (their chat answers count as evidence). Once you have enough, deliver a concise first-pass output in the chat, then end your reply with this exact token on its own final line: [SATISFIED]
Never output [SATISFIED] before you have genuinely delivered a first-pass output.

GROUNDING — NON-NEGOTIABLE: Every factual claim must trace to exactly one of: (a) a loaded evidence bucket below, (b) an upstream agent output explicitly included below, (c) something the user told you in this chat, (d) a web search you actually performed this conversation, or (e) your own reasoning — which you MUST label as inference ("my read is", "I would expect"), never as a finding. NEVER cite, quote, or attribute any signal, score, or finding to an agent listed as NOT RUN below — they have produced nothing; speaking as if they have is fabrication. If evidence doesn't exist, say so plainly and name which agent or bucket would produce it.

Rules: sharp, direct, useful — a seasoned specialist, slightly opinionated, never corporate. Under 150 words unless asked for a full analysis. Plain text, no markdown. Point cross-domain questions to the right agent.

UPSTREAM AGENT STATUS (what actually exists right now):
${upstreamStatus(key)}

LIVE EVIDENCE (buckets you read + upstream outputs, as currently loaded):
${evidenceBlock(key)}`;
}

function greeting(key) {
  const f = FW[key];
  const mine = agentSources(key);
  const loaded = mine.filter(s => (getBucket(s.key) || "").trim());
  const ups = SOURCES[key].filter(u => getOutput(u));
  const active = getActive().includes(key);
  let line;
  if (!active) {
    const need = SOURCES[key].map(u => FW[u].role).join(", ");
    line = `I'm on standby — my upstream work isn't done yet. Satisfy ${need} first and I can give you a real read. Meanwhile, ask me what I do and what I'll look for.`;
  } else if (loaded.length || ups.length) {
    line = `I can see: ${[...loaded.map(s => s.name.toLowerCase()), ...ups.map(u => FW[u].name + " output")].join(", ")}. Ask me what I see, or tell me more right here — your answers count as evidence.`;
  } else {
    line = `My buckets are empty. I need: ${mine.map(s => s.name.toLowerCase()).join(", ")}. Load them from the pipeline page, or just answer my questions here.`;
  }
  return `${f.voice}\n\n${line}`;
}

export default function Chat({ fwKey, onSatisfied }) {
  const f = FW[fwKey];
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const msgsRef = useRef(null);

  useEffect(() => {
    let l = getChat(fwKey);
    if (!l.length) { l = [{ role: "assistant", content: greeting(fwKey) }]; setChat(fwKey, l); }
    setLog(l);
  }, [fwKey]);

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [log, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...log, { role: "user", content: text }];
    setLog(next); setChat(fwKey, next); setBusy(true);
    try {
      const history = next.filter(m => !m.sys).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: getKey(), system: buildPersona(fwKey), messages: history, web: !!f.web }),
      });
      const data = await res.json();
      let out = [...next];
      if (data.error) {
        out.push({ role: "assistant", content: "(" + data.error + ")" });
      } else {
        let reply = data.text || "(no response — try again)";
        const satisfied = reply.includes("[SATISFIED]");
        reply = reply.replace(/\[SATISFIED\]/g, "").trim();
        out.push({ role: "assistant", content: reply });
        if (reply.length >= 120) setOutput(fwKey, reply);
        if (satisfied) {
          setOutput(fwKey, reply);
          const active = getActive();
          const newly = f.feeds.filter(d => !active.includes(d));
          if (newly.length) {
            setActive([...active, ...newly]);
            out.push({ sys: true, content: "⚡ " + f.role.toUpperCase() + " IS SATISFIED — WAKING: " + newly.map(n => FW[n].name).join(" · ") + ". They're online in the pipeline now." });
          } else {
            out.push({ sys: true, content: "⚡ " + f.role.toUpperCase() + " IS SATISFIED — first-pass output locked in." });
          }
          if (onSatisfied) onSatisfied(newly);
        }
      }
      setLog(out); setChat(fwKey, out);
    } catch (e) {
      const out = [...next, { role: "assistant", content: "(connection issue — try again in a moment)" }];
      setLog(out); setChat(fwKey, out);
    }
    setBusy(false);
  }

  return (
    <div className="chat">
      <div className="chat-msgs" ref={msgsRef}>
        {log.map((m, i) => m.sys
          ? <div key={i} className="msg sys">{m.content}</div>
          : <div key={i} className={"msg " + (m.role === "assistant" ? "agent" : "user")}>
              <span className="who">{m.role === "assistant" ? f.role.toUpperCase() : "YOU"}</span>{m.content}
            </div>)}
        {busy && <div className="msg thinking">{f.role} is thinking…</div>}
      </div>
      <div className="chat-input">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={"Ask " + f.name + "…"} />
        <button onClick={send}>SEND ▸</button>
      </div>
    </div>
  );
}
