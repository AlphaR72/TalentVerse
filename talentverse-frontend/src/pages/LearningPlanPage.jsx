import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const LearningPlanPage = () => {
  const user = auth.currentUser;
  const theme = useAdaptiveTheme();

  const [analysis, setAnalysis] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const modules = [
    {
      title: "Foundations",
      description: "Learn the core fundamentals you need before diving deeper.",
      tasks: ["HTML basics", "CSS layout", "JavaScript syntax"],
    },
    {
      title: "Core Skills",
      description: "Build real skills with hands-on practice.",
      tasks: ["DOM manipulation", "API requests", "Async programming"],
    },
    {
      title: "Projects",
      description: "Apply your skills in real-world projects.",
      tasks: ["Build a portfolio", "Clone a website", "Create a dashboard"],
    },
  ];

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const [analysisData, profileData] = await Promise.all([
          apiFetch(`/analysis/${user.uid}`).catch(() => null),
          apiFetch(`/profile/${user.uid}`).catch(() => null),
        ]);
        setAnalysis(analysisData);
        setProfile(profileData);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        Loading your learning plan...
      </div>
    );

  const nextStep = analysis?.gaps?.length ? analysis.gaps[0] : "Start with the fundamentals";

  const weeklyFocus =
    profile?.level === "beginner"
      ? "Focus on building strong fundamentals this week."
      : "Work on improving your weak points and building projects.";

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-5xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-10 text-center">Your Learning Plan</h1>

        <div className={`bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-2">🚀 Your Next Step</h2>
          <p className="text-xl font-semibold mb-2">{nextStep}</p>
          <p className={theme.textSecondary}>Based on your analysis, this is the most impactful thing to work on now.</p>
        </div>

        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-14 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-2">📅 This Week</h2>
          <p className={theme.textSecondary}>{weeklyFocus}</p>
        </div>

        <h2 className="text-3xl font-space font-bold mb-6">📘 Learning Timeline</h2>

        <div className="relative border-l border-white/20 pl-8 space-y-10">
          {modules.map((module, index) => (
            <div key={index} className="relative">
              <div className={`absolute -left-[14px] top-2 w-6 h-6 rounded-full bg-gradient-to-br ${theme.buttonGradient}`}></div>

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow}`}>
                <h3 className="text-2xl font-space mb-2">{module.title}</h3>
                <p className={`${theme.textSecondary} mb-4`}>{module.description}</p>

                <ul className="space-y-2">
                  {module.tasks.map((task, i) => (
                    <li key={i} className={`flex items-center gap-3 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-xl p-3`}>
                      <div className={`w-4 h-4 rounded-full ${theme.textAccent}`}></div>
                      <span className={theme.textSecondary}>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningPlanPage;
