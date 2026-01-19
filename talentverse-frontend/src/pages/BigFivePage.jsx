import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

// Big Five — 25 سؤال (OCEAN) — مقياس 1..5
// Reverse: إذا reverse=true => score = 6 - value
const BIG5_QUESTIONS = [
  // Openness (O)
  { id: 1, trait: "O", text: "I enjoy exploring new ideas and unusual concepts.", reverse: false },
  { id: 2, trait: "O", text: "I am curious about many different things.", reverse: false },
  { id: 3, trait: "O", text: "I appreciate art, design, or creative expression.", reverse: false },
  { id: 4, trait: "O", text: "I prefer routines over variety.", reverse: true },
  { id: 5, trait: "O", text: "I like learning for the sake of learning.", reverse: false },

  // Conscientiousness (C)
  { id: 6, trait: "C", text: "I keep my commitments and finish what I start.", reverse: false },
  { id: 7, trait: "C", text: "I plan ahead and organize my tasks.", reverse: false },
  { id: 8, trait: "C", text: "I often procrastinate even when tasks are important.", reverse: true },
  { id: 9, trait: "C", text: "I pay attention to details.", reverse: false },
  { id: 10, trait: "C", text: "I prefer clear goals and measurable progress.", reverse: false },

  // Extraversion (E)
  { id: 11, trait: "E", text: "I feel energized when I interact with people.", reverse: false },
  { id: 12, trait: "E", text: "I enjoy leading discussions or taking initiative in groups.", reverse: false },
  { id: 13, trait: "E", text: "I prefer quiet time alone rather than social activities.", reverse: true },
  { id: 14, trait: "E", text: "I find it easy to start conversations.", reverse: false },
  { id: 15, trait: "E", text: "I am comfortable being the center of attention.", reverse: false },

  // Agreeableness (A)
  { id: 16, trait: "A", text: "I try to understand others’ feelings and perspectives.", reverse: false },
  { id: 17, trait: "A", text: "I avoid unnecessary conflict and prefer harmony.", reverse: false },
  { id: 18, trait: "A", text: "I can be blunt even if it hurts people’s feelings.", reverse: true },
  { id: 19, trait: "A", text: "I enjoy helping others succeed.", reverse: false },
  { id: 20, trait: "A", text: "I am generally patient and cooperative.", reverse: false },

  // Neuroticism (N)
  { id: 21, trait: "N", text: "I often feel stressed or worried about the future.", reverse: false },
  { id: 22, trait: "N", text: "I get anxious easily when things are uncertain.", reverse: false },
  { id: 23, trait: "N", text: "I stay calm under pressure.", reverse: true },
  { id: 24, trait: "N", text: "I take criticism personally.", reverse: false },
  { id: 25, trait: "N", text: "My mood can change quickly.", reverse: false },
];

