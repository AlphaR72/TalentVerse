import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const parseTags = (value) => {
  if (!value) return [];
  const parts = value
    .split(/[,|\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 40);
};

const tagsToText = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

const isDataUrl = (v) => typeof v === "string" && v.startsWith("data:image/");

const safeObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

const DEFAULT_META_MIN = {
  skills: [],
  interests: [],
  links: { github: "", linkedin: "", portfolio: "" },
};

const clamp = (s, max) => (typeof s === "string" ? s.slice(0, max) : s);

const UserProfile = () => {
  const theme = useAdaptiveTheme();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // {type, msg}
  const toastTimer = useRef(null);

  const showToast = (type, msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // Core
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("");

  // IMPORTANT:
  // avatarSrc is what we show in UI (can be URL or dataURL).
  // firebasePhotoURL stays as-is; we won't push dataURL into Firebase.
  const [avatarSrc, setAvatarSrc] = useState(user?.photoURL || "");

  // Minimal meta stored inside profile.interests as object
  const [meta, setMeta] = useState({ ...DEFAULT_META_MIN });

  // Raw text states to keep typing stable
  const [skillsText, setSkillsText] = useState("");
  const [interestsText, setInterestsText] = useState("");

  // Upload
  const fileInputRef = useRef(null);

  const completion = useMemo(() => {
    let s = 0;
    if (displayName?.trim()) s += 25;
    if (bio?.trim()) s += 15;
    if (meta.skills?.length) s += 25;
    if (meta.interests?.length) s += 15;
    if ((meta.links?.github || meta.links?.linkedin || meta.links?.portfolio)?.trim()) s += 20;
    return Math.min(100, s);
  }, [displayName, bio, meta]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/profile/${user.uid}`).catch(() => null);

        const dbDisplay = data?.display_name || user.displayName || "";
        const dbAvatar = data?.avatar || user.photoURL || "";
        const dbBio = data?.bio || "";

        let nextMeta = { ...DEFAULT_META_MIN };
        const raw = data?.interests;

        const obj = safeObject(raw);
        if (obj) {
          nextMeta = {
            ...DEFAULT_META_MIN,
            ...obj,
            links: { ...DEFAULT_META_MIN.links, ...(obj.links || {}) },
          };
        } else if (Array.isArray(raw)) {
          nextMeta = {
            ...DEFAULT_META_MIN,
            interests: raw,
            links: { ...DEFAULT_META_MIN.links },
          };
        }

        setDisplayName(dbDisplay);
        setAvatarSrc(dbAvatar);
        setBio(dbBio);
        setMeta(nextMeta);

        // init raw texts (stable typing)
        setSkillsText(tagsToText(nextMeta.skills));
        setInterestsText(tagsToText(nextMeta.interests));

        if (data && (data.display_name || data.bio || data.avatar || data.interests)) {
          localStorage.setItem("profile_completed", "true");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const updateLink = (key, value) => {
    setMeta((prev) => ({
      ...prev,
      links: {
        ...DEFAULT_META_MIN.links,
        ...(prev.links || {}),
        [key]: value,
      },
    }));
  };

  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onAvatarFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please choose an image file");
      return;
    }

    // For MVP: small cap to avoid huge base64 in DB
    const maxBytes = 900 * 1024; // ~0.9MB
    if (file.size > maxBytes) {
      showToast("error", "Image is too large (max ~0.9MB). Use a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatarSrc(dataUrl);
      showToast("success", "Avatar selected");
    };
    reader.onerror = () => showToast("error", "Failed to read image");
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    if (!user) {
      setError("You must be logged in");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // Keep meta minimal
      const nextMeta = {
        ...DEFAULT_META_MIN,
        ...meta,
        skills: parseTags(skillsText),
        interests: parseTags(interestsText),
        links: { ...DEFAULT_META_MIN.links, ...(meta.links || {}) },
      };

      // Persist to backend (profile table)
      await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({
          firebase_uid: user.uid,
          email: user.email,
          display_name: clamp(displayName, 60),
          avatar: avatarSrc, // can be URL or dataURL (MVP)
          bio: clamp(bio, 400),
          interests: nextMeta, // store meta container
        }),
      });

      // Update Firebase profile:
      // ✅ Always safe: displayName
      // ❌ Do NOT set photoURL if it's a dataURL (too long => Firebase error)
      if (isDataUrl(avatarSrc)) {
        await updateProfile(user, { displayName: clamp(displayName, 60) });
      } else {
        await updateProfile(user, { displayName: clamp(displayName, 60), photoURL: avatarSrc || "" });
      }

      setMeta(nextMeta);
      localStorage.setItem("profile_completed", "true");
      showToast("success", "Profile saved");
      setEditMode(false);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not save profile");
      showToast("error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div
        className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.cardBgClass} ${theme.backdropBlur} shadow-lg`}
          >
            <span
              className={`${
                toast.type === "success"
                  ? "text-emerald-300"
                  : toast.type === "error"
                  ? "text-red-300"
                  : "text-cyan-300"
              } text-sm font-medium`}
            >
              {toast.msg}
            </span>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-14">
        {/* Header */}
        <div
          className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-3xl p-8 ${theme.backdropBlur} ${
            theme.cardShadow || ""
          } mb-8`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                {avatarSrc?.trim() ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-16 h-16 rounded-2xl object-cover border border-white/15"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-xl font-bold">
                    {initial}
                  </div>
                )}
                <div className="absolute -inset-2 rounded-3xl bg-cyan-500/10 blur-xl -z-10" />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarFile(e.target.files?.[0])}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className={`text-2xl md:text-3xl font-space font-bold ${theme.textPrimary}`}>
                    {displayName?.trim() ? displayName : "Your Profile"}
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90">
                    User
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-400/20 text-cyan-200">
                    {completion}% complete
                  </span>
                </div>

                <p className={`${theme.textSecondary} mt-2 text-sm md:text-base max-w-2xl`}>
                  {bio?.trim() ? bio : "Keep it short: what you do + what you need help with."}
                </p>

                <div className="mt-4">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-white/20" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 md:justify-end">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => navigate("/ai-coach")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-cyan-500/10 border-cyan-400/25 hover:bg-cyan-500/15 transition-all"
              >
                Ask AI
              </button>

              <button
                type="button"
                onClick={() => navigate("/analysis")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
              >
                Analyze my skills
              </button>

              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/10 border-white/15 hover:bg-white/15 transition-all"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/10 border-white/15 hover:bg-white/15 transition-all disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSkillsText(tagsToText(meta.skills));
                      setInterestsText(tagsToText(meta.interests));
                      setEditMode(false);
                      showToast("info", "Canceled");
                    }}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5 px-4 py-3 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basics */}
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow || ""}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className={`text-lg font-space font-semibold ${theme.textPrimary}`}>Basics</h3>
                <p className={`${theme.textSecondary} text-sm mt-1`}>Only what powers the product.</p>
              </div>
              {editMode ? (
                <button
                  type="button"
                  onClick={onPickAvatar}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                >
                  Upload avatar
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>Display name</label>
                {editMode ? (
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your nickname"
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                  />
                ) : (
                  <p className="mt-2">{displayName?.trim() ? displayName : <span className="text-white/50">—</span>}</p>
                )}
              </div>

              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>Bio</label>
                {editMode ? (
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What are you good at? What are you currently stuck on?"
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none`}
                  />
                ) : (
                  <p className="mt-2">{bio?.trim() ? bio : <span className="text-white/50">—</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Skills & Interests */}
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow || ""}`}>
            <div className="mb-4">
              <h3 className={`text-lg font-space font-semibold ${theme.textPrimary}`}>Skills & Interests</h3>
              <p className={`${theme.textSecondary} text-sm mt-1`}>Comma-separated. Keep it simple.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>Skills</label>
                {editMode ? (
                  <textarea
                    rows={3}
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="React, UI Design, Python, Flask..."
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none`}
                  />
                ) : meta.skills?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meta.skills.slice(0, 24).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`${theme.textSecondary} text-sm mt-2`}>—</p>
                )}
              </div>

              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>Interests</label>
                {editMode ? (
                  <textarea
                    rows={3}
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="AI, Startups, Automation, Product..."
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none`}
                  />
                ) : meta.interests?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meta.interests.slice(0, 24).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`${theme.textSecondary} text-sm mt-2`}>—</p>
                )}
              </div>
            </div>
          </div>

          {/* Links */}
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow || ""}`}>
            <div className="mb-4">
              <h3 className={`text-lg font-space font-semibold ${theme.textPrimary}`}>Links</h3>
              <p className={`${theme.textSecondary} text-sm mt-1`}>Optional, but useful.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>GitHub</label>
                {editMode ? (
                  <input
                    value={meta.links?.github || ""}
                    onChange={(e) => updateLink("github", e.target.value)}
                    placeholder="https://github.com/..."
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                  />
                ) : (
                  <p className="mt-2 break-all">{meta.links?.github?.trim() ? meta.links.github : <span className="text-white/50">—</span>}</p>
                )}
              </div>

              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>LinkedIn</label>
                {editMode ? (
                  <input
                    value={meta.links?.linkedin || ""}
                    onChange={(e) => updateLink("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                  />
                ) : (
                  <p className="mt-2 break-all">{meta.links?.linkedin?.trim() ? meta.links.linkedin : <span className="text-white/50">—</span>}</p>
                )}
              </div>

              <div>
                <label className={`${theme.textSecondary} text-sm font-medium`}>Portfolio</label>
                {editMode ? (
                  <input
                    value={meta.links?.portfolio || ""}
                    onChange={(e) => updateLink("portfolio", e.target.value)}
                    placeholder="https://..."
                    className={`w-full ${theme.cardBgClass} px-4 py-3 rounded-xl border ${theme.cardBorderClass} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                  />
                ) : (
                  <p className="mt-2 break-all">{meta.links?.portfolio?.trim() ? meta.links.portfolio : <span className="text-white/50">—</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Next actions */}
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow || ""}`}>
            <div className="mb-4">
              <h3 className={`text-lg font-space font-semibold ${theme.textPrimary}`}>Next actions</h3>
              <p className={`${theme.textSecondary} text-sm mt-1`}>We’ll polish later after AI is stable.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/ai-coach")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-cyan-500/10 border-cyan-400/25 hover:bg-cyan-500/15 transition-all"
              >
                Ask AI (next step)
              </button>
              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
              >
                Courses
              </button>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
              >
                Projects
              </button>
              <button
                type="button"
                onClick={() => navigate("/analysis")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
              >
                Analyze my skills
              </button>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
};

export default UserProfile;
