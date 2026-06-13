"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { router.replace("/"); router.refresh(); }
    else { setError("รหัสผ่านไม่ถูกต้อง"); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-sumi-950 flex items-center justify-center px-5" style={{ background: "#0D0F17" }}>
      {/* BG effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #DC2626 0%, transparent 70%)", transform: "translateX(-50%) translateY(-50%)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)" }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)", boxShadow: "0 20px 60px rgba(220,38,38,0.4)" }}>
            <span className="text-white font-black text-4xl leading-none" style={{ fontFamily: "serif" }}>全</span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-widest mb-1">ZENKAI</h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="h-px w-10 bg-sumi-600" />
            <p className="text-kin-500 text-xs font-semibold tracking-[0.2em] uppercase">AI Content Studio</p>
            <div className="h-px w-10 bg-sumi-600" />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6" style={{ background: "#1C2235", border: "1px solid #2E3650" }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-sumi-400 mb-2 uppercase tracking-widest">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pr-12 pl-4 py-4 rounded-2xl text-white placeholder-sumi-600 text-sm font-medium focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "#131720", border: "1px solid #2E3650" }}
                  required autoFocus />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sumi-500 hover:text-sumi-300 transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>
                <span className="text-beni-400 text-xs font-medium">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !password}
              className="w-full py-4 rounded-2xl text-white font-black text-sm tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: loading || !password ? "#2E3650" : "linear-gradient(135deg, #DC2626, #B91C1C)", boxShadow: loading || !password ? "none" : "0 8px 32px rgba(220,38,38,0.4)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเข้าสู่ระบบ...</>
                : "เข้าสู่ระบบ →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sumi-600 text-xs mt-5 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-seiji-500 animate-pulse" />
          เชื่อมต่อปลอดภัย HTTPS
        </p>
      </div>
    </div>
  );
}
