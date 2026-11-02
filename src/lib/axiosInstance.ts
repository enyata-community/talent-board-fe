"use client";

import axios from "axios";

// Every browser request goes through the same-origin proxy at /api/proxy
// (src/app/api/proxy/[...path]/route.ts), which attaches the session from
// HttpOnly cookies on the server. Tokens never reach client code, so there are
// no auth interceptors here.
const API = axios.create({
  baseURL: "/api/proxy",
  timeout: 30_000,
});

export default API;
