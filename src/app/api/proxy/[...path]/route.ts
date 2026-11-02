import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  clearSessionCookies,
  readSessionCookies,
  setAccessCookie,
  setSessionCookies,
  SessionTokens,
} from "@/lib/session-cookies";

/**
 * Same-origin proxy for the backend API: `/api/proxy/<backend path>`.
 *
 * Browser code never holds a token. Each request is forwarded to the backend
 * with the session read from the HttpOnly cookies, and the session is written
 * back here when the backend issues or rotates tokens:
 *  - login / verify-email: the `tokens` object in the JSON body is moved into
 *    cookies and removed from the body the browser receives;
 *  - any response carrying an `x-access-token` header: the access cookie is
 *    replaced with the rotated value;
 *  - logout: both cookies are cleared.
 */

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 25_000;
const SESSION_PATH_PREFIX = "api/v1/auth/";
const LOGOUT_PATH = "api/v1/auth/logout";

// Browser -> backend. Our cookies are for this origin only, auth headers are
// set from the session (never trusted from the caller), and fetch computes the
// rest. `accept-encoding` is dropped so the backend sends an identity body.
const DROPPED_REQUEST_HEADERS = new Set([
  "cookie",
  "host",
  "content-length",
  "connection",
  "accept-encoding",
  "authorization",
  "x-refresh-token",
]);

// Backend -> browser. The backend's cookies are not ours, the rotated token
// becomes a cookie instead of a header, and the encoding headers no longer
// match the decoded body fetch hands us.
const DROPPED_RESPONSE_HEADERS = new Set([
  "set-cookie",
  "x-access-token",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, { params }: RouteContext) {
  const apiUrl = env("apiUrl");
  if (!apiUrl) {
    return NextResponse.json(
      { status: "error", message: "API URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await params;
  const relativePath = path.join("/");
  const base = new URL(apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
  const target = new URL(path.map(encodeURIComponent).join("/"), base);
  if (!target.href.startsWith(base.href)) {
    return NextResponse.json({ status: "error", message: "Invalid path" }, { status: 400 });
  }
  target.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!DROPPED_REQUEST_HEADERS.has(key)) headers.set(key, value);
  });
  const { accessToken, refreshToken } = readSessionCookies(req.cookies);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (refreshToken) headers.set("x-refresh-token", refreshToken);

  const method = req.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        status: "error",
        message: timedOut ? "The server took too long to respond" : "Could not reach the server",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROPPED_RESPONSE_HEADERS.has(key)) responseHeaders.set(key, value);
  });
  responseHeaders.set("cache-control", "no-store");

  let issued: SessionTokens | null = null;
  let responseBody: BodyInit | null = upstream.body;

  if (upstream.ok && relativePath.startsWith(SESSION_PATH_PREFIX) && isJson(upstream)) {
    const stripped = stripTokens(await upstream.text());
    issued = stripped.tokens;
    responseBody = stripped.body;
  }
  if (NULL_BODY_STATUSES.has(upstream.status)) responseBody = null;

  const res = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  if (issued) {
    setSessionCookies(res.cookies, issued);
  } else {
    const rotated = upstream.headers.get("x-access-token");
    if (rotated) setAccessCookie(res.cookies, rotated);
  }
  // Clear on every logout attempt: a user who asked to sign out should not be
  // left with a live session because the backend call failed.
  if (relativePath === LOGOUT_PATH) clearSessionCookies(res.cookies);

  return res;
}

function isJson(res: Response) {
  return (res.headers.get("content-type") ?? "").includes("application/json");
}

/** Pulls `tokens.{access_token,refresh_token}` out of a JSON body, if present. */
function stripTokens(text: string): { body: string; tokens: SessionTokens | null } {
  try {
    const json: unknown = JSON.parse(text);
    if (json && typeof json === "object" && "tokens" in json) {
      const { tokens, ...rest } = json as { tokens?: Partial<SessionTokens> };
      if (typeof tokens?.access_token === "string" && typeof tokens?.refresh_token === "string") {
        return {
          body: JSON.stringify(rest),
          tokens: { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
        };
      }
    }
  } catch {
    // Not JSON after all; relay untouched.
  }
  return { body: text, tokens: null };
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
