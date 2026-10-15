import { repondreValidation } from "@/lib/progression/valider-api";

export async function POST(request: Request) {
  const body = (await request.clone().json().catch(() => ({}))) as { missionId?: string };
  return repondreValidation(body.missionId, request);
}
