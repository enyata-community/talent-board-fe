"use client";

import { useAuthStore, User } from "@/store/authStore";
import { useEffect, useState } from "react";

/** Seeds the client auth store with the user loaded by a server layout. */
export function AuthHydrator({
  user,
  children,
}: {
  user?: User | null;
  children: React.ReactNode;
}) {
  const setUser = useAuthStore((state) => state.setUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(user ?? null);
    setHydrated(true);
  }, [user, setUser]);

  if (!hydrated) return null;

  return <>{children}</>;
}
