import { create } from "zustand";
import { devtools } from "zustand/middleware";

type profile = {
  bio?: string;
  job_title?: string;
  skills?: string[];
};

export type UserRole = "talent" | "recruiter";

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  email: string;
  role: UserRole | null;
  provider: string;
  profile_completed: boolean;
  country?: string;
  state?: string;
  profile?: profile;
};

// Session tokens are deliberately not part of this store: they live in HttpOnly
// cookies and are attached server-side by the API proxy (src/lib/axiosInstance.ts).
interface AuthState {
  user: User | null;
  loading: boolean;
  is_authenticated: boolean;
  resetAuth: () => void;
  set_isAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      loading: false,
      is_authenticated: false,
      resetAuth: () => set({ user: null, is_authenticated: false }),
      set_isAuthenticated: (isAuthenticated) =>
        set({ is_authenticated: isAuthenticated }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      logout: () => {
        set({
          user: null,
          is_authenticated: false,
        });
        window.location.href = "/";
      },
    }),
    { name: "authStore", enabled: process.env.NODE_ENV !== "production" },
  ),
);
