"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Trash2, Users, ChevronLeft, ImagePlus, X } from "lucide-react";
import { clsx } from "clsx";

interface Message { role: "user" | "assistant"; content: string; image?: string; }
const LS_KEY = "zenkai-agent-threads";
type Accent = "beni" | "kin" | "seiji" | "sumi";
interface AgentMeta {
  id: string; name: string; role: string; emoji: string;
  accent: Accent; tagline: string; quick: string[]; tier: string;
  hasTools?: boolean;
}

// Full literal class strings so Tailwind JIT keeps them.
const ACCENT: Record<Accent, { chip: string; soft: string; ring: string; dot: string; text: string }> = {
  beni:  { chip: "bg-beni-600",  soft: "bg-beni-50",  ring: "ring-beni-400",  dot: "bg-beni-500",  text: "text-beni-700" },
  kin:   { chip: "bg-kin-600",   soft: "bg-kin-50",   ring: "ring-kin-400",   dot: "bg-kin-500",   text: "text-kin-700" },
  seiji: { chip: "bg-seiji-600", soft: "bg-seiji-100", ring: "ring-seiji-400", dot: "bg-seiji-500", text: "text-seiji-600" },
  sumi:  { chip: "bg-sumi-700",  soft: "bg-sumi-100", ring: "ring-sumi-400",  dot: "bg-sumi-500",  text: "text-sumi-700" },
};

