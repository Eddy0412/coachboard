"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const profileCacheRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Skip if we already have the profile for this user
    if (profileCacheRef.current === userId && profile) return profile;
    try {
      const { data } = await supabaseRef.current
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) profileCacheRef.current = userId;
      return (data as Profile) ?? null;
    } catch {
      return null;
    }
  }, [profile]);

  const handleSession = useCallback(async (session: Session | null) => {
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const prof = await fetchProfile(currentUser.id);
      setProfile(prof);
    } else {
      setProfile(null);
      profileCacheRef.current = null;
    }

    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let mounted = true;
    let initialDone = false;

    // Safety timeout — never stay stuck on loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timeout — forcing load complete");
        setLoading(false);
      }
    }, 5000);

    // 1. Fast initial load from cached session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || initialDone) return;
      initialDone = true;
      handleSession(session);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Skip INITIAL_SESSION since getSession handles it
      if (event === "INITIAL_SESSION") {
        if (!initialDone) {
          initialDone = true;
          handleSession(session);
        }
        return;
      }
      handleSession(session);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabaseRef.current.auth.signOut();
    setUser(null);
    setProfile(null);
    profileCacheRef.current = null;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
