import { repondreValidation } from "@/lib/progression/valider-api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return repondreValidation(id, request);
}
