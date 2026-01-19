import React, { useMemo, useState } from "react";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";
import { useNavigate } from "react-router-dom";

const CoachApplyPage = () => {
  const theme = useAdaptiveTheme();
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: user?.displayName || "",
    email: user?.email || "",
    field: "Frontend",
    years_experience: "",
    linkedin: "",
    github: "",
    portfolio: "",
    bio: "",
    motivation: "",
    availability_hours: "",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // {type,message}

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2600);
  };

  const canSubmit = useMemo(() => {
    if (!user) return false;
    if (!form.full_name.trim()) return false;
    if (!form.email.trim()) return false;
    if (!form.bio.trim()) return false;
    if (!form.motivation.trim()) return false;

    // لازم واحد من الروابط على الأقل
    const hasLink = form.github.trim() || form.linkedin.trim() || form.portfolio.trim();
    if (!hasLink) return false;

    return true;
  }, [form, user]);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async () => {
    if (!user) return showToast("error", "You must be logged in.");
    if (!canSubmit) return showToast("error", "Please fill required fields.");

    setLoading(true);
    try {
      // ✅ Endpoint مقترح: POST /coach-apply
      // (رح نضيفه بالباك اند لاحقاً)
      await apiFetch("/coach-apply", {
        method: "POST",
        body: JSON.stringify({
          firebase_uid: user.uid,
          email: user.email,
          ...form,
        }),
      });

      showToast("success", "Application submitted! We'll review it soon.");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (e) {
      showToast("error", "Failed to submit application. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-xl ${
              toast.type === "success"
                ? "bg-green-500/15 border-green-500/30 text-green-200"
                : toast.type === "error"
                ? "bg-red-500/15 border-red-500/30 text-red-200"
                : "bg-cyan-500/15 border-cyan-500/30 text-cyan-100"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-4 text-center">👨‍🏫 Apply to Become a Coach</h1>
        <p className={`${theme.textSecondary} text-center mb-10 max-w-2xl mx-auto`}>
          Send your info and proof of experience (GitHub/Portfolio/LinkedIn). Admin will review and approve your coach role.
        </p>

        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 ${theme.backdropBlur}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={`text-sm ${theme.textSecondary}`}>Full name *</label>
              <input
                value={form.full_name}
                onChange={onChange("full_name")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className={`text-sm ${theme.textSecondary}`}>Email *</label>
              <input
                value={form.email}
                onChange={onChange("email")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="Email"
              />
            </div>

            <div>
              <label className={`text-sm ${theme.textSecondary}`}>Field</label>
              <select
                value={form.field}
                onChange={onChange("field")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
              >
                <option>Frontend</option>
                <option>Backend</option>
                <option>Fullstack</option>
                <option>Mobile</option>
                <option>UI/UX</option>
                <option>Data</option>
                <option>DevOps</option>
              </select>
            </div>

            <div>
              <label className={`text-sm ${theme.textSecondary}`}>Years of experience</label>
              <input
                value={form.years_experience}
                onChange={onChange("years_experience")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="e.g. 2"
              />
            </div>

            <div>
              <label className={`text-sm ${theme.textSecondary}`}>GitHub *</label>
              <input
                value={form.github}
                onChange={onChange("github")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className={`text-sm ${theme.textSecondary}`}>LinkedIn</label>
              <input
                value={form.linkedin}
                onChange={onChange("linkedin")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="md:col-span-2">
              <label className={`text-sm ${theme.textSecondary}`}>Portfolio</label>
              <input
                value={form.portfolio}
                onChange={onChange("portfolio")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="https://your-portfolio.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className={`text-sm ${theme.textSecondary}`}>Short bio *</label>
              <textarea
                value={form.bio}
                onChange={onChange("bio")}
                rows={4}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none resize-none`}
                placeholder="Tell us about your background and skills..."
              />
            </div>

            <div className="md:col-span-2">
              <label className={`text-sm ${theme.textSecondary}`}>Why do you want to be a coach? *</label>
              <textarea
                value={form.motivation}
                onChange={onChange("motivation")}
                rows={4}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none resize-none`}
                placeholder="Your motivation, what you can offer learners..."
              />
            </div>

            <div className="md:col-span-2">
              <label className={`text-sm ${theme.textSecondary}`}>Availability (hours/week)</label>
              <input
                value={form.availability_hours}
                onChange={onChange("availability_hours")}
                className={`w-full mt-2 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={() => navigate("/dashboard")}
              className={`flex-1 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/10 transition`}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || loading}
              className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>

          <p className={`mt-5 text-xs ${theme.textSecondary}`}>
            * Required. Provide at least one link (GitHub / LinkedIn / Portfolio).
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoachApplyPage;
