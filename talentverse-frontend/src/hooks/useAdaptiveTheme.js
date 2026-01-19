// src/hooks/useAdaptiveTheme.js
import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase/firebase";
import { apiFetch } from "../config/api";

// ✅ Base theme
const defaultTheme = {
  mode: "calm",
  bgClass: "bg-[#050316]",
  glowClass: "from-[#2b62d1]/40 via-[#3b82f6]/30 to-transparent",
  pageBgClass: "bg-[#060318]",
  pageGlowClass: "bg-[#2b62d1]/40",

  cardBgClass: "bg-white/5",
  cardBorderClass: "border-white/10",
  gradientFrom: "from-indigo-500",
  gradientTo: "to-cyan-400",
  buttonGradient: "from-indigo-500 to-cyan-400",

  textPrimary: "text-white",
  textSecondary: "text-white/70",
  textAccent: "text-cyan-300",

  buttonHover: "hover:scale-[1.03]",
  cardShadow: "shadow-xl",
  backdropBlur: "backdrop-blur-xl",

  // extras used by MainLayout
  toolbarClass: "bg-[#050316]/90",
  sidebarClass: "bg-[#050316]/85",
  logoGradient: "bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-400",
  logoShadow: "shadow-indigo-500/40",
  avatarGradient: "bg-gradient-to-br from-white/20 via-white/10 to-transparent",
  avatarBorder: "border-white/35",
  logoutClass: "bg-white/5 border border-white/15",
  navActiveClass: "",
  navLinkActiveClass: "bg-indigo-500/20 text-white border border-indigo-400/60",
  navLinkInactiveClass: "text-white/70 hover:text-white hover:bg-white/5",
  footerTextClass: "text-white/40",
  modeTextClass: "text-cyan-300",
};

const themeVariations = {
  calm: {},

  grounded: {
    mode: "grounded",
    gradientFrom: "from-slate-600",
    gradientTo: "to-gray-500",
    buttonGradient: "from-slate-600 to-gray-500",
    pageGlowClass: "bg-[#64748b]/30",
    textSecondary: "text-white/80",
    textAccent: "text-slate-200",
    modeTextClass: "text-slate-200",
  },

  energetic: {
    mode: "energetic",
    gradientFrom: "from-cyan-500",
    gradientTo: "to-purple-500",
    buttonGradient: "from-cyan-500 to-purple-500",
    pageGlowClass: "bg-[#8b5cf6]/40",
    textAccent: "text-purple-200",
    modeTextClass: "text-purple-200",
  },

  focused: {
    mode: "focused",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-400",
    buttonGradient: "from-blue-500 to-cyan-400",
    pageGlowClass: "bg-[#2b62d1]/35",
    textAccent: "text-cyan-200",
    modeTextClass: "text-cyan-200",
  },
};

function safeParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function pickModeFromBig5(percent) {
  const O = percent?.O ?? 0;
  const C = percent?.C ?? 0;
  const E = percent?.E ?? 0;
  const N = percent?.N ?? 0;

  if (C <= 40 && N >= 65) return "grounded";
  if (O >= 65 && E >= 60) return "energetic";
  if (C >= 65) return "focused";
  return "calm";
}

// ✅ NAMED EXPORT (هذا اللي كل مشروعك عم يستورده)
export function useAdaptiveTheme() {
  const [theme, setTheme] = useState(defaultTheme);

  // اقرأ Big5 من localStorage (أقوى وأسرع وبدون backend)
  const localBig5 = useMemo(() => {
    const p = localStorage.getItem("big5_percent");
    return p ? safeParse(p) : null;
  }, []);

  useEffect(() => {
    // 1) لو في Big5 محلي -> اعتمد عليه فوراً
    if (localBig5 && typeof localBig5 === "object") {
      const mode = pickModeFromBig5(localBig5);
      setTheme({ ...defaultTheme, ...themeVariations[mode] });
      return;
    }

    // 2) fallback: حاول تجيب من backend (اختياري)
    const user = auth.currentUser;
    if (!user) {
      setTheme(defaultTheme);
      return;
    }

    (async () => {
      try {
        const data = await apiFetch(`/personality/${user.uid}`);
        const percent = data?.big5_percent;

        if (percent && typeof percent === "object") {
          const mode = pickModeFromBig5(percent);
          setTheme({ ...defaultTheme, ...themeVariations[mode] });
          return;
        }

        // fallback قديم (إذا كان الباكند بيرجع motivation/clarity)
        const motivation = data?.motivation_state || "medium";
        const clarity = data?.clarity_level || "clear";
        const learningStyle = data?.learning_style || "guided";

        let selectedMode = "calm";
        if (motivation === "low" && clarity === "lost") selectedMode = "grounded";
        else if (motivation === "high" && learningStyle === "self") selectedMode = "energetic";
        else if (motivation === "high") selectedMode = "focused";

        setTheme({ ...defaultTheme, ...themeVariations[selectedMode] });
      } catch {
        setTheme(defaultTheme);
      }
    })();
  }, [localBig5]);

  return theme;
}

// ✅ DEFAULT EXPORT كمان حتى لو في ملفات قديمة بتستخدمه
export default useAdaptiveTheme;
