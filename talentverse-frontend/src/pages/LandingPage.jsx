import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      n: "01",
      title: "Login / Register",
      desc: "Create your account (first time) or login anytime to continue your journey.",
      icon: "🔐",
    },
    {
      n: "02",
      title: "Big Five Personality Test",
      desc: "We learn how you learn best — so the platform personalizes your plan and pace.",
      icon: "🧠",
    },
    {
      n: "03",
      title: "Profile Setup",
      desc: "Add your goals and basics so recommendations fit your direction.",
      icon: "👤",
    },
    {
      n: "04",
      title: "Dashboard (Your Home)",
      desc: "See your next step, projects, collaboration, and personalized learning plan.",
      icon: "🏠",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#060318] text-white font-inter overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 left-1/2 w-[900px] h-[900px] bg-indigo-500/20 rounded-full blur-[240px] -translate-x-1/2" />
      <div className="absolute -bottom-52 -left-60 w-[900px] h-[900px] bg-cyan-500/15 rounded-full blur-[260px]" />

      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.06]">
        <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/20">
            T
          </div>
          <div className="text-left">
            <p className="font-space font-extrabold text-2xl leading-none">TalentVerse</p>
            <p className="text-white/45 text-xs mt-1">Structured learning. Real progress.</p>
          </div>
        </div>

        {/* Hero */}
        <h1 className="text-4xl md:text-6xl font-space font-extrabold leading-tight">
          A clear learning path — {" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-200">
            built for you
          </span>
        </h1>

        <p className="text-white/70 mt-6 text-lg leading-relaxed max-w-2xl mx-auto">
          TalentVerse helps you stop guessing. You’ll follow a clear learning journey:
          understand yourself, build the right skills, and grow through real projects —
          with guidance, structure, and collaboration.
        </p>

        {/* “Why personality?” */}
        <div className="mt-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 text-left max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 flex items-center justify-center text-xl">
              ✨
            </div>
            <div>
              <h2 className="font-space text-xl mb-1">Why a personality test?</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Not for labels. We use it to personalize your learning experience:
                pacing, motivation support, collaboration style, and the type of projects that fit you.
              </p>
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="mt-12">
          <h2 className="text-2xl md:text-3xl font-space font-bold mb-3">
            Your journey inside the platform
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-8 max-w-2xl mx-auto">
            Before you start, here’s the exact path you’ll follow — so you never feel lost.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {steps.map((s) => (
              <div
                key={s.n}
                className="group rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 transition hover:bg-white/10 hover:border-white/15"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-cyan-400/20 flex items-center justify-center text-xl">
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Step {s.n}</p>
                      <p className="font-space text-lg">{s.title}</p>
                    </div>
                  </div>

                  <div className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/55">
                    Required
                  </div>
                </div>

                <p className="text-white/70 text-sm leading-relaxed">
                  {s.desc}
                </p>

                <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <p className="text-white/45 text-xs mt-4">
                  You’ll be guided automatically after each step.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA (ONE button only) */}
        <div className="mt-12">
          <button
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold hover:scale-[1.03] transition shadow-lg shadow-cyan-500/20"
          >
            Get Started
          </button>

          <p className="text-white/35 text-xs mt-4">
            You’ll login/register first, then start the Big Five test.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-14 text-white/25 text-xs">
          © {new Date().getFullYear()} TalentVerse
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
