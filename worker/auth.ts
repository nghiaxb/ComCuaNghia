import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
export async function authenticated(request: Request, env: Env) {
  const token = request.headers.get("Authorization");
  if (!token?.startsWith("Bearer ")) throw Error("UNAUTHENTICATED");
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token.slice(7));
  if (
    error ||
    !data.user ||
    !data.user.email_confirmed_at ||
    data.user.email?.toLowerCase().split("@")[1] !== "rivercrane.vn" ||
    data.user.app_metadata.provider !== "google"
  )
    throw Error("FORBIDDEN");
  const { data: member, error: memberError } = await client
    .from("members")
    .select("*")
    .eq("auth_user_id", data.user.id)
    .eq("active", true)
    .single();
  if (memberError || !member) throw Error("FORBIDDEN");
  return { client, member };
}
