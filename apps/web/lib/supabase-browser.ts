"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken } = useAuth();
  return useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
              const token = await getToken();
              const headers = new Headers(init?.headers);
              if (token) headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
        },
      ),
    [getToken],
  );
}
