import { Suspense } from "react";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Classic business frameworks run as connected, evidence-grounded agents.",
};

export const viewport = {
  themeColor: "#F4F0E6",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="wrap">
          <Suspense fallback={<nav className="topnav" aria-label="Primary navigation" />}>
            <Nav />
          </Suspense>
          {children}
        </div>
      </body>
    </html>
  );
}