const TIER_LABEL: Record<string, string> = {
  smart: "ฉลาดสูง", quality: "คุณภาพ", bulk: "ประหยัด",
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 bg-sumi-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function AgentChat() {
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [mobileRoster, setMobileRoster] = useState(false);
  const [pendingImage, setPendingImage] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the team roster once.
  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d: { agents: AgentMeta[] }) => {
        setAgents(d.agents || []);
        if (d.agents?.length) setActiveId((cur) => cur || d.agents[0].id);
      })
      .catch(() => {});
  }, []);

  // Persist chat threads in the browser so they survive a refresh.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setThreads(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(threads)); } catch { /* ignore */ }
  }, [threads]);

  function pickImage(file?: File) {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert("รูปใหญ่เกิน 6MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  const active = agents.find((a) => a.id === activeId);
  const messages = threads[activeId] || [];
  const accent = active ? ACCENT[active.accent] : ACCENT.beni;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, activeId, streaming]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      const img = pendingImage;
      if ((!content && !img) || loading || !active) return;
      setInput("");
      setPendingImage("");

      const userMsg: Message = { role: "user", content: content || "ช่วยดูรูปนี้ให้หน่อย", ...(img ? { image: img } : {}) };
      const next: Message[] = [...(threads[active.id] || []), userMsg];
      setThreads((t) => ({ ...t, [active.id]: next }));
      setLoading(true);
      setStreaming("");

      try {
        // Don't ship base64 images back to the server in history — only the new one.
        const payloadMsgs = next.map(({ role, content }) => ({ role, content }));
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payloadMsgs, agentId: active.id, ...(img ? { image: img } : {}) }),
        });
        if (!res.ok || !res.body) throw new Error("เชื่อมต่อ AI ไม่ได้");

        const model = res.headers.get("X-Agent-Model");
        if (model) setModelByAgent((m) => ({ ...m, [active.id]: model }));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value);
          setStreaming(full);
        }
        setThreads((t) => ({ ...t, [active.id]: [...next, { role: "assistant", content: full }] }));
        setStreaming("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
        setThreads((t) => ({ ...t, [active.id]: [...next, { role: "assistant", content: `⚠️ ${msg}` }] }));
        setStreaming("");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, active, threads, pendingImage],
  );

  function RosterCard({ a }: { a: AgentMeta }) {
    const ac = ACCENT[a.accent];
    const on = a.id === activeId;
    return (
      <button
        onClick={() => { setActiveId(a.id); setMobileRoster(false); }}
        className={clsx(
          "w-full text-left rounded-xl p-3 transition-all flex items-start gap-3 border",
          on ? clsx(ac.soft, "border-transparent ring-2", ac.ring) : "bg-white border-washi-200 hover:border-washi-300",
        )}
      >
        <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0", ac.chip)}>
          <span>{a.emoji}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sumi-900 text-sm truncate">{a.name}</p>
            {a.hasTools && (
              <span className="text-[9px] bg-seiji-100 text-seiji-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                🔧 ข้อมูลจริง
              </span>
            )}
          </div>
          <p className="text-[11px] text-sumi-500 truncate">{a.role}</p>
          <p className="text-[11px] text-sumi-400 mt-0.5 leading-snug line-clamp-2">{a.tagline}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-screen bg-washi-50">

      {/* ── Team roster (desktop) ── */}
      <aside className="hidden md:flex md:w-72 lg:w-80 flex-col border-r border-washi-200 bg-washi-100 flex-shrink-0">
        <div className="px-4 py-4 border-b border-washi-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-beni-600" />
          <h2 className="font-black text-sumi-900 text-sm">ทีม AI Zenkai</h2>
          <span className="ml-auto text-[10px] text-sumi-400">{agents.length} ตำแหน่ง</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map((a) => <RosterCard key={a.id} a={a} />)}
        </div>
      </aside>

      {/* ── Chat column ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="bg-sumi-900 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMobileRoster(true)} className="md:hidden p-1 text-sumi-300">
            <Users className="w-5 h-5" />
          </button>
          <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-lg", accent.chip)}>
            <span>{active?.emoji ?? "🤖"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-base truncate">{active?.name ?? "Zenkai AI"}</h1>
              {active && (
                <span className="hidden sm:inline text-[10px] bg-kin-600/25 text-kin-300 px-2 py-0.5 rounded-full font-medium">
                  {TIER_LABEL[active.tier] ?? active.tier}
                </span>
              )}
            </div>
            <p className="text-sumi-400 text-xs truncate">
              {active?.role}
              {modelByAgent[activeId] ? ` · ${modelByAgent[activeId]}` : ""}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setThreads((t) => ({ ...t, [activeId]: [] }))}
              className="p-2 text-sumi-400 hover:text-white transition-colors"
              title="ล้างแชท"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-seiji-400 rounded-full animate-pulse" />
            <span className="text-seiji-400 text-xs">พร้อม</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && !streaming && active && (
            <div className="max-w-2xl mx-auto pt-4">
              <div className="text-center mb-6">
                <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-3xl", accent.chip)}>
                  <span>{active.emoji}</span>
                </div>
                <p className="text-sumi-900 font-bold text-lg">{active.name}</p>
                <p className="text-sumi-500 text-sm mt-1">{active.tagline}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {active.quick.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-left text-sm bg-white border border-washi-200 hover:border-washi-300 rounded-xl px-4 py-3 text-sumi-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={clsx("flex gap-2.5 max-w-2xl mx-auto", m.role === "user" ? "flex-row-reverse" : "")}>
              <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5",
                m.role === "user" ? "bg-sumi-800 text-white" : accent.chip,
              )}>
                <span>{m.role === "user" ? "🧑" : active?.emoji}</span>
              </div>
              <div className={clsx(
                "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed max-w-[82%]",
                m.role === "user" ? "bg-sumi-800 text-white rounded-tr-sm" : "bg-white border border-washi-200 text-sumi-800 rounded-tl-sm",
              )}>
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="แนบรูป" className="rounded-lg mb-2 max-h-48 object-cover" />
                )}
                {m.content}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex gap-2.5 max-w-2xl mx-auto">
              <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5", accent.chip)}>
                <span>{active?.emoji}</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed max-w-[82%] bg-white border border-washi-200 text-sumi-800">
                {streaming}
              </div>
            </div>
          )}

          {loading && !streaming && (
            <div className="flex gap-2.5 max-w-2xl mx-auto">
              <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0", accent.chip)}>
                <span>{active?.emoji}</span>
              </div>
              <div className="bg-white border border-washi-200 rounded-2xl rounded-tl-sm"><TypingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-washi-200 bg-white px-4 py-3 flex-shrink-0">
          {pendingImage && (
            <div className="max-w-2xl mx-auto mb-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="รูปที่จะส่ง" className="h-14 w-14 rounded-lg object-cover border border-washi-200" />
              <span className="text-xs text-sumi-500">แนบรูปแล้ว — agent จะดูรูปนี้</span>
              <button onClick={() => setPendingImage("")} className="ml-auto p-1 text-sumi-400 hover:text-beni-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title="แนบรูปอาหาร"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-washi-300 text-sumi-500 hover:text-beni-600 hover:border-beni-400 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={active ? `คุยกับ${active.name}…` : "พิมพ์ข้อความ…"}
              className="flex-1 resize-none rounded-xl border border-washi-300 px-4 py-2.5 text-sm text-sumi-900 focus:outline-none focus:border-beni-400 max-h-32"
            />
            <button
              onClick={() => send()}
              disabled={loading || (!input.trim() && !pendingImage)}
              className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors flex-shrink-0",
                loading || (!input.trim() && !pendingImage) ? "bg-sumi-300" : "bg-beni-600 hover:bg-beni-700",
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile roster drawer ── */}
      {mobileRoster && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80%] bg-washi-100 flex flex-col h-full">
            <div className="px-4 py-4 border-b border-washi-200 flex items-center gap-2">
              <button onClick={() => setMobileRoster(false)} className="p-1 text-sumi-500"><ChevronLeft className="w-5 h-5" /></button>
              <Users className="w-4 h-4 text-beni-600" />
              <h2 className="font-black text-sumi-900 text-sm">ทีม AI Zenkai</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {agents.map((a) => <RosterCard key={a.id} a={a} />)}
            </div>
          </div>
          <div className="flex-1 bg-sumi-950/40" onClick={() => setMobileRoster(false)} />
        </div>
      )}
    </div>
  );
}
