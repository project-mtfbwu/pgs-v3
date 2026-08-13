export function AdminPageHeader({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:React.ReactNode}){return <header className="ops-page-header"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="ops-page-actions">{actions}</div>}</header>}

