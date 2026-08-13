import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const legacyControllers: Record<string, string> = {
  About: "/about", Change_password: "/change_password", Contact: "/contact",
  Countriesaus: "/countriesaus", Countriescanada: "/countriescanada", Countrieseurope: "/countrieseurope",
  Countriesfrance: "/countriesfrance", Countriesgermany: "/countriesgermany", Countriesmauritius: "/countriesmauritius",
  Countriesnz: "/countriesnz", Countriesothers: "/countriesothers", Countriesuk: "/countriesuk", Countriesusa: "/countriesusa",
  Cvreadyprogram: "/cvreadyprogram", Error_404: "/error_404", Explorecountries: "/explorecountries", Finance: "/finance",
  Dashboard: "/dashboard", Feed_track_progress: "/feed_track_progress", Upload_your_doc: "/upload_your_doc",
  Forgot_password: "/forgot_password", Home: "/", Login: "/login", Programsfull: "/programsfull", Purpleamc: "/purpleamc",
  Purpleboard: "/purpleboard", Purpleevents: "/purpleevents", Purplenonmedical: "/purplenonmedical", Purpleplab: "/purpleplab",
  Purplepremiumhome: "/purplepremiumhome", Purpleusme: "/purpleusme", Reset_password: "/reset_password", Saved: "/saved",
  Scholarship: "/scholarship", Simplehome: "/simplehome", Singup: "/singup", Studentresources: "/studentresources",
  Unitieup: "/unitieup", Usmlerotation: "/usmlerotation", Notifications: "/notifications"
};

const exactLegacyRoutes: Record<string, string> = {
  "/Home/user_dashboard": "/student/dashboard", "/Home/defaultDashboard": "/student/dashboard",
  "/Home/user_profile": "/student/profile", "/Login/logout": "/logout",
  "/Home/update_profile": "/api/student/profile", "/Login/login": "/login", "/Login/register": "/login",
  "/Forgot_password/forgot_password": "/forgot_password", "/Reset_password/reset_password": "/reset_password",
  "/Change_password/change_password": "/change_password", "/Singup/singup": "/singup",
  "/Cvreadyprogram/toggle_save": "/saved", "/Saved/toggle_save": "/saved", "/Saved/toggle_save_course": "/saved",
  "/Notifications/open": "/notifications", "/Notifications/delete": "/notifications",
  "/Googlelogins/index": "/auth/google", "/Googlelogins/googleLogin": "/auth/google", "/Googlelogins/googleCallback": "/auth/callback",
  "/Saved/index": "/saved", "/Notifications/clear_all": "/notifications"
};

const protectedPaths = ["/student", "/saved", "/notifications", "/singup", "/change_password", "/dashboard", "/feed_track_progress", "/upload_your_doc", "/mentor"];

function legacyDestination(request: NextRequest): URL | null {
  if (/^\/Notifications\/(?:open|delete)(?:\/|$)/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone(); url.pathname = "/notifications"; return url;
  }
  if (/^\/(?:Saved\/(?:toggle_save|toggle_save_course)|Cvreadyprogram\/toggle_save)(?:\/|$)/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone(); url.pathname = "/saved"; return url;
  }
  const exact = exactLegacyRoutes[request.nextUrl.pathname];
  if (exact) { const url = request.nextUrl.clone(); url.pathname = exact; return url; }
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const destination = segments[0] ? legacyControllers[segments[0]] : undefined;
  if (!destination) return null;
  const rest = segments.slice(1).filter((segment, index) => !(index === 0 && segment === "index"));
  const url = request.nextUrl.clone();
  url.pathname = destination === "/" ? `/${rest.join("/")}` : `${destination}${rest.length ? `/${rest.join("/")}` : ""}`;
  return url;
}

export async function proxy(request: NextRequest) {
  const destination = legacyDestination(request);
  if (destination) return NextResponse.redirect(destination, 308);

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
    const { data } = await supabase.auth.getUser();
    authenticated = Boolean(data.user);
  }
  if (!authenticated && protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) {
    const login = request.nextUrl.clone(); login.pathname = "/login";
    login.search = `?redirect=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.png|assets/|pgs_admin/).*)"] };
