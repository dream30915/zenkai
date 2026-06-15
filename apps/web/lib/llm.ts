/**
 * lib/llm.ts — Unified multi-provider LLM layer for the Zenkai AI team.
 *
 * Why this exists: the app previously hard-wired `gpt-4o` in one route. This
 * centralizes model choice into named TIERS with an automatic fallback chain,
 * so every agent picks a tier (not a model) and we can swap/extend providers
 * in one place.
 *
 * Live reality (verified 2026-06-15):
 *   - Phaya (api.phaya.io, OpenAI-compatible) → gpt-5.5 / gpt-5.4 / -mini / -nano. THB billing.
 *   - OpenAI direct (real key, has credit) → gpt-4o family. Reliable paid fallback.
 *   - Anthropic Claude → BEST for Thai creative, but currently out of credit.
 *     Auto-enabled by env LLM_ENABLE_CLAUDE=true once topped up (no code change).
 *
 * To add DeepSeek/Qwen/MiniMax later: add a client + one line per tier below.
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { toolSpecs, runTool } from "@/lib/tools";

export type Tier = "smart" | "quality" | "bulk";
type ProviderId = "phaya" | "openai" | "anthropic";
interface Candidate { provider: ProviderId; model: string; }

export interface ChatMsg { role: "user" | "assistant" | "system"; content: string; }

// ── Fallback chains per tier (first that succeeds wins) ────────────────
const TIERS: Record<Tier, Candidate[]> = {
  // top reasoning / orchestration / cinematic prompts
  smart: [
    { provider: "phaya", model: "gpt-5.5" },
    { provider: "phaya", model: "gpt-5.4" },
    { provider: "openai", model: "gpt-4o" },
  ],
  // creative Thai copy / marketing strategy
  quality: [
    { provider: "phaya", model: "gpt-5.4" },
    { provider: "openai", model: "gpt-4o" },
    { provider: "phaya", model: "gpt-5.4-mini" },
  ],
  // cheap bulk / classification / ops chatter
  bulk: [
    { provider: "phaya", model: "gpt-5.4-mini" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "phaya", model: "gpt-5.4-nano" },
  ],
};

// Claude is the best Thai-creative brain — prepend it to quality/smart chains
// when explicitly enabled AND a key is present (skipped by default to avoid
// wasted latency while the Anthropic account has no credit).
const ENABLE_CLAUDE = process.env.LLM_ENABLE_CLAUDE === "true";
const CLAUDE_MODEL = process.env.LLM_CLAUDE_MODEL || "claude-sonnet-4-6";

function clientFor(p: ProviderId): OpenAI {
  if (p === "phaya")
    return new OpenAI({
      apiKey: process.env.PHAYA_API_KEY,
      baseURL: process.env.PHAYA_BASE_URL || "https://api.phaya.io/v1",
    });
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function hasKey(p: ProviderId): boolean {
  if (p === "phaya") return !!process.env.PHAYA_API_KEY;
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  return !!process.env.ANTHROPIC_API_KEY;
}

interface StreamOpts {
  messages: ChatMsg[];
  system: string;
  tier: Tier;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Open a streaming chat completion, walking the tier's fallback chain.
 * Returns the live token generator plus the resolved "provider:model" label.
 * Auth/credit errors (401/402) surface at request time → we fall to the next
 * candidate; once a stream is live we commit to it.
 */
