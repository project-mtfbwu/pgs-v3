import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const { url, key } = requireSupabasePublicConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values, headers) => {
        void headers; // Private/no-store response headers are enforced in Next config and Proxy.
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. The proxy refreshes sessions.
        }
      }
    }
  });
}
