import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { Link } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const ProjectsPage = () => {
  const user = auth.currentUser;
  const theme = useAdaptiveTheme();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const projects = [
    {
      id: "portfolio",
      title: "Portfolio Website",
      description: "Build a personal portfolio to showcase your skills.",
      difficulty: "Beginner",
      skills: ["HTML", "CSS", "JavaScript"],
      progress: 20,
    },
    {
      id: "weather-app",
      title: "Weather App",
      description: "Create a weather dashboard using a public API.",
      difficulty: "Intermediate",
      skills: ["API", "Async JS", "UI Design"],
      progress: 0,
    },
    {
      id: "task-manager",
      title: "Task Manager App",
      description: "Build a full CRUD task manager with authentication.",
      difficulty: "Intermediate",
      skills: ["React", "Firebase", "Routing"],
      progress: 60,
    },
    {
      id: "ai-chat",
      title: "AI Chat Assistant",
      description: "Build a simple AI assistant using an LLM API.",
      difficulty: "Advanced",
      skills: ["React", "APIs", "AI Integration"],
      progress: 0,
    },
  ];

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const profileData = await apiFetch(`/profile/${user.uid}`).catch(() => null);
        setProfile(profileData);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        Loading projects...
      </div>
    );

  const filteredProjects = projects.filter((project) => {
    if (!profile?.level) return true;

    if (profile.level === "beginner") return project.difficulty === "Beginner";

    if (profile.level === "intermediate") {
      return project.difficulty === "Intermediate" || project.difficulty === "Beginner";
    }

    if (profile.level === "advanced") return true;

    return true;
  });

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      {/* Glow */}
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-5xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-10 text-center">AI Suggested Projects</h1>

        <p className={`${theme.textSecondary} text-center mb-12 max-w-2xl mx-auto`}>
          Based on your skills, personality, and goals — here are the best projects to build next.
        </p>

        {/* PROJECTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} ${theme.cardShadow} hover:bg-white/10 transition`}
            >
              <h2 className="text-2xl font-space mb-2">{project.title}</h2>

              <p className={`${theme.textSecondary} text-sm mb-4`}>{project.description}</p>

              {/* Difficulty */}
              <p className="text-sm mb-3">
                <span className={theme.textSecondary}>Difficulty:</span>{" "}
                <span className={`font-semibold ${theme.textAccent}`}>{project.difficulty}</span>
              </p>

              {/* Skills */}
              <div className="mb-4">
                <p className={`${theme.textSecondary} text-sm mb-1`}>Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`px-3 py-1 rounded-full ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <p className={`${theme.textSecondary} text-sm mb-1`}>Progress</p>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all`} style={{ width: `${project.progress}%` }} />
                </div>
                <p className={`${theme.textSecondary} text-xs mt-1`}>{project.progress}% completed</p>
              </div>

              {/* Start Project Button */}
              <Link
                to={`/project/${project.id}`}
                className={`w-full block text-center py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} ${theme.textPrimary} font-semibold ${theme.buttonHover} transition`}
              >
                Start Project
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
