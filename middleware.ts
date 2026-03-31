import { canAccessDashboard } from "@/lib/auth/access";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";
const HOME_PATH = "/";
const ADMIN_ALIAS_PATHS = new Set<string>(["/staff"]);

const isDashboardRoute = (pathname: string) =>
  pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);

const isAdminAliasRoute = (pathname: string) =>
  ADMIN_ALIAS_PATHS.has(pathname);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === LOGIN_PATH;
  const isAdminRoute = isDashboardRoute(pathname) || isAdminAliasRoute(pathname);

  if (!isAdminRoute && !isLoginRoute) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = LOGIN_PATH;
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const hasAccess = await canAccessDashboard(supabase, user.id);

    if (!hasAccess) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = HOME_PATH;
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }

    return response;
  }

  if (isLoginRoute && user) {
    const hasAccess = await canAccessDashboard(supabase, user.id);
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = hasAccess ? DASHBOARD_PATH : HOME_PATH;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/staff/:path*", "/login"],
};
