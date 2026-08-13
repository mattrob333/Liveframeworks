import { redirect } from "next/navigation";
import FirstRunHome from "@/components/FirstRunHome";

export const metadata = {
  title: "LiveFrameworks — The Frameworks Are Alive Now",
  description: "Paste a company URL and one paragraph. LiveFrameworks researches the company and auto-draws a Business Model Canvas. Chat is for arguing with that map.",
};

export default async function Landing({ searchParams }) {
  const params = await searchParams;
  const select = Array.isArray(params?.select) ? params.select[0] : params?.select;
  if (select) redirect(`/pipeline?select=${encodeURIComponent(select)}`);
  return <FirstRunHome />;
}
