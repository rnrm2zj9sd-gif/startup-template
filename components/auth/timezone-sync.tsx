"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

/** Au premier chargement connecté, enregistre le fuseau du navigateur. */
export function TimezoneSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
      if (cancelled || !data) return;
      if (data.timezone === tz) return;
      if (data.timezone !== "Europe/Paris") return;

      await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
