/**
 * POST /api/agent — chat with one member of the Zenkai AI team.
 * Body: { messages: {role,content}[], agentId?: string }
 * Agents WITHOUT tools stream token-by-token. Agents WITH tools run a
 * function-calling loop (buffered) and the answer is returned in one piece.
 * Resolved model is returned in X-Agent-Model; tools used in X-Agent-Tools.
 */
import { NextRequest, NextResponse } from "next/server";
import { streamChat, chatWithTools, streamVision, type ChatMsg } from "@/lib/llm";
import { AGENTS, getAgent, DEFAULT_AGENT } from "@/lib/agents";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/agent — public team roster (no system prompts leak to client). */
export async function GET() {
  const roster = AGENTS.map(({ id, name, role, emoji, accent, tagline, quick, tier, tools }) => ({
    id, name, role, emoji, accent, tagline, quick, tier,
    tools: tools ?? [],
    hasTools: !!(tools && tools.length),
  }));
  return NextResponse.json({ agents: roster });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, image } = (await req.json()) as {
      messages: ChatMsg[];
      agentId?: string;
      image?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    const agent = getAgent(agentId) ?? DEFAULT_AGENT;
    const recent = messages.slice(-12);
    const encoder = new TextEncoder();

    // ── Vision: an image is attached → the agent looks at the photo. ──
    if (image && typeof image === "string" && image.startsWith("data:")) {
      const { iterator, model } = await streamVision({
        messages: recent,
        system: agent.systemPrompt,
        image,
        maxTokens: 1400,
      });
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const token of iterator) controller.enqueue(encoder.encode(token));
          } catch (e) {
            controller.enqueue(encoder.encode(`\n\n⚠️ ดูรูปไม่สำเร็จ: ${e instanceof Error ? e.message : "vision error"}`));
          }
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Agent-Id": agent.id,
          "X-Agent-Model": model,
          "X-Agent-Vision": "1",
        },
      });
    }

    // ── Tool-enabled agents: run the function-calling loop, then emit. ──
    if (agent.tools && agent.tools.length) {
      const { text, model, toolsUsed } = await chatWithTools({
        messages: recent,
        system: agent.systemPrompt,
        tier: agent.tier,
        toolNames: agent.tools,
        temperature: agent.temperature ?? 0.6,
        maxTokens: 1500,
      });
      const note = toolsUsed.length ? `\n\n—\n🔧 ใช้เครื่องมือ: ${[...new Set(toolsUsed)].join(", ")}` : "";
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode((text || "(ไม่มีคำตอบ)") + note));
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Agent-Id": agent.id,
          "X-Agent-Model": model,
          "X-Agent-Tools": [...new Set(toolsUsed)].join(",") || "none",
        },
      });
    }

    // ── Plain chat agents: stream tokens. ──
    const { iterator, model } = await streamChat({
      messages: recent,
      system: agent.systemPrompt,
      tier: agent.tier,
      temperature: agent.temperature ?? 0.8,
      maxTokens: 1400,
    });
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of iterator) controller.enqueue(encoder.encode(token));
        } catch (e) {
          controller.enqueue(encoder.encode(`\n\n⚠️ ขัดข้องระหว่างตอบ: ${e instanceof Error ? e.message : "stream error"}`));
        }
        controller.close();
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Agent-Id": agent.id,
        "X-Agent-Model": model,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
