# Enyata Talent Board — Frontend

The web app for Enyata Talent Board, where talents build a profile and recruiters scout, bookmark and message them. This repository is the Next.js frontend; it talks to a separate backend API.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, standalone output) with React 19 and TypeScript
- Tailwind CSS 4 with Radix UI primitives (shadcn-style components in `src/components/ui`)
- TanStack Query for server state, Zustand for client state, Axios for HTTP
- react-hook-form + zod for forms, framer-motion for animation, sonner for toasts

## Prerequisites

- Node.js 22 (the Docker image uses `node:22-alpine`)
- A package manager: yarn (preferred, `yarn.lock` is the source of truth) or npm
- A running instance of the Talent Board backend API

## Setup

1. Install dependencies:

   ```bash
   yarn install
   # or
   npm install
   ```

2. Create a `.env` in the project root (copy `.env.example`) and set:

   | Variable              | Required | Description                                                                 |
   | --------------------- | -------- | --------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL` | yes      | Base URL of the backend API, without a trailing slash, e.g. `http://localhost:8000` |
   | `NEXT_PUBLIC_APP_ENV` | no       | Free-form environment label (`development`, `staging`, `production`)        |

   `NEXT_PUBLIC_API_URL` is used both on the server (API proxy, server layouts) and in the browser (the social-login redirect only). Everything else the browser does goes through the same-origin proxy described below.

3. Start the dev server:

   ```bash
   yarn dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `yarn dev`        | Development server with hot reload                         |
| `yarn build`      | Production build (`output: "standalone"`)                  |
| `yarn start`      | Serve the production build                                 |
| `yarn lint`       | ESLint (`next/core-web-vitals` + `next/typescript`)        |
| `yarn docker-dev` | Build and run the production image with Docker Compose     |

## Project structure

```
src/
  app/
    (auth)/        login, signup, verify-email, password reset, OAuth callback
    (website)/     public marketing pages (home, talents, privacy, terms)
    (protected)/   dashboard for talents and recruiters (requires a session)
    onboard/       profile completion wizard (requires a session)
    api/proxy/     same-origin proxy to the backend API (see below)
    api/proxy-image/  image proxy restricted to the backend's origin
  api/             server-side data loaders used by layouts (getUser, top talents)
  components/      shared UI, layouts, providers
  hooks/           data hooks (useAuth, useTalents, useMessages, ...)
  lib/             axios instance, session cookies, OAuth callback, helpers
  store/           Zustand stores (auth, talents, dashboard)
  types/           API request / response types
  middleware.ts    redirects unauthenticated visitors away from protected routes
```

## Authentication and sessions

The backend issues an access token and a refresh token. **The browser never holds either.** The session is kept in two `HttpOnly`, `SameSite=Lax` cookies (`access_token`, `refresh_token`; `Secure` in production) that only server code reads.

How requests work:

- The Axios instance (`src/lib/axiosInstance.ts`) targets `/api/proxy`, a catch-all route handler (`src/app/api/proxy/[...path]/route.ts`). Call it with the backend path, e.g. `GET /api/proxy/api/v1/users/me`.
- The proxy reads the session cookies, forwards the request to `NEXT_PUBLIC_API_URL` with `Authorization: Bearer <access>` and `x-refresh-token: <refresh>`, and relays the response.
- When the backend rotates the access token (an `x-access-token` response header) the proxy updates the cookie and drops the header.
- On login and email verification the backend returns a `tokens` object in the JSON body. The proxy moves it into cookies and removes it from the body the browser receives.
- On logout the proxy clears both cookies.

Social login (Google, LinkedIn):

1. `useAuth().loginWithProvider` navigates to the backend's OAuth start with `redirect_uri=<origin>/auth/callback`.
2. The backend redirects back to `/auth/callback` with the tokens in the query string (it is asked to via `include_tokens_in_url=true`).
3. `/auth/callback` is a **server route handler** (`src/lib/oauth-callback.ts`). It validates the tokens against the backend, sets the cookies, and answers with a `303` redirect to `/dashboard` or `/onboard`. No page renders and no client script runs, so the tokenised URL is never in the DOM, in client memory, or in browser history. `/auth/finalize/client` is an alias kept for old links.

Server layouts (`(protected)`, `(website)`, `onboard`) call `getUser` in `src/api/user.ts`, which reads the cookies directly, and pass the resulting user to `AuthHydrator` to seed the client store. `src/middleware.ts` redirects to `/login` when a protected path is hit without a refresh cookie.

Known limitation: the backend still transports OAuth tokens in a redirect URL, so they can appear in server access logs on the hop into this app. Replacing that with a one-time authorization code exchanged server-side is a backend change.

## Deployment

**Docker.** The multi-stage `Dockerfile` builds the standalone output and runs `node server.js` as a non-root user on port 3000. `docker-compose.yml` wires it up; run `yarn docker-dev`. Pass `NEXT_PUBLIC_API_URL` at build time (it is inlined into the client bundle) and at runtime.

**Netlify.** `netlify.toml` uses `@netlify/plugin-nextjs`. Set the environment variables in the site settings.

## Contributing

- Branch from `develop` and open pull requests against it.
- Run `yarn lint` and `yarn build` before pushing.
- Keep token handling on the server. Do not read session cookies in client components or add auth headers in the browser; extend the proxy instead.
