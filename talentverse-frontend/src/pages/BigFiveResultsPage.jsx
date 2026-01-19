import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const BigFiveResultsPage = () => {
  const theme = useAdaptiveTheme();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [percent, setPercent] = useState(state?.percent || null);
  const [label, setLabel] = useState(state?.label || null);

  useEffect(() => {
    if (!percent) {
      const saved = localStorage.getItem("big5_percent");
      const savedLabel = localStorage.getItem("personality_label");
      if (saved) {
        try {
          setPercent(JSON.parse(saved));
          setLabel(savedLabel || "Balanced Learner");
        } catch {
          navigate("/big5");
        }
      } else {
        navigate("/big5");
      }
    }
  }, [percent, navigate]);

  const traits = useMemo(
    () => [
      { key: "O", title: "Openness", emoji: "🎨", hint: "Creativity, curiosity, exploration" },
      { key: "C", title: "Conscientiousness", emoji: "✅", hint: "Discipline, structure, consistency" },
      { key: "E", title: "Extraversion", emoji: "🗣️", hint: "Social energy, assertiveness" },
      { key: "A", title: "Agreeableness", emoji: "🤝", hint: "Empathy, cooperation, trust" },
      { key: "N", title: "Neuroticism", emoji: "🌧️", hint: "Stress sensitivity, emotional reactivity" },
    ],
    []
  );

  const advice = useMemo(() => {
    if (!percent) return [];
    const O = percent.O ?? 0;
    const C = percent.C ?? 0;
    const E = percent.E ?? 0;
    const A = percent.A ?? 0;
    const N = percent.N ?? 0;

    const list = [];

    if (C < 45) list.push("📌 Build a simple weekly plan (3 priorities only) to highlight focus and consistency.");
    if (C >= 65) list.push("✅ You thrive with milestones — we’ll use structured tasks and measurable progress.");
    if (O >= 65) list.push("🎨 You learn best with creative projects and exploration — we’ll give you flexible learning paths.");
    if (E >= 60) list.push("🤝 Collaboration boosts your progress — we’ll suggest peers and teamwork-based learning.");
    if (A >= 60) list.push("💬 You work well in supportive environments — pair programming and mentorship can help a lot.");
    if (N >= 65) list.push("🌿 Stress can reduce momentum — we’ll add small steps + reminders + gentle accountability.");

    if (list.length === 0) {
      list.push("✨ You have a balanced profile — we’ll combine structure + flexibility to keep you progressing steadily.");
    }

    return list;
  }, [percent]);

  if (!percent) return null;

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-5xl mx-auto py-10 md:py-14 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-space font-bold mb-3">Your Personality Profile</h1>
          <p className={`${theme.textSecondary} text-lg`}>
            Scientific Big Five results — translated into a clear, usable learning profile.
          </p>
        </div>

        {/* Label Card */}
        <div className={`bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-space mb-2">✨ Your Label</h2>
              <p className="text-3xl font-bold">{label || "Balanced Learner"}</p>
              <p className={`${theme.textSecondary} mt-2`}>
                This label helps the app communicate your style clearly (the core model is still Big Five).
              </p>
            </div>
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center text-4xl font-bold shadow-xl`}>
              OCEAN
            </div>
          </div>
        </div>

        {/* Bars */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 md:p-8 ${theme.backdropBlur} shadow-xl mb-10`}>
          <h3 className="text-2xl font-space mb-6">📊 Your OCEAN Scores</h3>

          <div className="space-y-5">
            {traits.map((t) => {
              const val = Math.max(0, Math.min(100, percent[t.key] ?? 0));
              return (
                <div key={t.key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center`}>
                        {t.emoji}
                      </div>
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className={`${theme.textSecondary} text-xs`}>{t.hint}</div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${theme.textAccent}`}>{val}%</div>
                  </div>

                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all duration-700`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 md:p-8 ${theme.backdropBlur} shadow-xl mb-10`}>
          <h3 className="text-2xl font-space mb-4">🤖 What this means for your learning</h3>
          <ul className="list-disc pl-6 space-y-2">
            {advice.map((a, i) => (
              <li key={i} className={theme.textSecondary}>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Continue */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate("/profile")}
            className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.02] transition`}
          >
            📝 Continue to Profile Setup
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className={`flex-1 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/10 transition`}
          >
            🏠 Skip to Dashboard
          </button>
        </div>

        <p className={`${theme.textSecondary} text-sm text-center mt-8`}>
          💡 Personality is a guide, not a limit — we use it to reduce confusion and improve your priorities.
        </p>
      </div>
    </div>
  );
};

export default BigFiveResultsPage;
