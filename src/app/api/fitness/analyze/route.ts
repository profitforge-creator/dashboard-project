import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiClient, generateContentWithRetry } from "@/lib/gemini";

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  return { data: buf.toString("base64"), mimeType };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "not_configured", text: "Photo analysis isn't connected yet — add a GEMINI_API_KEY to enable it." }, { status: 200 });
  }

  const { photoUrl, dreamPhotoUrl, goalDescription, weightKg, heightCm } = (await request.json()) as {
    photoUrl: string;
    dreamPhotoUrl?: string | null;
    goalDescription: string;
    weightKg?: number | null;
    heightCm?: number | null;
  };
  if (!photoUrl) return NextResponse.json({ error: "Missing photo" }, { status: 400 });

  try {
    const current = await urlToBase64(photoUrl);
    const dream = dreamPhotoUrl ? await urlToBase64(dreamPhotoUrl) : null;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
      { text: "CURRENT PHOTO:" },
      { inlineData: { mimeType: current.mimeType, data: current.data } },
    ];
    if (dream) {
      parts.push({ text: "DREAM / TARGET PHYSIQUE PHOTO:" }, { inlineData: { mimeType: dream.mimeType, data: dream.data } });
    }
    parts.push({
      text:
        `Goal: ${goalDescription || "General fitness improvement"}\n` +
        (heightCm ? `Height: ${heightCm}cm\n` : "") +
        (weightKg ? `Current weight: ${weightKg}kg\n` : "") +
        `Analyze the physique shown in the current photo. ${dream ? "Compare it against the dream/target photo and identify the gap." : ""} ` +
        `Respond with ONLY a JSON object, no markdown fences, matching exactly this shape: ` +
        `{"analysis": string (2-4 sentences, direct and specific), "focus_areas": string[] (3-5 body areas or qualities to prioritize), ` +
        `"estimated_weeks": number (realistic estimate to see meaningful change toward the goal, assuming consistent effort), ` +
        `"next_steps": string[] (4-6 concrete, specific actions — training, nutrition, and non-fitness habits that affect the goal)}`,
    });

    const ai = geminiClient();
    const response = await generateContentWithRetry(ai, {
      model: "gemini-flash-lite-latest",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction:
          "You are a knowledgeable, direct physique/fitness coach analyzing a private user's own progress photo inside their personal dashboard. " +
          "Be specific and practical, never vague. You are not a doctor — do not diagnose medical conditions, only give general fitness/training/nutrition guidance. " +
          "Respond with raw JSON only.",
        responseMimeType: "application/json",
      },
    });

    const raw = response.text ?? "{}";
    let parsed: { analysis?: string; focus_areas?: string[]; estimated_weeks?: number; next_steps?: string[] };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = { analysis: raw };
    }

    const analysis = {
      user_id: user.id,
      source_photo_url: photoUrl,
      analysis_text: parsed.analysis ?? "Analysis unavailable.",
      focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas.slice(0, 8) : [],
      estimated_weeks: typeof parsed.estimated_weeks === "number" ? Math.round(parsed.estimated_weeks) : null,
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps.slice(0, 10) : [],
    };

    const { data: saved, error } = await supabase.from("fitness_analyses").insert(analysis).select().single();
    if (error) throw error;

    return NextResponse.json({ analysis: saved });
  } catch (err) {
    console.error("fitness analyze error", err);
    return NextResponse.json({ error: "analysis_failed", text: "Couldn't analyze that photo just now — try again in a moment." }, { status: 200 });
  }
}
