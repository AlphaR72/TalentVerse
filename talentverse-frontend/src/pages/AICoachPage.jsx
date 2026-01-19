import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const CORE = [
  { key: "priorities", label: "رتّب أولوياتي", prompt: "رتّب أولوياتي بناءً على وضعي الحالي." },
  { key: "weekly_plan", label: "خطة أسبوع", prompt: "اعمل لي خطة أسبوع عملية (أيام + مهام) حسب وقتي الحالي." },
  { key: "suggest_project", label: "اقترح مشروع", prompt: "اقترح مشروع صغير/متوسط يناسب مهاراتي الحالية ويبنيني بسرعة." },
  { key: "learn_now", label: "شو أتعلم الآن؟", prompt: "شو أتعلم الآن بالضبط خلال الأسبوع القادم؟ أعطني خطوات ومصادر." },
  { key: "diagnose", label: "تشخيص سريع", prompt: "اعمل معي تشخيص سريع: اسألني 5 أسئلة فقط وبعدين اعطني خطة." },
];

export default function AICoachPage() {
  const theme = useAdaptiveTheme();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [input, setInput] = useState("");
  const [intent, setIntent] = useState(""); // optional hint to backend
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "أهلًا! أنا كوتشك داخل TalentVerse. احكيلي باختصار: شو هدفك؟ شو المهارات اللي عندك؟ وشو أكبر شي معلّقك هالأسبوع؟",
    },
  ]);

  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const canSend = useMemo(() => !!input.trim() && !busy, [input, busy]);

  const push = (role, content) => setMessages((prev) => [...prev, { role, content }]);

  const applySuggestion = (s) => {
    // ✅ لا auto-send
    if (s?.type === "navigate" && s?.to) {
      navigate(s.to);
      return;
    }
    const txt = (s?.message || s?.label || "").trim();
    if (!txt) return;
    setInput(txt);
    if (s?.intent) setIntent(s.intent);
  };

  const applyCore = (c) => {
    setInput(c.prompt);
    setIntent(c.key);
  };

  const send = async () => {
    if (!user) return;
    const text = input.trim();
    if (!text) return;

    setBusy(true);
    setError("");

    push("user", text);
    setInput("");
    const usedIntent = intent;
    setIntent("");

    try {
      const payload = {
        firebase_uid: user.uid,
        email: user.email,
        message: text,
        intent: usedIntent || undefined,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      };

      // optional big5 cached
      try {
        const raw = localStorage.getItem("big5_percent");
        if (raw) payload.big5_percent = JSON.parse(raw);
      } catch {}
      try {
        const raw = localStorage.getItem("big5_label");
        if (raw) payload.big5_label = raw;
      } catch {}

      const res = await apiFetch("/ai/coach", { method: "POST", body: JSON.stringify(payload) });

      push("assistant", res?.assistant_message || "تمام. احكيلي أكثر عن هدفك ووقتك المتاح.");
      setSuggestions(Array.isArray(res?.suggestions) ? res.suggestions.slice(0, 6) : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "AI request failed.");
      push("assistant", "صار في مشكلة بسيطة. جرّب تاني أو اختصر طلبك بسطرين.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-space font-bold ${theme.textPrimary}`}>AI Coach</h1>
            <p className={`${theme.textSecondary} mt-1 text-sm md:text-base`}>دردشة حرة + اقتراحات ذكية ديناميكية.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/profile")} className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              Profile
            </button>
            <button onClick={() => navigate("/dashboard")} className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              Dashboard
            </button>
          </div>
        </div>

        {/* Core buttons (fill input only) */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-4 ${theme.backdropBlur} ${theme.cardShadow || ""} mb-5`}>
          <div className="flex flex-wrap gap-2">
            {CORE.map((c) => (
              <button
                key={c.key}
                onClick={() => applyCore(c)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-cyan-500/10 border-cyan-400/25 hover:bg-cyan-500/15 transition-all"
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className={`${theme.textSecondary} text-xs mt-3`}>ملاحظة: الأزرار بتكتب رسالة مقترحة فقط — وبعدين أنت بتضغط Send.</p>
        </div>

        {/* Chat */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl ${theme.backdropBlur} ${theme.cardShadow || ""}`}>
          <div className="p-5 md:p-6">
            <div className="h-[52vh] overflow-y-auto pr-2">
              {messages.map((m, idx) => (
                <div key={idx} className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-3 border ${m.role === "user" ? "bg-cyan-500/10 border-cyan-400/20" : "bg-white/5 border-white/10"}`}>
                    <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[86%] rounded-2xl px-4 py-3 border bg-white/5 border-white/10">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>عم فكّر…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Dynamic suggestions */}
            {suggestions?.length > 0 && (
              <div className="mt-4">
                <p className={`${theme.textSecondary} text-xs mb-2`}>اقتراحات (بتتغير حسب المحادثة):</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                      title={s?.message || s?.label}
                    >
                      {s?.label || "اقتراح"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Composer */}
            <div className="mt-5 flex flex-col md:flex-row gap-3">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter newline
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) send();
                  }
                }}
                placeholder="اكتب سؤالك بحرّية… (Enter للإرسال، Shift+Enter سطر جديد)"
                className={`flex-1 ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none`}
              />
              <button
                onClick={send}
                disabled={!canSend}
                className="px-5 py-3 rounded-xl text-sm font-semibold border bg-cyan-500/10 border-cyan-400/25 hover:bg-cyan-500/15 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            <p className={`${theme.textSecondary} text-xs mt-3`}>
              إذا حسّيت إنك عالق: اكتب “اسألني 5 أسئلة وبعدين أعطني خطة”.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
