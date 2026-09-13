import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  import.meta.env.VITE_DATA_MODE !== "local" && Boolean(url && key);

const demoMode =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("demo") === "1";
export const supabase =
  isSupabaseConfigured && !demoMode ? createClient(url, key) : null;
