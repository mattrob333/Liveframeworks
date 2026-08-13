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
            <b>How it works:</b> paste a company URL and one paragraph on the home page to auto-draw a Business Model Canvas. Chat argues with that map; it does not gate it. The expert pipeline still launches the rest of the roster. Follow-up chat cannot silently overwrite a locked artifact. Evidence, run records, research packets, and your API key remain in this browser.
          </footer>
        </div>
      </body>
    </html>
  );
}
