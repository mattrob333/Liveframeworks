import Link from "next/link";
import { FW, ORDER } from "@/lib/frameworks";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "It's like hiring a strategy team for the price of a coffee. Paste your website link — AI agents research your company, your market, and your competitors, then build the strategy maps big consulting firms charge thousands for.",
};

export default function Landing() {
  return (
    <main className="landing">
      <header className="landing-hero">
        <div className="eyebrow">Fig. 01·A — Field Manual</div>
        <h1>It&apos;s like hiring a strategy team for the price of a coffee.</h1>
        <p className="landing-sub">
          Paste your website link. <b>AI agents</b> research your company, your market, and your
          competitors — then build the same strategy maps the big consulting firms charge thousands for.
        </p>
        <div className="landing-cta">
          <Link className="btn primary landing-open" href="/pipeline">OPEN THE PIPELINE ▸</Link>
          <p className="landing-key-note">Bring your own Anthropic API key — it stays in your browser and is sent only with your explicit runs.</p>
        </div>
      </header>

      <section className="landing-steps" aria-label="How it works">
        <article className="landing-step" data-num="01">
          <h2>Point it at a company</h2>
          <p>Paste the company URL and a short description in their own words. That alone starts the whole pipeline — the agents research the market, competitors, and pricing themselves.</p>
        </article>
        <article className="landing-step" data-num="02">
          <h2>Launch the Cartographer</h2>
          <p>The Business Model Canvas agent draws the map first. Watch it work in real time — every search, every source — then question its conclusions in chat. Your answers become truth for every agent downstream.</p>
        </article>
        <article className="landing-step" data-num="03">
          <h2>Let the pipeline wake up</h2>
          <p>Each validated artifact unlocks the next frameworks — industry map, five forces, VRIO, on through Theory of Constraints — until strategy is a living, evidence-backed state, not a slide deck.</p>
        </article>
      </section>

      <section className="landing-roster" aria-label="The agent roster">
        <div className="i-label">The roster — {ORDER.length} agents</div>
        <div className="landing-roster-chips">
          {ORDER.map(key => (
            <span key={key}><i>{FW[key].icon}</i> {FW[key].name}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
