"use client";

import { use } from "react";
import FrameworkWorkspace from "@/components/FrameworkWorkspace";

export default function FrameworkPage(props) {
  const params = use(props.params);
  return <FrameworkWorkspace id={params?.id} />;
}
