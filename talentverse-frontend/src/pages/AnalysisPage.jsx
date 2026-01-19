import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const AnalysisPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const theme = useAdaptiveTheme();

  if (!state) {
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex flex-col items-center justify-center ${theme.textPrimary}`}>
        <h1 className="text-3xl font-space mb-4">No analysis data found</h1>
        <button
          onClick={() => navigate("/profile")}
          className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} ${theme.textPrimary}`}
        >
          Go to Profile
        </button>
      </div>
    );
  }

  const { direction, strengths, gaps, recommendations } = state;

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>

      {/* Glow */}
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-4xl mx-auto py-20 px-6">

        <h1 className="text-5xl font-space font-bold mb-10 text-center">
          Your Skill Analysis
        </h1>

        {/* Career Direction */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-3">🎯 Career Direction</h2>
          <p className={`${theme.textSecondary} text-lg`}>{direction}</p>
        </div>

        {/* Strengths */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-3">💪 Strengths</h2>
          <ul className="list-disc pl-6 space-y-2">
            {strengths?.map((s, i) => (
              <li key={i} className={theme.textSecondary}>{s}</li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-3">⚠️ Skill Gaps</h2>
          <ul className="list-disc pl-6 space-y-2">
            {gaps?.map((g, i) => (
              <li key={i} className={theme.textSecondary}>{g}</li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className={`bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <h2 className="text-2xl font-space mb-3">🤖 AI Recommendations</h2>
          <ul className="list-disc pl-6 space-y-2">
            {recommendations?.map((r, i) => (
              <li key={i} className={theme.textSecondary}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center mt-12">
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-10 py-4 rounded-xl bg-gradient-to-r ${theme.buttonGradient} ${theme.textPrimary} text-lg font-semibold ${theme.buttonHover} transition`}
          >
            Continue to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default AnalysisPage;