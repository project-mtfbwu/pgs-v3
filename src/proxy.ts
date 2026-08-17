import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const legacyControllers: Record<string, string> = {
  about: "/about", change_password: "/change_password", contact: "/contact",
  countriesaus: "/countriesaus", countriescanada: "/countriescanada", countrieseurope: "/countrieseurope",
  countriesfrance: "/countriesfrance", countriesgermany: "/countriesgermany", countriesmauritius: "/countriesmauritius",
  countriesnz: "/countriesnz", countriesothers: "/countriesothers", countriesuk: "/countriesuk", countriesusa: "/countriesusa",
  cvreadyprogram: "/cvreadyprogram", error_404: "/error_404", explorecountries: "/explorecountries", finance: "/finance",
  dashboard: "/dashboard", feed_track_progress: "/feed_track_progress", upload_your_doc: "/upload_your_doc",
  forgot_password: "/forgot_password", home: "/", login: "/login", programsfull: "/programsfull", purpleamc: "/purpleamc",
  purpleboard: "/purpleboard", purpleevents: "/purpleevents", purplenonmedical: "/purplenonmedical", purpleplab: "/purpleplab",
  purplepremiumhome: "/purplepremiumhome", purpleusme: "/purpleusme", reset_password: "/reset_password", saved: "/saved",
  scholarship: "/scholarship", simplehome: "/simplehome", singup: "/singup", studentresources: "/studentresources",
  unitieup: "/unitieup", usmlerotation: "/usmlerotation", notifications: "/notifications"
};

const exactLegacyRoutes: Record<string, string> = {
  "/home/user_dashboard": "/student/dashboard", "/home/defaultdashboard": "/student/dashboard",
  "/home/user_profile": "/student/profile", "/home/apply_purplepremium": "/purplepremiumhome",
  "/login/logout": "/logout", "/home/update_profile": "/api/student/profile", "/login/login": "/login", "/login/register": "/login",
  "/forgot_password/forgot_password": "/forgot_password", "/reset_password/reset_password": "/reset_password",
  "/change_password/change_password": "/change_password", "/singup/singup": "/singup",
  "/cvreadyprogram/toggle_save": "/saved", "/saved/toggle_save": "/saved", "/saved/toggle_save_course": "/saved",
  "/notifications/open": "/notifications", "/notifications/delete": "/notifications",
  "/googlelogins/index": "/auth/google", "/googlelogins/googlelogin": "/auth/google", "/googlelogins/googlecallback": "/auth/callback",
  "/saved/index": "/saved", "/notifications/clear_all": "/notifications",
  "/purplepremiumhome/purplepremiumhome": "/purplepremiumhome", "/purplepremium_offer/data": "/purplepremiumhome"
};

// Feed, progress, and document routes intentionally expose anonymous locked frames;
// the underlying resources remain independently protected by server Auth/RLS.
const protectedPaths = ["/student", "/saved", "/notifications", "/singup", "/change_password", "/dashboard", "/mentor", "/admin", "/ops", "/cms"];
const anonymousPreviewPaths = new Set(["/student/dashboard"]);

function isOperationsPath(pathname: string): boolean {
  return pathname === "/ops" || pathname.startsWith("/ops/");
}

function canonicalOperationsPath(pathname: string): string | null {
  if (pathname === "/admin") return "/ops";
  if (pathname === "/admin/students" || pathname.startsWith("/admin/students/")) {
    return pathname.replace(/^\/admin\/students/, "/ops/students");
  }
  if (pathname === "/admin/work") return "/ops/work";
  if (pathname === "/admin/staff" || pathname.startsWith("/admin/staff/")) {
    return pathname.replace(/^\/admin\/staff/, "/ops/team");
  }
  if (pathname === "/admin/notifications") return "/ops/notifications";
  if (pathname === "/admin/audit") return "/ops/activity";
  return null;
}

