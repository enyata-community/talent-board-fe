// Server-only. The session lives in two HttpOnly cookies that browser scripts
// cannot read; only the API proxy, the OAuth callback and the server layouts
// touch them. Nothing in client code ever sees a token value.
import type { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export type SessionTokens = { access_token: string; refresh_token: string };

// "lax" (not "strict") so following a link into the app from an email or
// another site keeps the session. Secure everywhere except plain-http local dev.
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

type CookieJar = NextResponse["cookies"];

export function setSessionCookies(jar: CookieJar, tokens: SessionTokens) {
  jar.set({ name: ACCESS_COOKIE, value: tokens.access_token, ...cookieOptions });
  jar.set({ name: REFRESH_COOKIE, value: tokens.refresh_token, ...cookieOptions });
}

/** The backend rotates the access token via an `x-access-token` response header. */
export function setAccessCookie(jar: CookieJar, accessToken: string) {
  jar.set({ name: ACCESS_COOKIE, value: accessToken, ...cookieOptions });
}

export function clearSessionCookies(jar: CookieJar) {
  jar.delete({ name: ACCESS_COOKIE, path: "/" });
  jar.delete({ name: REFRESH_COOKIE, path: "/" });
}

export function readSessionCookies(cookies: NextRequest["cookies"]) {
  return {
    accessToken: cookies.get(ACCESS_COOKIE)?.value,
    refreshToken: cookies.get(REFRESH_COOKIE)?.value,
  };
}
