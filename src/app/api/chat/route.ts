import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "not_configured", text: "Amari's chat isn't connected yet — add an ANTHROPIC_API_KEY to enable it." },
      { status: 200 }
    );
  }

  const { message, history } = (await request.json()) as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!message?.trim()) return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const [{ data: goals }, { data: tasks }, { data: profile }] = await Promise.all([
    supabase.from("goals").select("title, term, category, priority, status, deadline, next_action").eq("user_id", user.id).eq("status", "active").limit(30),
    supabase.from("tasks").select("title, task_date, completed").eq("user_id", user.id).order("task_date", { ascending: false }).limit(15),
    supabase.from("profiles").select("full_name, coaching_personality, wake_phrase").eq("id", user.id).single(),
  ]);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        `You are Amari, a personal life-coaching assistant inside the user's private dashboard. ` +
        `Coaching personality: ${profile?.coaching_personality ?? "direct"}. Be concise, warm, and practical — a few sentences, not an essay. ` +
        `Ground answers in the user's real goals and tasks below when relevant. Never invent data you weren't given.\n\n` +
        `Active goals:\n${JSON.stringify(goals ?? [])}\n\nRecent tasks:\n${JSON.stringify(tasks ?? [])}`,
      messages: [
        ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: "user" as const, content: message },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return NextResponse.json({ text: textBlock?.type === "text" ? textBlock.text : "…" });
  } catch (err) {
    console.error("amari chat error", err);
    return NextResponse.json({ error: "chat_failed", text: "Amari couldn't respond just now — try again in a moment." }, { status: 200 });
  }
}
