# Shared layouts

## `app/layout.jsx` — RootLayout

Global HTML shell. Loads IBM Plex Mono, wraps every route in the centered `.wrap`, renders the shared navigation, route content, and explanatory footer.

```jsx
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
```

## `components/Nav.jsx` — Nav

Shared top navigation. Reads the browser-local key after navigation and highlights the current route.

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
