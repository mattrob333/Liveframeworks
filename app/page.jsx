import { Suspense } from "react";
import { redirect } from "next/navigation";
import HomeGate from "@/components/HomeGate";
import { loadDemoBucketsForSlug } from "@/lib/server/demoPacks";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Paste a company URL and one paragraph. LiveFrameworks researches the company and auto-draws a Business Model Canvas. Chat is for arguing with that map.",
};

export default async function Landing({ searchParams }) {
  const params = await searchParams;
  const select = Array.isArray(params?.select) ? params.select[0] : params?.select;
  if (select) redirect(`/pipeline?select=${encodeURIComponent(select)}`);

  // Quiet dev load: /?demo=driftline fills lf:bucket:* and adds no chrome.
  // Unknown slugs no-op (no first-run message — that would be new surface).
  const demoSlug = Array.isArray(params?.demo) ? params.demo[0] : params?.demo;
  const demoBuckets = loadDemoBucketsForSlug(demoSlug);

  return (
    <Suspense fallback={<main className="page-loading"><p className="eyebrow">Opening engagement</p></main>}>
      <HomeGate demoBuckets={demoBuckets} />
    </Suspense>
  );
}
