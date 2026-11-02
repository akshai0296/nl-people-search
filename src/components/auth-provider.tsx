"use client";

import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthState = {
  /** undefined while the stored session is being read. */
  session: Session | null | undefined;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      async signIn(email, password) {
        const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
        if (!error) return null;
        return error.status === 400 || error.code === "invalid_credentials"
          ? "That email and password don't match."
          : "Couldn't sign in right now. Please try again.";
      },
      async signOut() {
        await supabaseBrowser().auth.signOut();
        queryClient.clear();
      },
    }),
    [session, queryClient],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
