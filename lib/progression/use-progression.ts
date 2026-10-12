"use client";

import type { ProgressionSnapshot } from "./types";
import { useCallback, useEffect, useState } from "react";

export function useProgression() {
  const [data, setData] = useState<ProgressionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch("/api/me/progression");
    if (!res.ok) {
      setLoading(false);
      return null;
    }
    const json = (await res.json()) as ProgressionSnapshot;
    setData(json);
    setLoading(false);
    return json;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload };
}