const SCALE = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const STORAGE_KEY = "big5_answers_v1";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const BigFivePage = () => {
  const navigate = useNavigate();
  const theme = useAdaptiveTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") setAnswers(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const total = BIG5_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progress = clamp((answeredCount / total) * 100, 0, 100);
  const isLast = currentIndex === total - 1;

  const currentQ = BIG5_QUESTIONS[currentIndex];

  const traitLabels = useMemo(
    () => ({
      O: { title: "Openness", emoji: "🎨", hint: "Curiosity & creativity" },
      C: { title: "Conscientiousness", emoji: "✅", hint: "Discipline & structure" },
      E: { title: "Extraversion", emoji: "🗣️", hint: "Energy from people" },
      A: { title: "Agreeableness", emoji: "🤝", hint: "Cooperation & empathy" },
      N: { title: "Neuroticism", emoji: "🌧️", hint: "Stress sensitivity" },
    }),
    []
  );

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    if (currentIndex < total - 1) {
      setTimeout(() => setCurrentIndex((p) => p + 1), 220);
    }
  };

  const goPrev = () => setCurrentIndex((p) => Math.max(0, p - 1));
  const goNext = () => setCurrentIndex((p) => Math.min(total - 1, p + 1));

  const computeScores = () => {
    const sum = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    const count = { O: 0, C: 0, E: 0, A: 0, N: 0 };

    BIG5_QUESTIONS.forEach((q) => {
      const v = answers[q.id];
      if (!v) return;
      const scored = q.reverse ? 6 - v : v;
      sum[q.trait] += scored;
      count[q.trait] += 1;
    });

    const percent = {};
    Object.keys(sum).forEach((t) => {
      const c = count[t] || 0;
      if (c === 0) percent[t] = 0;
      else {
        const avg = sum[t] / c; // 1..5
        percent[t] = Math.round(((avg - 1) / 4) * 100);
      }
    });

    return { sum, count, percent };
  };

  const buildReadableLabel = (percent) => {
    const O = percent.O ?? 0;
    const C = percent.C ?? 0;
    const E = percent.E ?? 0;
    const N = percent.N ?? 0;

    const creative = O >= 65;
    const structured = C >= 65;
    const social = E >= 60;
    const sensitive = N >= 65;

    if (creative && structured) return "Creative Strategist";
    if (creative && !structured) return "Curious Explorer";
    if (!creative && structured) return "Practical Builder";
    if (social && structured) return "Team Leader";
    if (social && creative) return "Energetic Creator";
    if (sensitive && creative) return "Deep Thinker";
    if (sensitive && structured) return "Careful Planner";
    return "Balanced Learner";
  };

  const submit = async () => {
    if (answeredCount < total) return;
    setSubmitting(true);

    const { sum, percent } = computeScores();
    const label = buildReadableLabel(percent);

    // ✅ Save locally (core)
    localStorage.setItem("big5_completed", "true");
    localStorage.setItem("big5_percent", JSON.stringify(percent));
    localStorage.setItem("big5_sum", JSON.stringify(sum));
    localStorage.setItem("personality_label", label);

    // ✅ attempt save to backend (non-blocking)
    const user = auth.currentUser;
    if (user) {
      try {
        await apiFetch("/save-big5", {
          method: "POST",
          body: JSON.stringify({
            firebase_uid: user.uid,
            email: user.email,
            model: "big5_v1",
            answers,
            scores_sum: sum,
            scores_percent: percent,
            label,
          }),
        });
      } catch {
        // ignore (local is enough for university demo)
      }
    }

    localStorage.removeItem(STORAGE_KEY);

    navigate("/big5-results", {
      state: {
        percent,
        label,
        isLocal: !user,
      },
    });
  };

  useEffect(() => {
    if (answeredCount === total) {
      const timer = setTimeout(() => submit(), 900);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount]);

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      {/* Glow */}
      <div className="absolute top-10 left-20 w-96 h-96 bg-[#2b62d1]/70 rounded-full blur-[120px]"></div>
      <div className="absolute top-1/4 right-24 w-80 h-80 bg-[#2b62d1]/70 rounded-full blur-[130px]"></div>
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-[#2b62d1]/60 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-10 right-1/5 w-96 h-96 bg-[#2b62d1]/60 rounded-full blur-[130px]"></div>
      <div className="absolute top-[20%] left-2/5 w-72 h-72 bg-[#2b62d1]/50 rounded-full blur-[110px]"></div>

      <div className="relative z-10 max-w-4xl mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-space font-bold mb-3">🧠 Big Five Personality Test</h1>
          <p className={`${theme.textSecondary} text-lg`}>
            Quick, scientific, and actionable. This helps your AI Coach build the right learning plan for you.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className={`${theme.textSecondary} text-sm`}>
              {answeredCount} / {total} answered
            </span>
            <span className={`${theme.textAccent} font-medium`}>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 md:p-8 ${theme.backdropBlur} shadow-xl`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
              <span className="text-sm">
                {traitLabels[currentQ.trait].emoji} {traitLabels[currentQ.trait].title}
              </span>
              <span className={`${theme.textSecondary} text-xs`}>• {traitLabels[currentQ.trait].hint}</span>
            </div>
            <div className={`${theme.textSecondary} text-xs`}>
              Question {currentIndex + 1} / {total}
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-space mb-6 leading-relaxed">{currentQ.text}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {SCALE.map((s) => {
              const selected = answers[currentQ.id] === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setAnswer(currentQ.id, s.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-sm sm:text-xs md:text-sm ${
                    selected
                      ? `bg-gradient-to-r ${theme.buttonGradient} border-transparent shadow-lg scale-[1.01]`
                      : `${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/10`
                  }`}
                  title={s.label}
                >
                  <div className="font-semibold">{s.value}</div>
                  <div className="opacity-80 mt-1">{s.label}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={`px-5 py-2.5 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} transition ${
                currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
              } w-full sm:w-auto`}
            >
              ← Previous
            </button>

            <div className="text-center">
              <p className={`${theme.textSecondary} text-xs`}>Answer honestly based on your most common behavior.</p>
            </div>

            {isLast ? (
              <button
                onClick={submit}
                disabled={answeredCount < total || submitting}
                className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-medium transition ${
                  answeredCount < total || submitting ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.03] shadow-lg"
                } w-full sm:w-auto`}
              >
                {submitting ? "Analyzing..." : "View Results"}
              </button>
            ) : (
              <button
                onClick={goNext}
                className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-medium transition hover:scale-[1.03] w-full sm:w-auto`}
              >
                Next →
              </button>
            )}
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-xl bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-medium mb-1">Tips:</p>
              <p className={`${theme.textSecondary} text-sm`}>
                • Don’t overthink — go with your first instinct. <br />
                • Answer based on your usual days, not rare situations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {submitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 text-center max-w-sm`}>
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-space mb-2">Generating your profile...</h3>
            <p className={`${theme.textSecondary}`}>Turning your answers into actionable insights.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BigFivePage;
