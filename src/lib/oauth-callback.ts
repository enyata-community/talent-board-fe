import { NextRequest, NextResponse } from "next/server";
import { fetchUserWithTokens } from "@/api/user";
import { setSessionCookies } from "@/lib/session-cookies";

/**
 * Finishes a social (Google / LinkedIn) login.
 *
 * The backend redirects the browser here with the token pair in the query
 * string (it is asked to via `include_tokens_in_url=true` in `useAuth`). This
 * handler runs on the server and answers with a redirect, so:
 *  - no page is rendered and no client script ever reads the tokens;
 *  - the tokens go straight into HttpOnly cookies;
 *  - the browser lands on a clean URL and the tokenised one is not kept in
 *    history (redirect sources are not recorded).
 *
 * The tokens are validated against the backend before a session is started so
 * a tampered URL cannot plant arbitrary cookie values.
 */
export async function completeOAuthCallback(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url), 303);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  if (!access_token || !refresh_token) return redirectTo("/login");

  let user;
  try {
    user = (await fetchUserWithTokens({ access_token, refresh_token }))?.data.user;
  } catch (err) {
    console.error("OAuth callback: could not load the user", err);
  }
  if (!user) return redirectTo("/login");

  const res = redirectTo(user.profile_completed ? "/dashboard" : "/onboard");
  setSessionCookies(res.cookies, { access_token, refresh_token });
  return res;
}
