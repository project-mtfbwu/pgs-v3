const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SITE_URL","SUPABASE_SERVICE_ROLE_KEY","PREMIUM_PURCHASE_WEBHOOK_SECRET","AUTH_FLOW_SECRET","RATE_LIMIT_HASH_SECRET"];
const missing=required.filter((name)=>!process.env[name]);
if(!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy ANON key)");
const weak=["PREMIUM_PURCHASE_WEBHOOK_SECRET","AUTH_FLOW_SECRET","RATE_LIMIT_HASH_SECRET"].filter((name)=>(process.env[name]?.length??0)<32);
let siteSafe=false;try{const url=new URL(process.env.NEXT_PUBLIC_SITE_URL??"");siteSafe=url.protocol==="https:";}catch{siteSafe=false;}
if(missing.length||weak.length||!siteSafe){if(missing.length)console.error(`Missing production variables: ${missing.join(", ")}`);if(weak.length)console.error(`Secrets must be at least 32 characters: ${weak.join(", ")}`);if(!siteSafe)console.error("NEXT_PUBLIC_SITE_URL must be an HTTPS production origin.");process.exit(1);}
console.log("Production configuration gate passed");
