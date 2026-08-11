import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Classic business frameworks run as connected agents against your company's evidence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="wrap">
          <Nav />
          {children}
          <footer>
            <b>How it works:</b> load evidence into the intake buckets (or answer the Cartographer&apos;s questions in chat), satisfy the Business Model Canvas, and the downstream agents come online with the canvas as shared state. Every agent&apos;s locked output is saved and readable on its page. Export compiles the whole engagement into one snapshot. All data lives in your browser; your API key is yours and is never stored server-side.
          </footer>
        </div>
      </body>
    </html>
  );
}
