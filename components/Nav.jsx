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
