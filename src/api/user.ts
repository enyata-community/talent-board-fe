// Server-only: called from server layouts and the OAuth callback route.
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { withTimeout } from "@/lib/withTimeout";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session-cookies";
import type { User } from "@/store/authStore";
import type { ApiEnvelope } from "@/types/APIResponseTypes";

export type CurrentUserResponse = ApiEnvelope<{ user: User }>;

/** Loads the signed-in user for an explicit token pair. Returns null when the backend rejects them. */
export async function fetchUserWithTokens(
  tokens: { access_token?: string; refresh_token: string },
  timeoutMs = 30_000,
): Promise<CurrentUserResponse | null> {
  const fetchCall = (signal: AbortSignal) =>
    fetch(`${env("apiUrl")}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token ?? ""}`,
        "x-refresh-token": tokens.refresh_token,
      },
      cache: "no-store",
      signal,
    });

  const res = await withTimeout(fetchCall, timeoutMs);
  if (!res.ok) return null;
  return res.json();
}

/** The signed-in user for the current request's session cookies, or null when signed out. */
export async function getUser(timeoutMs = 30_000) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  return fetchUserWithTokens(
    { access_token: cookieStore.get(ACCESS_COOKIE)?.value, refresh_token: refreshToken },
    timeoutMs,
  );
}