function legacyDestination(request: NextRequest): URL | null {
  if (request.nextUrl.pathname.toLowerCase() === "/home/purplepremium_overview") return null;
  if (/^\/Notifications\/(?:open|delete)(?:\/|$)/i.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone(); url.pathname = "/notifications"; return url;
  }
  if (/^\/(?:Saved\/(?:toggle_save|toggle_save_course)|Cvreadyprogram\/toggle_save)(?:\/|$)/i.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone(); url.pathname = "/saved"; return url;
  }
  const exact = exactLegacyRoutes[request.nextUrl.pathname.toLowerCase()];
  if (exact) { const url = request.nextUrl.clone(); url.pathname = exact; return url; }
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  if (segments[0]?.toLowerCase() === "preview" && segments[1] && segments[2]) {
    const kind = segments[1].toLowerCase();
    if (kind === "event" || kind === "course") {
      const url = request.nextUrl.clone();
      url.pathname = kind === "event" ? `/purpleevents/session/${segments[2]}` : `/programsfull/program/${segments[2]}`;
      return url;
    }
  }
  const destination = segments[0] ? legacyControllers[segments[0].toLowerCase()] : undefined;
  if (!destination) return null;
  const rest = segments.slice(1).filter((segment, index) => !(index === 0 && segment === "index"));
  const url = request.nextUrl.clone();
  const targetPath = destination === "/" ? `/${rest.join("/")}` : `${destination}${rest.length ? `/${rest.join("/")}` : ""}`;
  if (request.nextUrl.pathname === targetPath) return null;
  url.pathname = targetPath;
  return url;
}

export async function proxy(request: NextRequest) {
  const operationsPath = canonicalOperationsPath(request.nextUrl.pathname);
  if (operationsPath) {
    const operations = request.nextUrl.clone();
    operations.pathname = operationsPath;
    return NextResponse.redirect(operations, 308);
  }

  const destination = legacyDestination(request);
  if (destination) return NextResponse.redirect(destination, 308);

  if (request.nextUrl.pathname.startsWith("/api/") && !["GET","HEAD","OPTIONS"].includes(request.method)
    && request.cookies.get("pgs_staff_preview")?.value
    && request.nextUrl.pathname !== "/api/staff/preview"
    && !request.nextUrl.pathname.startsWith("/api/auth/")
    ) {
    return NextResponse.json({ ok: false, message: "Preview is read-only. Exit preview to make changes." }, { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith("/api/") && !["GET","HEAD","OPTIONS"].includes(request.method)
    ) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const forwardedHost=request.headers.get("x-forwarded-host")??request.headers.get("host");
    const forwardedProtocol=request.headers.get("x-forwarded-proto")??request.nextUrl.protocol.replace(":","");
    const trustedOrigins=new Set([request.nextUrl.origin,forwardedHost?`${forwardedProtocol}://${forwardedHost}`:""]);
    try{if(process.env.NEXT_PUBLIC_SITE_URL)trustedOrigins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);}catch{/* Invalid deployment URL is rejected by config:check. */}
    if (fetchSite === "cross-site" || (origin && fetchSite!=="same-origin"&&!trustedOrigins.has(origin))) {
      return NextResponse.json({ ok: false, message: "Cross-site mutation denied." }, { status: 403 });
    }
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let authenticated = false;
  if (url && key) {
    const supabase = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      }
    } });
    const { data } = await supabase.auth.getClaims();
    authenticated = Boolean(data?.claims?.sub);
  }
  if (!authenticated
    && !anonymousPreviewPaths.has(request.nextUrl.pathname.toLowerCase())
    && protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) {
    const login = request.nextUrl.clone(); login.pathname = "/login";
    const redirectPath = request.nextUrl.pathname + request.nextUrl.search;
    login.search = "";
    login.searchParams.set("redirect", redirectPath);
    if (
      isOperationsPath(request.nextUrl.pathname)
      || request.nextUrl.pathname === "/admin"
      || request.nextUrl.pathname.startsWith("/admin/")
    ) {
      login.searchParams.set("surface", "operations");
    }
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.png|assets/|pgs_admin/).*)"] };
