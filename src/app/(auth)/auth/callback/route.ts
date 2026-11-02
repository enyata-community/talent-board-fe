import { completeOAuthCallback } from "@/lib/oauth-callback";

export const dynamic = "force-dynamic";

// GET /auth/callback?access_token=…&refresh_token=… — handled entirely on the
// server; see completeOAuthCallback.
export const GET = completeOAuthCallback;
