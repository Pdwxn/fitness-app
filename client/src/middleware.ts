import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);
const PROTECTED_SEGMENTS = new Set(["onboarding", "dashboard", "progress", "profile", "routine"]);
const AUTH_SEGMENTS = new Set(["login", "register"]);

function getRouteParts(pathname: string) {
  const [locale, firstSegment, secondSegment] = pathname.split("/").filter(Boolean);
  return { locale, firstSegment, secondSegment };
}

function isSupportedLocale(locale: string | undefined) {
  return routing.locales.some((item) => item === locale);
}

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { pathname } = request.nextUrl;
  const { locale, firstSegment, secondSegment } = getRouteParts(pathname);

  if (!isSupportedLocale(locale)) {
    return intlResponse;
  }

  let authSession;
  try {
    authSession = await updateSupabaseSession(request);
  } catch {
    if (PROTECTED_SEGMENTS.has(firstSegment)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = `/${locale}/auth/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return intlResponse;
  }

  const { response, user } = authSession;

  if (PROTECTED_SEGMENTS.has(firstSegment) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/auth/login`;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (firstSegment === "auth" && AUTH_SEGMENTS.has(secondSegment) && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = `/${locale}`;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (response.headers.has("set-cookie")) {
    return response;
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
