# Shared UI components

The project uses custom React components and global CSS; there is no third-party component library.

## `components/Nav.jsx` — Nav

Shared top navigation and browser-local API-key indicator.

```jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getKey } from "@/lib/store";

export default function Nav() {
  const path = usePathname();
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => { setHasKey(!!getKey()); }, [path]);
  return (
    <nav className="topnav">
      <Link className="brand" href="/">LIVEFRAMEWORKS</Link>
      <Link href="/" className={path === "/" ? "on" : ""}>Pipeline</Link>
      <Link href="/export" className={path === "/export" ? "on" : ""}>Export</Link>
      <Link href="/settings" className={path === "/settings" ? "on" : ""}>
        <span className={"keydot" + (hasKey ? " ok" : "")}></span>API Key
      </Link>
    </nav>
  );
}
```

## `components/Chat.jsx` — Chat

Agent chat surface. Props: `fwKey` selects the framework persona; `onSatisfied` notifies the parent after a locked result changes activation.

```jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { FW, SOURCES, INTAKE } from "@/lib/frameworks";
import { getKey, getBucket, getOutput, setOutput, getActive, setActive, getChat, setChat } from "@/lib/store";
import { buildEvidenceBlock, buildUpstreamStatus, deriveActiveAgents, readEngagementState } from "@/lib/agentContext";

function agentSources(key) {
  return INTAKE.filter(s => s.readers.includes(key));
}

function buildPersona(key) {
  const f = FW[key];
  const state = readEngagementState(getBucket, getOutput);
  const active = deriveActiveAgents(state.outputs).includes(key);
  return `You are "${f.name}", a framework agent inside LiveFrameworks, a system that runs classic business frameworks as connected programs against a company's shared state. Your role name is "${f.role}". Stay in character at all times — speak in first person as this framework.

Your personality/voice: ${f.voice}
Your expertise: ${f.insight}
Your output spec: ${f.out}
Your inputs: ${f.reads.map(r => r[0] + " (from " + r[1] + ")").join("; ")}
Your tools (conceptual): ${f.tools.join(", ")}
You supply your output to: ${f.feeds.length ? f.feeds.map(d => FW[d].name).join(", ") : "the execution layer — you are the end of the pipeline"}
Your activation status: ${active ? "ONLINE — your upstream prerequisites are satisfied." : "STANDBY — your upstream prerequisites are not yet satisfied. You may still talk and preview, but be clear that your full run needs upstream work first."}

${f.checklist ? `YOUR OUTPUT SPEC — fill all nine boxes of the Business Model Canvas. Only emit [SATISFIED] after delivering a complete nine-box first pass.

` : ""}WEB ACCESS: you have a web_search tool. Use it when current external evidence improves the analysis. Cite web findings and distinguish them from user-provided evidence.

INTAKE PROTOCOL: Work with partial evidence, ask for specific missing pieces, and emit [SATISFIED] only after a credible first-pass output.

GROUNDING: Claims must trace to loaded evidence, locked upstream output, user chat, live web research, or explicitly labeled inference.

UPSTREAM AGENT STATUS:
${buildUpstreamStatus(key, state.outputs)}

LIVE EVIDENCE:
${buildEvidenceBlock(key, state.buckets, state.outputs)}`;
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
    line = `I'm on standby — satisfy ${need} first. Meanwhile, ask what I do and what I'll look for.`;
  } else if (loaded.length || ups.length) {
    line = `I can see: ${[...loaded.map(s => s.name.toLowerCase()), ...ups.map(u => FW[u].name + " output")].join(", ")}. Ask me what I see, or tell me more here.`;
  } else {
    line = `My buckets are empty. I need: ${mine.map(s => s.name.toLowerCase()).join(", ")}. Load them or answer my questions here.`;
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
        body: JSON.stringify({ apiKey: getKey(), system: buildPersona(fwKey), messages: history, web: true }),
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
        if (satisfied) {
          setOutput(fwKey, reply);
          const state = readEngagementState(getBucket, getOutput);
          state.outputs[fwKey] = reply;
          const active = getActive();
          const nextActive = deriveActiveAgents(state.outputs);
          const newly = nextActive.filter(key => !active.includes(key));
          setActive(nextActive);
          out.push({ sys: true, content: newly.length ? "⚡ AGENT SATISFIED — downstream agents are online." : "⚡ AGENT SATISFIED — first-pass output locked in." });
          if (onSatisfied) onSatisfied(newly);
        }
      }
      setLog(out); setChat(fwKey, out);
    } catch {
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
```
