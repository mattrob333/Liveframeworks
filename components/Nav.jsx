"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getKey } from "@/lib/store";

export default function Nav() {
  const path = usePathname();
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    const refresh = () => setHasKey(Boolean(getKey()));
    refresh();
    window.addEventListener("lf:storage", refresh);
    return () => window.removeEventListener("lf:storage", refresh);
  }, [path]);
  return (
    <nav className="topnav" aria-label="Primary navigation">
      <Link className="brand" href="/">LIVEFRAMEWORKS</Link>
      <Link href="/pipeline" className={path === "/pipeline" ? "on" : ""}>Pipeline</Link>
      <Link href="/export" className={path === "/export" ? "on" : ""}>Export</Link>
      <Link href="/settings" className={path === "/settings" ? "on" : ""}>
        <span className={"keydot" + (hasKey ? " ok" : "")}></span>API Key
      </Link>
    </nav>
  );
}
