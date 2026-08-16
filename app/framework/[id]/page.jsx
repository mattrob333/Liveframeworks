import FrameworkWorkspace from "@/components/FrameworkWorkspace";
import { readSignedOrgInstalls } from "@/lib/server/orgInstall";

export default async function FrameworkPage({ params }) {
  const { id } = await params;
  return <FrameworkWorkspace id={id} orgInstalls={id === "toc" ? readSignedOrgInstalls() : {}} />;
}
