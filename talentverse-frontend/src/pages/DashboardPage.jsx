import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const DashboardPage = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const theme = useAdaptiveTheme();

  const [analysis, setAnalysis] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const calculateProgress = () => {
    let steps = 0;
    if (personality) steps += 1;
    if (profile) steps += 1;
    if (analysis) steps += 1;
    return Math.round((steps / 3) * 100);
  };

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const [analysisData, personalityData, profileData] = await Promise.all([
          apiFetch(`/analysis/${user.uid}`).catch(() => null),
          apiFetch(`/personality/${user.uid}`).catch(() => null),
          apiFetch(`/profile/${user.uid}`).catch(() => null),
        ]);

        setAnalysis(analysisData);
        setPersonality(personalityData);
        setProfile(profileData);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );

  let nextAction = "Continue your learning plan";
  let recommendation = "You're doing well. Keep progressing with your personalized plan.";
  let ctaPath = "/learning-plan";

  if (personality) {
    if (personality.clarity_level === "lost") {
      nextAction = "Talk to a coach";
      recommendation = "You seem unsure about your direction. A coach can help you gain clarity.";
      ctaPath = "/matching";
    } else if (personality.motivation_state === "low") {
      nextAction = "Follow small learning steps";
      recommendation = "Let's keep things light. Small consistent steps will get you back on track.";
      ctaPath = "/learning-plan";
    } else if (personality.learning_style === "self") {
      nextAction = "Start a hands-on project";
      recommendation = "You learn best by doing. Projects will boost your skills faster.";
      ctaPath = "/projects";
    }
  }

  const isJunior = analysis?.direction && analysis.direction.toLowerCase().includes("junior");

  const progress = calculateProgress();
  const displayName = user?.displayName || profile?.display_name || "Friend";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`} />

      <div className="relative z-10 max-w-4xl mx-auto py-20 px-6">
        <div className="flex items-center gap-4 mb-10">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/30`}>
            {userInitial}
          </div>

          <div>
            <h1 className="text-4xl font-space font-bold">Welcome back, {displayName}!</h1>
            <p className={`${theme.textSecondary} text-sm mt-1`}>Your personalized learning journey continues</p>
          </div>
        </div>

        <div className="mb-10">
          <p className={`${theme.textSecondary} mb-2`}>Your onboarding progress</p>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all duration-500`} style={{ width: `${progress}%` }} />
          </div>
          <p className={`${theme.textSecondary} text-sm mt-2`}>{progress}% completed</p>
        </div>

        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur} ${theme.cardShadow}`}>
          <h2 className="text-2xl font-space mb-2">Your Career Path</h2>
          <p className={theme.textSecondary}>{analysis?.direction || "Not set yet"}</p>
        </div>

        <div className={`bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur} ${theme.cardShadow}`}>
          <h3 className="text-xl font-space mb-2">🚀 What you should do next</h3>
          <p className="text-2xl font-bold mb-2">{nextAction}</p>
          <p className={`${theme.textSecondary} mb-6`}>{recommendation}</p>

          <button
            onClick={() => navigate(ctaPath)}
            className={`px-8 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-cyan-500/30`}
          >
            Go
          </button>
        </div>

        {isJunior && (
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur} ${theme.cardShadow}`}>
            <h3 className="text-xl font-space mb-2">💡 Beginner Tip</h3>
            <p className={theme.textSecondary}>Focus on fundamentals first. Don't rush — consistency beats speed.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-10">
          {[
            ["📚", "Learning Plan", "/learning-plan"],
            ["🛠", "Projects", "/projects"],
            ["🤝", "Peer / Coach", "/matching"],
            ["📊", "Skill Analysis", "/analysis"],
            ["🤖", "AI Coach", "/ai-coach"],
            ["🧩", "Collaboration Room", "/collaboration"],
          ].map(([icon, label, path]) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-xl py-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <span className="font-medium">{label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${theme.cardBgClass} border ${theme.cardBorderClass}`}>
            <div
              className={`w-3 h-3 rounded-full ${
                theme.mode === "calm"
                  ? "bg-indigo-500"
                  : theme.mode === "focused"
                  ? "bg-blue-500"
                  : theme.mode === "energetic"
                  ? "bg-purple-500"
                  : theme.mode === "grounded"
                  ? "bg-gray-500"
                  : "bg-cyan-500"
              }`}
            />
            <span className={`${theme.textSecondary} text-sm`}>
              {theme.mode.charAt(0).toUpperCase() + theme.mode.slice(1)} Mode
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
