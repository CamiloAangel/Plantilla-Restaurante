import { canAccessDashboard, canAccessWaiterWorkspace } from "@/lib/auth/access";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const DASHBOARD_PATH = "/dashboard";
const WAITER_PATH = "/waiters";
const LOGIN_PATH = "/login";
const HOME_PATH = "/";
const ADMIN_ALIAS_PATHS = new Set<string>(["/staff"]);

const isDashboardRoute = (pathname: string) =>
  pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);

const isWaiterRoute = (pathname: string) =>
  pathname === WAITER_PATH || pathname.startsWith(`${WAITER_PATH}/`);

const isAdminAliasRoute = (pathname: string) =>
  ADMIN_ALIAS_PATHS.has(pathname);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === LOGIN_PATH;
  const isAdminRoute = isDashboardRoute(pathname) || isAdminAliasRoute(pathname);
  const isStaffRoute = isWaiterRoute(pathname);
  const isProtectedRoute = isAdminRoute || isStaffRoute;

  if (!isProtectedRoute && !isLoginRoute) {
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

  if (isStaffRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = LOGIN_PATH;
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const hasAccess = await canAccessWaiterWorkspace(supabase, {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    if (!hasAccess) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = HOME_PATH;
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/staff/:path*", "/waiters/:path*", "/login"],
};
