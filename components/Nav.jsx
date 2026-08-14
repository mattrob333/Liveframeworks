"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBucket, hasApiKey } from "@/lib/store";
import { companyHostname, parseBizIntake } from "@/lib/intake";

export default function Nav() {
  const path = usePathname();
  const [hasKey, setHasKey] = useState(false);
  const [hostname, setHostname] = useState("");
  useEffect(() => {
    const refresh = () => {
      setHasKey(hasApiKey());
      setHostname(companyHostname(parseBizIntake(getBucket("biz")).url));
    };
    refresh();
    window.addEventListener("lf:storage", refresh);
    return () => window.removeEventListener("lf:storage", refresh);
  }, [path]);
  return (
    <nav className="topnav" aria-label="Primary navigation">
      <Link className={"brand" + (hostname ? " brand-host" : "")} href="/">
        {hostname || "LIVEFRAMEWORKS"}
      </Link>
      <Link href="/pipeline" className={path === "/pipeline" ? "on" : ""}>Pipeline</Link>
      <Link href="/export" className={path === "/export" ? "on" : ""}>Export</Link>
      <Link
        href="/settings"
        className={"keystatus" + (path === "/settings" ? " on" : "")}
        aria-label={hasKey ? "Settings — key saved in this browser" : "Settings — no API key"}
        title={hasKey ? "Key saved in this browser" : "No API key"}
      >
        <span className={"keydot" + (hasKey ? " ok" : "")} aria-hidden="true"></span>
      </Link>
    </nav>
  );
}
