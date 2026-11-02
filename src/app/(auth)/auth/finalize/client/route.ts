import { completeOAuthCallback } from "@/lib/oauth-callback";

export const dynamic = "force-dynamic";

// Kept so any old links to /auth/finalize/client still work; same flow as
// /auth/callback.
export const GET = completeOAuthCallback;
