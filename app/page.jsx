import { Suspense } from "react";
import { redirect } from "next/navigation";
import HomeGate from "@/components/HomeGate";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Paste a company URL and one paragraph. LiveFrameworks researches the company and auto-draws a Business Model Canvas. Chat is for arguing with that map.",
};

export default async function Landing({ searchParams }) {
  const params = await searchParams;
  const select = Array.isArray(params?.select) ? params.select[0] : params?.select;
  if (select) redirect(`/pipeline?select=${encodeURIComponent(select)}`);
  return (
    <Suspense fallback={<main className="page-loading"><p className="eyebrow">Opening engagement</p></main>}>
      <HomeGate />
    </Suspense>
  );
}
