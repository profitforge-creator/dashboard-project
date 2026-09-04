import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiClient, generateContentWithRetry } from "@/lib/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "not_configured", text: "Amari's chat isn't connected yet — add a GEMINI_API_KEY to enable it." },
      { status: 200 }
    );
  }

  const { message, history, page, pageLabel } = (await request.json()) as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
    page?: string;
    pageLabel?: string;
  };
  if (!message?.trim()) return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const [{ data: goals }, { data: tasks }, { data: profile }] = await Promise.all([
    supabase.from("goals").select("title, term, category, priority, status, deadline, next_action").eq("user_id", user.id).eq("status", "active").limit(30),
    supabase.from("tasks").select("title, task_date, completed").eq("user_id", user.id).order("task_date", { ascending: false }).limit(15),
    supabase.from("profiles").select("full_name, coaching_personality, wake_phrase").eq("id", user.id).single(),
  ]);

  try {
    const ai = geminiClient();
    const response = await generateContentWithRetry(ai, {
      model: "gemini-flash-lite-latest",
      contents: [
        ...(history ?? []).map((h) => ({ role: h.role === "assistant" ? ("model" as const) : ("user" as const), parts: [{ text: h.content }] })),
        { role: "user" as const, parts: [{ text: message }] },
      ],
      config: {
        systemInstruction:
          `You are Amari, a personal life-coaching assistant inside the user's private dashboard. ` +
          `Coaching personality: ${profile?.coaching_personality ?? "direct"}. Be concise, warm, and practical — a few sentences, not an essay. ` +
          `Ground answers in the user's real goals and tasks below when relevant. Never invent data you weren't given.\n\n` +
          (pageLabel
            ? `The user is currently viewing the "${pageLabel}" section of the dashboard (route: ${page}). If their message is ambiguous, assume it relates to what's on that page — but you cannot yet read that page's live on-screen data or make edits anywhere in the app; say so plainly rather than guessing at numbers you weren't given.\n\n`
            : "") +
          `Active goals:\n${JSON.stringify(goals ?? [])}\n\nRecent tasks:\n${JSON.stringify(tasks ?? [])}`,
      },
    });
    return NextResponse.json({ text: response.text ?? "…" });
  } catch (err) {
    console.error("amari chat error", err);
    return NextResponse.json({ error: "chat_failed", text: "Amari couldn't respond just now — try again in a moment." }, { status: 200 });
  }
}
