import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { programDetailHtml } from "@/legacy/generated/program-detail";

export const metadata: Metadata = { title: "Program Details" };
export default async function ProgramDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{type?:string}>}) {
  const [{id},{type}]=await Promise.all([params,searchParams]);const numeric=Number(id);const kind=type==="course"?"courses":"programs";
  return <PublicLegacyPage slug="program-detail" html={programDetailHtml} catalogDetail={Number.isSafeInteger(numeric)&&numeric>0?{kind,id:numeric}:undefined}/>;
}
