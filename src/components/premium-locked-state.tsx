import Link from "next/link";
import { PremiumWorkspaceShell } from "@/components/premium-workspace-shell";

export function PremiumLockedState({feature,name,avatarUrl}:{feature:"dashboard"|"progress"|"documents";name:string;avatarUrl:string}){
  const heading=feature==="documents"?<>upload<br/>your<br/>docs</>:feature==="progress"?<>your<br/>custom<br/>progress<br/>board</>:<>counsellor<br/>page for<br/>students</>;
  return <PremiumWorkspaceShell name={name} avatarUrl={avatarUrl} stateKind="authenticated_standard">
    <main className="premium-locked-page"><section className="pt-5 about-section half-section overlap-height position-relative overflow-hidden mobile-doc-section"><div className="container overlap-gap-section p-0"><div className="row justify-content-md-center align-items-center"><div className="col-lg-7 d-flex gap-10 align-items-center"><h1 className="text-start text-black fnt-family fw-400 fs-50 lh-full pt-0">{heading}</h1><div className="yellow-box-style-3 w-300px position-relative"><div className="lock-box-feed"><span aria-hidden="true">🔒</span></div><div className="header-yellow-box-style-3">Important Alerts</div><ol><li>Your mentor’s alerts will appear after Premium is activated.</li></ol></div></div></div><div className="premium-access-lock"><span aria-hidden="true">🔒</span><h2 className="fnt-family">Purple Premium access is locked</h2><p>Your normal student identity remains active. This workspace unlocks automatically after a confirmed purchase or an audited staff grant.</p><Link href="/purplepremiumhome" className="btn btn-purple">Explore Purple Premium</Link></div></div></section></main>
  </PremiumWorkspaceShell>;
}
