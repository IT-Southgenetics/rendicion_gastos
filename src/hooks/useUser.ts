"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

interface UseUserState {
  session: Awaited<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["auth"]["getSession"]>>["data"]["session"] | null;
  profile: Profile | null;
  loading: boolean;
}

export function useUser(): UseUserState {
  const [state, setState] = useState<UseUserState>({
    session: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setState({ session: null, profile: null, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      setState({ session, profile: profile ?? null, loading: false });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ session: null, profile: null, loading: false });
      } else {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setState({ session, profile: data ?? null, loading: false });
          });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

