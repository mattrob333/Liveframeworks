import FrameworkWorkspace from "@/components/FrameworkWorkspace";
import { readSignedOrgInstall } from "@/lib/server/orgInstall";

export default async function FrameworkPage({ params }) {
  const { id } = await params;
  return <FrameworkWorkspace id={id} orgInstall={id === "toc" ? readSignedOrgInstall() : ""} />;
}
