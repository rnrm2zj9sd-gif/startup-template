import { ImageResponse } from "next/og";

const TAILLES = new Set([180, 192, 512]);

/** Icônes PNG de l'app installée (PWA) : fond bleu nuit, monogramme du System. */
export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const size = Number((await context.params).size);
  if (!TAILLES.has(size)) return new Response("Taille inconnue", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04060B",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "22%",
            border: `${Math.round(size / 48)}px solid rgba(139, 92, 246, 0.7)`,
            background: "radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.35), #0B0E18 70%)",
            color: "#FAFAFA",
            fontSize: size * 0.34,
            fontWeight: 600,
          }}
        >
          T
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
