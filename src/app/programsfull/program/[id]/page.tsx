import { PublicLegacyPage } from "@/components/public-legacy-page";
import { programDetailHtml } from "@/legacy/generated/program-detail";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata("program-detail"); }
export default async function ProgramDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{type?:string}>}) {
  const [{id},{type}]=await Promise.all([params,searchParams]);const numeric=Number(id);const kind=type==="course"?"courses":"programs";
  return <PublicLegacyPage slug="program-detail" html={programDetailHtml} catalogDetail={Number.isSafeInteger(numeric)&&numeric>0?{kind,id:numeric}:undefined}/>;
}
