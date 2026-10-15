import { requireUser } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

const PAGE = 20;

/** System Log du joueur, du plus récent au plus ancien, pages de 20. */
export async function GET(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = Number(url.searchParams.get("limit") ?? PAGE);
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : PAGE;

  let q = supabase
    .from("system_log")
    .select("id, type, payload, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    const sep = cursor.indexOf("|");
    const at = sep >= 0 ? cursor.slice(0, sep) : cursor;
    const id = sep >= 0 ? cursor.slice(sep + 1) : "";
    if (at && id) {
      q = q.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`);
    } else if (at) {
      q = q.lt("created_at", at);
    }
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const lignes = hasMore ? rows.slice(0, limit) : rows;
  const last = lignes.at(-1);
  const nextCursor = hasMore && last ? `${last.created_at}|${last.id}` : null;

  return NextResponse.json({ lignes, nextCursor });
}
