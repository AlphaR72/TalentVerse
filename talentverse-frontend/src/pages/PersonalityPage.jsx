import React, { useState } from "react";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const PersonalityPage = () => {
  const navigate = useNavigate();
  const theme = useAdaptiveTheme();

  const [form, setForm] = useState({
    learning_style: "",
    decision_style: "",
    work_preference: "",
    motivation_state: "",
    clarity_level: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const SelectField = ({ name, label, options }) => (
    <div className="flex flex-col gap-2">
      <label className={`${theme.textSecondary} text-sm font-medium`}>{label}</label>

      <div className="relative group">
        {/* النص المختار */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white pointer-events-none z-0">
          {form[name]
            ? options.find((o) => o.value === form[name])?.label
            : <span className="text-gray-400 italic">Select...</span>}
        </div>

        {/* select */}
        <select
          name={name}
          value={form[name]}
          onChange={handleChange}
          required
          className={`
            w-full appearance-none ${theme.cardBgClass} text-transparent px-4 py-3 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-cyan-400 transition
            border ${theme.cardBorderClass} cursor-pointer relative z-10
          `}
        >
          <option value="" disabled hidden>
            Select...
          </option>

          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="text-white bg-[#0d0a25]"
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* السهم */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-0">
          <svg
            className="w-5 h-5 text-white/70 transition-transform duration-200 group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    await fetch("/personality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebase_uid: user.uid,
        email: user.email,
        ...form,
      }),
    });

    navigate("/profile");
  };

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} flex items-center justify-center overflow-hidden font-inter`}>

      <div className={`absolute top-1/3 left-1/2 w-[600px] h-[600px] ${theme.pageGlowClass} rounded-full blur-[180px] -translate-x-1/2`}></div>

      <div className={`relative z-10 w-full max-w-xl ${theme.cardBgClass} ${theme.backdropBlur} border ${theme.cardBorderClass} rounded-2xl p-10 shadow-xl`}>

        <h1 className={`text-4xl font-space font-bold ${theme.textPrimary} text-center mb-6`}>
          Personality Analysis
        </h1>

        <p className={`${theme.textSecondary} text-center mb-8`}>
          Help us understand how you think, learn, and make decisions.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <SelectField
            name="learning_style"
            label="How do you learn best?"
            options={[
              { value: "self", label: "Self learning" },
              { value: "guided", label: "With guidance" },
              { value: "visual", label: "Visual & practice" },
            ]}
          />

          <SelectField
            name="decision_style"
            label="How do you make decisions?"
            options={[
              { value: "fast", label: "Fast" },
              { value: "analytical", label: "Analytical" },
              { value: "validation", label: "Need validation" },
            ]}
          />

          <SelectField
            name="work_preference"
            label="You prefer working"
            options={[
              { value: "solo", label: "Solo" },
              { value: "peer", label: "With peer" },
              { value: "mentor", label: "With mentor" },
            ]}
          />

          <SelectField
            name="motivation_state"
            label="Your motivation now"
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />

          <SelectField
            name="clarity_level"
            label="Career clarity"
            options={[
              { value: "clear", label: "Clear" },
              { value: "vague", label: "Somewhat" },
              { value: "lost", label: "Lost" },
            ]}
          />

          <button
            type="submit"
            className={`w-full py-3 mt-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} ${theme.textPrimary} font-semibold ${theme.buttonHover} transition`}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default PersonalityPage;