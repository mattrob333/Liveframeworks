import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Classic business frameworks run as connected, evidence-grounded agents.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="wrap">
          <Nav />
          {children}
          <footer>
            <b>How it works:</b> save evidence, launch a ready framework, and let its validated structured artifact become shared state for the agents downstream. Follow-up chat can research and challenge the result but cannot silently overwrite it. Evidence, run records, research packets, and your API key remain in this browser.
          </footer>
        </div>
      </body>
    </html>
  );
}
