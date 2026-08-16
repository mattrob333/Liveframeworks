import Link from "next/link";

export const metadata = {
  title: "Not found — LiveFrameworks",
  description: "That page is not in the LiveFrameworks field manual.",
};

export default function NotFound() {
  return (
    <main className="page-message not-found-page">
      <div className="eyebrow">Fig. 404 — Off the map</div>
      <h1>This page is not in the field manual.</h1>
      <p>That URL does not match a LiveFrameworks route. Head home to draw a canvas, or open the expert pipeline.</p>
      <div className="btnrow not-found-actions">
        <Link className="btn primary" href="/">DRAW A CANVAS</Link>
        <Link className="btn" href="/pipeline">EXPERT PIPELINE</Link>
      </div>
    </main>
  );
}
