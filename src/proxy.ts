import { NextResponse, type NextRequest } from "next/server";

const legacyControllers: Record<string, string> = {
  About: "/about",
  Change_password: "/change_password",
  Contact: "/contact",
  Countriesaus: "/countriesaus",
  Countriescanada: "/countriescanada",
  Countrieseurope: "/countrieseurope",
  Countriesfrance: "/countriesfrance",
  Countriesgermany: "/countriesgermany",
  Countriesmauritius: "/countriesmauritius",
  Countriesnz: "/countriesnz",
  Countriesothers: "/countriesothers",
  Countriesuk: "/countriesuk",
  Countriesusa: "/countriesusa",
  Cvreadyprogram: "/cvreadyprogram",
  Error_404: "/error_404",
  Explorecountries: "/explorecountries",
  Finance: "/finance",
  Forgot_password: "/forgot_password",
  Home: "/",
  Login: "/login",
  Programsfull: "/programsfull",
  Purpleamc: "/purpleamc",
  Purpleboard: "/purpleboard",
  Purpleevents: "/purpleevents",
  Purplenonmedical: "/purplenonmedical",
  Purpleplab: "/purpleplab",
  Purplepremiumhome: "/purplepremiumhome",
  Purpleusme: "/purpleusme",
  Reset_password: "/reset_password",
  Scholarship: "/scholarship",
  Simplehome: "/simplehome",
  Singup: "/singup",
  Studentresources: "/studentresources",
  Unitieup: "/unitieup",
  Usmlerotation: "/usmlerotation"
};

export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const controller = segments[0];
  const destination = controller ? legacyControllers[controller] : undefined;
  if (!destination) return NextResponse.next();
  const rest = segments.slice(1).filter((segment, index) => !(index === 0 && segment === "index"));
  const url = request.nextUrl.clone();
  url.pathname = destination === "/" ? `/${rest.join("/")}` : `${destination}${rest.length ? `/${rest.join("/")}` : ""}`;
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.png|assets/|pgs_admin/).*)"] };
