import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const fallbackCourses = [
  {
    id: "mdn-js",
    title: "JavaScript — MDN Guide",
    provider: "MDN",
    level: "Beginner",
    duration: "6–10h",
    tags: ["JavaScript", "Fundamentals"],
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    reason: "Strong fundamentals from an authoritative source.",
  },
  {
    id: "react-docs",
    title: "React — Official Docs (Learn)",
    provider: "React",
    level: "Beginner",
    duration: "5–8h",
    tags: ["React", "Components"],
    url: "https://react.dev/learn",
    reason: "Best starting point for React in 2025+.",
  },
  {
    id: "freecodecamp-js",
    title: "JavaScript Algorithms and Data Structures",
    provider: "freeCodeCamp",
    level: "Beginner",
    duration: "20–40h",
    tags: ["JavaScript", "Practice"],
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
    reason: "Practice-heavy and structured.",
  },
  {
    id: "web-dev-http",
    title: "HTTP — Web.dev Basics",
    provider: "web.dev",
    level: "Beginner",
    duration: "1–2h",
    tags: ["Web", "HTTP"],
    url: "https://web.dev/learn/",
    reason: "Short + practical web fundamentals.",
  },
];

const normalizeLevel = (lvl) => (lvl || "").toLowerCase();

const CoursesPage = () => {
  const theme = useAdaptiveTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileData, analysisData] = await Promise.all([
          apiFetch(`/profile/${user.uid}`).catch(() => null),
          apiFetch(`/analysis/${user.uid}`).catch(() => null),
        ]);

        setProfile(profileData);
        setAnalysis(analysisData);

        // ✅ اقتراح: خلّي الباك اند يرجع كورسات حسب uid
        // GET /courses/<firebase_uid>
        const coursesData = await apiFetch(`/courses/${user.uid}`).catch(() => null);

        if (coursesData?.courses && Array.isArray(coursesData.courses)) {
          setCourses(coursesData.courses);
        } else {
          setCourses(fallbackCourses);
        }
      } catch (e) {
        setCourses(fallbackCourses);
        setError("Couldn't load courses right now. Showing default recommendations.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const allTags = useMemo(() => {
    const t = new Set();
    (courses || []).forEach((c) => (c.tags || []).forEach((x) => t.add(x)));
    return ["all", ...Array.from(t)];
  }, [courses]);

  const personalizedHint = useMemo(() => {
    const gaps = analysis?.gaps || [];
    const direction = analysis?.direction || "General Developer";

    if (!gaps.length) return `Recommended for your path: ${direction}`;
    return `Focus area: ${gaps[0]} • Path: ${direction}`;
  }, [analysis]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (courses || []).filter((c) => {
      const matchesQuery =
        !q ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.provider || "").toLowerCase().includes(q) ||
        (c.tags || []).some((t) => (t || "").toLowerCase().includes(q));

      const matchesLevel =
        levelFilter === "all" || normalizeLevel(c.level) === normalizeLevel(levelFilter);

      const matchesTag =
        tagFilter === "all" || (c.tags || []).includes(tagFilter);

      return matchesQuery && matchesLevel && matchesTag;
    });
  }, [courses, query, levelFilter, tagFilter]);

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        Loading courses...
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`} />

      <div className="relative z-10 max-w-6xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-4 text-center">📚 Course Recommendations</h1>

        <p className={`${theme.textSecondary} text-center mb-10 max-w-3xl mx-auto`}>
          Courses selected based on your profile and skill gaps. {profile?.display_name ? `Welcome, ${profile.display_name}!` : ""}
        </p>

        <div className={`mb-8 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-space mb-1">🎯 Personalized Focus</h2>
              <p className={theme.textSecondary}>{personalizedHint}</p>
              {error && <p className="text-red-300 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title / provider / tag..."
                className={`w-full sm:w-72 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
              />

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className={`px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
              >
                <option value="all">All levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={`px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
              >
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "All tags" : t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-10 ${theme.backdropBlur} text-center`}>
            <div className="text-5xl mb-4">😅</div>
            <h3 className="text-2xl font-space mb-2">No courses found</h3>
            <p className={theme.textSecondary}>Try changing filters or search text.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((c) => (
              <div
                key={c.id || c.url}
                className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow} hover:bg-white/10 transition`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-2xl font-space leading-tight">{c.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs ${theme.cardBgClass} border ${theme.cardBorderClass}`}>
                    {c.level || "Any"}
                  </span>
                </div>

                <p className={`${theme.textSecondary} text-sm mb-4`}>
                  Provider: <span className="text-white/80">{c.provider || "—"}</span>
                  {c.duration ? <span className="text-white/50"> • {c.duration}</span> : null}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(c.tags || []).slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className={`px-3 py-1 rounded-full text-xs ${theme.cardBgClass} border ${theme.cardBorderClass}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {c.reason && <p className={`${theme.textSecondary} text-sm mb-5`}>💡 {c.reason}</p>}

                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full block text-center py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold ${theme.buttonHover} transition`}
                >
                  Open course
                </a>
              </div>
            ))}
          </div>
        )}

        <div className={`mt-14 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 ${theme.backdropBlur}`}>
          <h3 className="text-2xl font-space mb-3">🧠 How recommendations work (for now)</h3>
          <p className={theme.textSecondary}>
            In v1, we recommend courses based on your analysis gaps + profile level. Later, we’ll connect a real
            course catalog source and rank results dynamically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
