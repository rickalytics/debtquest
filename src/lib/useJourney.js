import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
import { initDB, loadAllData, saveAllData } from "../db.js";
import { normalizeJourney } from "./journey.js";
import { isDemo, loadDemo, saveDemo } from "./demo.js";
export default function useJourney() {
  const [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(isDemo || !isSupabaseConfigured),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState(false),
    [revision, setRevision] = useState(0),
    [saving, setSaving] = useState(false);
  const dataRef = useRef(null),
    saveLock = useRef(false),
    scope = useRef(0);
  useEffect(() => {
    if (isDemo || !supabase) return;
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        if (_event === "PASSWORD_RECOVERY") setRecovery(true);
        setUser(session?.user || null);
        setAuthReady(true);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (alive) {
          if (error) setError(error.message);
          setUser(session?.user || null);
          setAuthReady(true);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setAuthReady(true);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    scope.current++;
    setData(null);
    dataRef.current = null;
    setError("");
    if (!isDemo && isSupabaseConfigured && !user) return;
    (async () => {
      try {
        if (!isDemo) await initDB();
        const loaded = normalizeJourney(
          isDemo ? loadDemo() : await loadAllData(),
        );
        if (active) {
          dataRef.current = loaded;
          setData(loaded);
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [authReady, user?.id, revision]);
  async function commit(update) {
    if (saveLock.current)
      throw new Error(
        "Your last change is still saving. Please try again in a moment.",
      );
    if (!dataRef.current)
      throw new Error("Load your journey before making a change.");
    saveLock.current = true;
    setSaving(true);
    const generation = scope.current;
    try {
      const next = normalizeJourney(
        typeof update === "function" ? update(dataRef.current) : update,
      );
      if (isDemo) saveDemo(next);
      else await saveAllData(next, user?.id);
      if (generation !== scope.current)
        throw new Error(
          "Your account changed while saving. Reload your current journey.",
        );
      dataRef.current = next;
      setData(next);
      return next;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  return {
    user,
    authReady,
    data,
    error,
    saving,
    commit,
    recovery,
    finishRecovery: () => setRecovery(false),
    reload: () => setRevision((r) => r + 1),
  };
}