export async function streamChat(
  opts: StreamOpts,
): Promise<{ iterator: AsyncGenerator<string>; model: string }> {
  const { messages, system, tier, temperature = 0.8, maxTokens = 1200 } = opts;

  const chain: Candidate[] = [];
  if (ENABLE_CLAUDE && hasKey("anthropic") && (tier === "quality" || tier === "smart"))
    chain.push({ provider: "anthropic", model: CLAUDE_MODEL });
  chain.push(...TIERS[tier]);

  let lastErr: unknown;
  for (const c of chain) {
    if (!hasKey(c.provider)) continue;
    try {
      if (c.provider === "anthropic") {
        const it = await anthropicStream(system, messages, c.model, maxTokens, temperature);
        return { iterator: it, model: `claude:${c.model}` };
      }
      const it = await openaiStream(clientFor(c.provider), c.provider, system, messages, c.model, maxTokens, temperature);
      return { iterator: it, model: `${c.provider}:${c.model}` };
    } catch (err) {
      lastErr = err;
      console.warn(`[llm] ${c.provider}:${c.model} unavailable → next`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr ?? new Error("no LLM provider available");
}

async function openaiStream(
  client: OpenAI,
  provider: ProviderId,
  system: string,
  messages: ChatMsg[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AsyncGenerator<string>> {
  // Newer Phaya gpt-5.x models reject non-default temperature → omit it there.
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [{ role: "system", content: system }, ...messages],
  };
  if (provider === "openai") body.temperature = temperature;

  // For stream:true the SDK rejects here on 4xx (auth/credit) → caller falls back.
  const stream = (await client.chat.completions.create(body as never)) as unknown as AsyncIterable<{
    choices: { delta?: { content?: string } }[];
  }>;

  async function* gen() {
    for await (const chunk of stream) {
      const t = chunk.choices[0]?.delta?.content || "";
      if (t) yield t;
    }
  }
  return gen();
}

async function anthropicStream(
  system: string,
  messages: ChatMsg[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AsyncGenerator<string>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const conv = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: conv,
  });

  async function* gen() {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    }
  }
  return gen();
}

/** Non-streaming convenience used by server-side agents/tools. */
export async function chat(opts: StreamOpts): Promise<{ text: string; model: string }> {
  const { iterator, model } = await streamChat(opts);
  let text = "";
  for await (const t of iterator) text += t;
  return { text, model };
}

// ── Vision — let an agent SEE an attached food photo ───────────────────
const VISION: Candidate[] = [
  { provider: "openai", model: "gpt-4o" },          // reliable, has credit
  { provider: "phaya", model: "gpt-5.4-vision" },   // THB fallback
];

/**
 * Stream a reply where the latest user turn includes an image (data URL or
 * https URL). The agent keeps its own system prompt but answers from what it
 * actually sees in the photo.
 */
export async function streamVision(opts: {
  messages: ChatMsg[];
  system: string;
  image: string;
  maxTokens?: number;
}): Promise<{ iterator: AsyncGenerator<string>; model: string }> {
  const { messages, system, image, maxTokens = 1300 } = opts;

  // Plain history + attach the image to the most recent user message.
  const base: Msg[] = messages.map((m) => ({ role: m.role, content: m.content }) as Msg);
  for (let i = base.length - 1; i >= 0; i--) {
    if (base[i].role === "user") {
      base[i] = {
        role: "user",
        content: [
          { type: "text", text: messages[i].content || "ช่วยดูรูปอาหารนี้แล้วทำงานตามบทบาทของคุณ" },
          { type: "image_url", image_url: { url: image } },
        ],
      } as Msg;
      break;
    }
  }

  let lastErr: unknown;
  for (const c of VISION) {
    if (!hasKey(c.provider)) continue;
    try {
      const client = clientFor(c.provider);
      const body: Record<string, unknown> = {
        model: c.model,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "system", content: system }, ...base],
      };
      const stream = (await client.chat.completions.create(body as never)) as unknown as AsyncIterable<{
        choices: { delta?: { content?: string } }[];
      }>;
      async function* gen() {
        for await (const chunk of stream) {
          const t = chunk.choices[0]?.delta?.content || "";
          if (t) yield t;
        }
      }
      return { iterator: gen(), model: `${c.provider}:${c.model}` };
    } catch (err) {
      lastErr = err;
      console.warn(`[vision] ${c.provider}:${c.model} failed → next`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr ?? new Error("no vision-capable provider available");
}

// ── Tool-calling (skills) ──────────────────────────────────────────────
type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface ToolChatOpts {
  messages: ChatMsg[];
  system: string;
  tier: Tier;
  toolNames: string[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Run an agent that can call real tools (lib/tools.ts). Walks the tier's
 * OpenAI-compatible providers (Claude is skipped here — the tool loop uses
 * the OpenAI tools API, which Phaya also implements). Buffered, not streamed:
 * returns the final answer plus which tools were invoked.
 */
export async function chatWithTools(opts: ToolChatOpts): Promise<{
  text: string;
  model: string;
  toolsUsed: string[];
}> {
  const { messages, system, tier, toolNames, temperature = 0.6, maxTokens = 1400 } = opts;
  const specs = toolSpecs(toolNames);

  let lastErr: unknown;
  for (const c of TIERS[tier]) {
    if (!hasKey(c.provider)) continue;
    try {
      const client = clientFor(c.provider);
      const convo: Msg[] = [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content }) as Msg),
      ];
      const toolsUsed: string[] = [];

      for (let step = 0; step < 6; step++) {
        const body: Record<string, unknown> = {
          model: c.model,
          max_tokens: maxTokens,
          messages: convo,
          tools: specs,
          tool_choice: "auto",
        };
        if (c.provider === "openai") body.temperature = temperature;

        const res = await client.chat.completions.create(body as never);
        const msg = res.choices[0].message;

        if (msg.tool_calls && msg.tool_calls.length) {
          convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
          for (const tc of msg.tool_calls) {
            let parsed: Record<string, unknown> = {};
            try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* keep {} */ }
            toolsUsed.push(tc.function.name);
            const result = await runTool(tc.function.name, parsed);
            convo.push({ role: "tool", tool_call_id: tc.id, content: result });
          }
          continue; // re-ask with tool results
        }
        // No tool call this turn. If we got text, we're done.
        if (msg.content && msg.content.trim())
          return { text: msg.content, model: `${c.provider}:${c.model}`, toolsUsed };
        break; // empty answer → force a plain final below
      }

      // Force a final answer with tools disabled (handles empty replies and
      // the case where a tool was unavailable → answer from knowledge instead).
      const final = await client.chat.completions.create({
        model: c.model,
        max_tokens: maxTokens,
        messages: convo,
        tool_choice: "none",
      } as never);
      return {
        text: final.choices[0].message.content?.trim() || "ขออภัย ตอนนี้ยังตอบไม่ได้ ลองถามใหม่อีกครั้งนะ",
        model: `${c.provider}:${c.model}`,
        toolsUsed,
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[llm:tools] ${c.provider}:${c.model} failed → next`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr ?? new Error("no tool-capable provider available");
}
