import type { Metadata } from "next";
import { CmsEditor } from "@/components/cms-editor";

export const metadata: Metadata = { title: "Proof CMS" };

export default function CmsPage() {
  return <CmsEditor />;
}
