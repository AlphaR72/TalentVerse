import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useAdaptiveTheme();

  const user = auth.currentUser;

  const userInitial =
    (user?.displayName?.[0]?.toUpperCase()) ||
    (user?.email?.[0]?.toUpperCase()) ||
    "U";

  const userLabel =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "User");

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/auth");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const navLinkBase =
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition";
  const navLinkActive =
    "bg-indigo-500/20 text-white border border-indigo-400/60";
  const navLinkInactive =
    "text-white/70 hover:text-white hover:bg-white/5";

  const pathname = location.pathname;

  const getSidebarSections = (path) => {
    // MBTI section
    if (path.startsWith("/mbti") || path.startsWith("/mbti-analysis")) {
      return [
        {
          title: "Personality",
          items: [
            { to: "/mbti", icon: "🧠", label: "MBTI Test" },
            { to: "/mbti-analysis", icon: "📊", label: "Results" },
          ],
        },
        {
          title: "Development",
          items: [
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/analysis", icon: "📈", label: "Skills Analysis" },
            { to: "/courses", icon: "📚", label: "Courses" },
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
          ],
        },
      ];
    }

    if (path.startsWith("/project/")) {
      return [
        {
          title: "Project",
          items: [{ to: "/projects", icon: "🧩", label: "All Projects" }],
        },
        {
          title: "This project",
          items: [
            { to: path, icon: "📁", label: "Overview" },
            { to: "/collaboration", icon: "🤝", label: "Collaboration" },
            { to: "/ai-coach", icon: "🧠", label: "AI Coach" },
          ],
        },
      ];
    }

    if (path.startsWith("/collaboration")) {
      return [
        {
          title: "Collaboration",
          items: [
            { to: "/collaboration", icon: "🤝", label: "Rooms" },
            { to: "/projects", icon: "🧩", label: "Projects" },
          ],
        },
        {
          title: "AI Layer",
          items: [{ to: "/ai-coach", icon: "🧠", label: "AI Coach" }],
        },
      ];
    }

    if (path.startsWith("/ai-coach")) {
      return [
        {
          title: "AI Layer",
          items: [{ to: "/ai-coach", icon: "🧠", label: "AI Coach" }],
        },
        {
          title: "Your journey",
          items: [
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/analysis", icon: "📊", label: "Analysis" },
            { to: "/courses", icon: "📚", label: "Courses" },
          ],
        },
      ];
    }

    if (path.startsWith("/learning-plan")) {
      return [
        {
          title: "Learning",
          items: [
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/analysis", icon: "📊", label: "Analysis" },
            { to: "/courses", icon: "📚", label: "Courses" },
            { to: "/matching", icon: "🔍", label: "Matching" },
          ],
        },
        {
          title: "AI Layer",
          items: [{ to: "/ai-coach", icon: "🧠", label: "AI Coach" }],
        },
      ];
    }

    if (path.startsWith("/matching")) {
      return [
        {
          title: "Matching",
          items: [
            { to: "/matching", icon: "🔍", label: "Matches" },
            { to: "/projects", icon: "🧩", label: "Projects" },
          ],
        },
        {
          title: "Journey",
          items: [
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/courses", icon: "📚", label: "Courses" },
          ],
        },
      ];
    }

    if (path.startsWith("/projects")) {
      return [
        {
          title: "Projects",
          items: [
            { to: "/projects", icon: "🧩", label: "All Projects" },
            { to: "/collaboration", icon: "🤝", label: "Collaboration" },
          ],
        },
        {
          title: "Growth",
          items: [
            { to: "/analysis", icon: "📊", label: "Analysis" },
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/courses", icon: "📚", label: "Courses" },
          ],
        },
        {
          title: "AI Layer",
          items: [{ to: "/ai-coach", icon: "🧠", label: "AI Coach" }],
        },
      ];
    }

    if (path.startsWith("/analysis")) {
      return [
        {
          title: "Overview",
          items: [
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
            { to: "/analysis", icon: "📊", label: "Analysis" },
          ],
        },
        {
          title: "Growth",
          items: [
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/courses", icon: "📚", label: "Courses" },
            { to: "/matching", icon: "🔍", label: "Matching" },
          ],
        },
      ];
    }

    if (path.startsWith("/courses")) {
      return [
        {
          title: "Courses",
          items: [
            { to: "/courses", icon: "📚", label: "Recommendations" },
            { to: "/projects", icon: "🧩", label: "Projects" },
          ],
        },
        {
          title: "Journey",
          items: [
            { to: "/analysis", icon: "📊", label: "Analysis" },
            { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
          ],
        },
      ];
    }

    if (path.startsWith("/coach-apply")) {
      return [
        {
          title: "Coach",
          items: [
            { to: "/coach-apply", icon: "👨‍🏫", label: "Apply" },
            { to: "/dashboard", icon: "🏠", label: "Dashboard" },
          ],
        },
        {
          title: "Growth",
          items: [{ to: "/courses", icon: "📚", label: "Courses" }],
        },
      ];
    }

    // Default sidebar
    return [
      {
        title: "Overview",
        items: [
          { to: "/dashboard", icon: "🏠", label: "Dashboard" },
          { to: "/profile", icon: "👤", label: "Profile" },
          { to: "/analysis", icon: "📊", label: "Analysis" },
          { to: "/learning-plan", icon: "📚", label: "Learning Plan" },
          { to: "/matching", icon: "🔍", label: "Matching" },
        ],
      },
      {
        title: "Projects",
        items: [
          { to: "/projects", icon: "🧩", label: "Projects" },
          { to: "/collaboration", icon: "🤝", label: "Collaboration" },
        ],
      },
      {
        title: "Growth",
        items: [
          { to: "/courses", icon: "📚", label: "Courses" },
          { to: "/coach-apply", icon: "👨‍🏫", label: "Coach Apply" },
        ],
      },
      {
        title: "AI Layer",
        items: [{ to: "/ai-coach", icon: "🧠", label: "AI Coach" }],
      },
    ];
  };

  const sidebarSections = getSidebarSections(pathname);

  return (
    <div className={`min-h-screen text-white flex flex-col ${theme.bgClass} relative overflow-hidden`}>
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[200px] ${theme.glowClass}`}
        />
      </div>

      {/* Toolbar */}
      <header
        className={`relative z-10 h-16 border-b border-white/10 ${
          theme.toolbarClass || "bg-[#050316]/90"
        } backdrop-blur-xl flex items-center px-4 md:px-8`}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3 w-1/3">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => navigate("/dashboard")}
          >
            <div
              className={`w-9 h-9 rounded-xl ${
                theme.logoGradient || "bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-400"
              } flex items-center justify-center shadow-lg ${
                theme.logoShadow || "shadow-indigo-500/40"
              } text-xs font-bold tracking-tight`}
            >
              TV
            </div>
            <span className="font-space text-lg font-semibold">TalentVerse</span>
          </div>
        </div>

        {/* CENTER */}
        <nav className="hidden md:flex items-center gap-6 text-sm w-1/3 justify-center">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Projects
          </NavLink>

          <NavLink
            to="/analysis"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Analysis
          </NavLink>

          <NavLink
            to="/learning-plan"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Learning Plan
          </NavLink>

          <NavLink
            to="/courses"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Courses
          </NavLink>

          <NavLink
            to="/coach-apply"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            Become a Coach
          </NavLink>

          <NavLink
            to="/ai-coach"
            className={({ isActive }) =>
              isActive ? `text-white ${theme.navActiveClass || ""}` : "text-white/70 hover:text-white"
            }
          >
            AI Coach
          </NavLink>
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-3 w-1/3 justify-end">
          <NavLink
            to="/profile"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full ${
                theme.avatarGradient || "bg-gradient-to-br from-white/20 via-white/10 to-transparent"
              } border ${theme.avatarBorder || "border-white/35"} flex items-center justify-center text-[11px] font-semibold`}
            >
              {userInitial}
            </div>
            <span className="hidden md:inline">{userLabel}</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className={`text-xs px-3 py-2 rounded-lg ${
              theme.logoutClass || "bg-white/5 border border-white/15"
            } hover:bg-white/10 transition-colors`}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex w-64 border-r border-white/10 ${
            theme.sidebarClass || "bg-[#050316]/85"
          } backdrop-blur-xl flex-col px-4 py-6 gap-8`}
        >
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs uppercase text-white/40 mb-2">{section.title}</p>
              <nav className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `${navLinkBase} ${
                        isActive
                          ? `${theme.navLinkActiveClass || navLinkActive}`
                          : `${theme.navLinkInactiveClass || navLinkInactive}`
                      }`
                    }
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}

          <div className="mt-auto text-xs text-white/40">
            <p className="mb-1 font-space">TalentVerse</p>
            <p>Adaptive AI-powered learning journeys.</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 px-4 md:px-8 py-6">{children}</div>

          <footer
            className={`h-12 border-t border-white/10 px-4 md:px-8 flex items-center justify-between text-xs ${
              theme.footerTextClass || "text-white/40"
            }`}
          >
            <span>© {new Date().getFullYear()} TalentVerse</span>
            <span>
              Mode: <span className={`${theme.modeTextClass || "text-cyan-300"}`}>{theme.mode}</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
