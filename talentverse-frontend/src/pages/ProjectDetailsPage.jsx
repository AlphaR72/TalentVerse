// src/pages/ProjectDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const allProjects = {
  portfolio: {
    title: "Portfolio Website",
    description: "Build a personal portfolio to showcase your skills.",
    difficulty: "Beginner",
    tasks: [
      "Create homepage layout",
      "Add about section",
      "Add projects section",
      "Add contact form",
      "Deploy the website",
    ],
    resources: [
      { name: "HTML Basics", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
      { name: "CSS Flexbox", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/" },
      { name: "Deploy on Netlify", url: "https://docs.netlify.com/" },
    ],
    milestonesTemplate: [
      { title: "Structure & Layout", taskIndices: [0, 1] },
      { title: "Content & Sections", taskIndices: [2, 3] },
      { title: "Deployment", taskIndices: [4] },
    ],
  },

  "weather-app": {
    title: "Weather App",
    description: "Build a weather dashboard using a public API.",
    difficulty: "Intermediate",
    tasks: [
      "Design UI layout",
      "Fetch weather API",
      "Add search functionality",
      "Add temperature & humidity display",
      "Add loading states",
    ],
    resources: [
      { name: "OpenWeather API", url: "https://openweathermap.org/api" },
      { name: "Async JS", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous" },
    ],
    milestonesTemplate: [
      { title: "UI & Layout", taskIndices: [0] },
      { title: "API Integration", taskIndices: [1, 2] },
      { title: "Details & UX", taskIndices: [3, 4] },
    ],
  },
};

const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const theme = useAdaptiveTheme();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [aiEnabledInChat, setAiEnabledInChat] = useState(false);

  const [aiTips, setAiTips] = useState([]);
  const [loadingTips, setLoadingTips] = useState(false);

  const [codeMessages, setCodeMessages] = useState([]);
  const [codeInput, setCodeInput] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  const [openMilestoneId, setOpenMilestoneId] = useState(null);

  const [aiPanel, setAiPanel] = useState({
    type: null,
    title: "",
    loading: false,
    data: null,
  });

  const [chatMessages, setChatMessages] = useState([
    {
      id: "m1",
      sender: "coach1",
      text: "Welcome to the project chat! I'm Coach Alex, ready to help with this project.",
      timestamp: "09:30",
      type: "human",
    },
    {
      id: "m2",
      sender: "peer1",
      text: "Hi everyone! Excited to work on this together. I've done similar projects before.",
      timestamp: "09:32",
      type: "human",
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // --- timers cleanup (prevents memory leaks) ---
  const timeoutsRef = useRef([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  const chatUsers = useMemo(
    () => [
      { id: "user1", name: "You", role: "Learner", color: "from-indigo-500 to-cyan-400" },
      { id: "coach1", name: "Coach Alex", role: "Mentor", color: "from-purple-500 to-pink-500" },
      { id: "peer1", name: "Peer Sam", role: "Collaborator", color: "from-green-500 to-emerald-400" },
    ],
    []
  );

  useEffect(() => {
    const data = allProjects[id];
    setProject(data || null);
    if (data) setTasks(data.tasks.map((t) => ({ text: t, done: false })));
    else setTasks([]);
    setLoading(false);
  }, [id]);

  const toggleTask = (taskIndex) => {
    setTasks((prev) =>
      prev.map((task, i) => (i === taskIndex ? { ...task, done: !task.done } : task))
    );
  };

  const progress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const doneCount = tasks.filter((t) => t.done).length;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks]);

  const computedMilestones = useMemo(() => {
    if (!project) return [];
    const template = project.milestonesTemplate || [];
    return template.map((m, index) => {
      const milestoneTasks = m.taskIndices.map((taskIndex) => ({
        index: taskIndex,
        ...(tasks[taskIndex] || { text: "", done: false }),
      }));
      const allDone = milestoneTasks.length > 0 && milestoneTasks.every((t) => t.done);
      return { id: index, title: m.title, tasks: milestoneTasks, done: allDone };
    });
  }, [project, tasks]);

  const saveProgress = async () => {
    if (!user) return alert("You must be logged in");
    try {
      await apiFetch("/save-progress", {
        method: "POST",
        body: JSON.stringify({
          firebase_uid: user.uid,
          projectId: id,
          progress,
          tasks,
        }),
      });
      alert("Progress saved!");
    } catch (err) {
      console.error("Failed to save progress", err);
      alert("Failed to save progress");
    }
  };

  const runProjectReview = async () => {
    if (!project) return;

    setAiPanel({
      type: "project",
      title: `AI Review — ${project.title}`,
      loading: true,
      data: null,
    });

    try {
      const data = await apiFetch("/ai-review", {
        method: "POST",
        body: JSON.stringify({
          project_title: project.title,
          progress,
          milestones: computedMilestones.map((m) => ({
            title: m.title,
            done: m.done,
          })),
        }),
      });

      setAiPanel((prev) => ({ ...prev, loading: false, data }));
    } catch (err) {
      console.error("Failed to get AI review", err);
      setAiPanel((prev) => ({
        ...prev,
        loading: false,
        data: {
          review: "I couldn't generate a project review right now.",
          strengths: [],
          improvements: [],
          next_steps: [],
        },
      }));
    }
  };

  const runNextStep = async () => {
    if (!project) return;

    setAiPanel({
      type: "next-step",
      title: `Next Step — ${project.title}`,
      loading: true,
      data: null,
    });

    try {
      const data = await apiFetch("/ai-next-step", {
        method: "POST",
        body: JSON.stringify({
          project_title: project.title,
          progress,
          milestones: computedMilestones.map((m) => ({
            title: m.title,
            done: m.done,
          })),
        }),
      });

      setAiPanel((prev) => ({ ...prev, loading: false, data }));
    } catch (err) {
      console.error("Failed to get next step", err);
      setAiPanel((prev) => ({
        ...prev,
        loading: false,
        data: {
          message: "I couldn't suggest a next step right now.",
          next_step: "",
        },
      }));
    }
  };

  const getAiTips = async () => {
    if (!project) return;
    setLoadingTips(true);
    try {
      const data = await apiFetch("/ai-project-tips", {
        method: "POST",
        body: JSON.stringify({ project: project.title }),
      });
      setAiTips(Array.isArray(data?.tips) ? data.tips : []);
      if (!Array.isArray(data?.tips)) setAiTips(["(Demo) No tips returned."]);
    } catch {
      setAiTips(["Couldn't load AI tips."]);
    } finally {
      setLoadingTips(false);
    }
  };

  const sendCodeMessage = async () => {
    if (!project) return;
    if (!codeInput.trim() || loadingCode) return;

    const question = codeInput.trim();
    setCodeMessages((prev) => [...prev, { id: uid(), sender: "user", text: question }]);
    setCodeInput("");
    setLoadingCode(true);

    try {
      const data = await apiFetch("/ai-code-helper", {
        method: "POST",
        body: JSON.stringify({ question, project: project.title }),
      });

      setCodeMessages((prev) => [
        ...prev,
        { id: uid(), sender: "ai", text: data?.reply || "I can help with that!" },
      ]);
    } catch (err) {
      console.error("Failed to reach AI helper", err);
      setCodeMessages((prev) => [
        ...prev,
        { id: uid(), sender: "ai", text: "I couldn't reach the AI helper right now." },
      ]);
    } finally {
      setLoadingCode(false);
    }
  };

  const getAIReplyBasedOnContext = () => {
    const aiReplies = [
      "Based on your question, I recommend checking the documentation for that specific API.",
      "Great question! Let me break this down into smaller steps for you.",
      "I suggest reviewing the project structure first, then tackling this issue.",
      "Have you considered using a different approach? I can suggest alternatives.",
      "Let's debug this together. What specific error are you encountering?",
    ];
    return aiReplies[Math.floor(Math.random() * aiReplies.length)];
  };

  const getPeerReply = () => {
    const peerReplies = [
      "I had the same issue! Try checking the console for errors.",
      "Let me share my screen and show you how I solved this.",
      "Have you tried the solution from the documentation?",
      "I can help you with that during our next pairing session.",
      "Great progress! Keep going, you're on the right track.",
    ];
    return peerReplies[Math.floor(Math.random() * peerReplies.length)];
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || sendingChat) return;

    // clear previous pending replies to avoid spam/memory leaks
    clearAllTimeouts();

    setSendingChat(true);

    const localText = chatInput.trim();
    const nowTs = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMessage = {
      id: uid(),
      sender: "user1",
      text: localText,
      timestamp: nowTs,
      type: "human",
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");

    // AI reply (demo)
    if (aiEnabledInChat) {
      const t1 = setTimeout(() => {
        const aiReply = {
          id: uid(),
          sender: "ai",
          text: getAIReplyBasedOnContext(localText),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "ai",
        };
        setChatMessages((prev) => [...prev, aiReply]);
      }, 900);
      timeoutsRef.current.push(t1);
    }

    // Peer reply (demo)
    const t2 = setTimeout(() => {
      const peerReply = {
        id: uid(),
        sender: Math.random() > 0.5 ? "coach1" : "peer1",
        text: getPeerReply(localText),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "human",
      };
      setChatMessages((prev) => [...prev, peerReply]);
      setSendingChat(false);
    }, 1500);

    timeoutsRef.current.push(t2);

    // fallback: ensure unlock even if peer timer cancelled
    const t3 = setTimeout(() => setSendingChat(false), 2500);
    timeoutsRef.current.push(t3);
  };

  if (loading)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading project details...</span>
        </div>
      </div>
    );

  if (!project)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="text-center">
          <h1 className="text-2xl mb-4">Project not found</h1>
          <button
            onClick={() => navigate("/projects")}
            className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}
          >
            Back to Projects
          </button>
        </div>
      </div>
    );

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-6xl mx-auto py-10 px-6">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-5xl font-space font-bold mb-2">{project.title}</h1>
              <p className={`${theme.textSecondary} text-lg`}>{project.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm`}>
                  Difficulty: {project.difficulty}
                </span>
                <span className={`${theme.textSecondary} text-sm`}>ID: {id}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={runProjectReview}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm hover:scale-[1.03] transition"
              >
                {aiPanel.type === "project" && aiPanel.loading ? "Reviewing..." : "AI Review"}
              </button>

              <button
                onClick={saveProgress}
                className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition`}
              >
                Save Progress
              </button>
            </div>
          </div>

          <div className="flex border-b border-white/10 mb-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeTab === "overview"
                  ? `${theme.textPrimary} border-b-2 ${theme.textAccent}`
                  : `${theme.textSecondary} hover:${theme.textPrimary}`
              }`}
            >
              📁 Overview & AI Tools
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? `${theme.textPrimary} border-b-2 ${theme.textAccent}`
                  : `${theme.textSecondary} hover:${theme.textPrimary}`
              }`}
            >
              💬 Team Chat {aiEnabledInChat && "🤖"}
            </button>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-10">
            <div>
              <div className="mb-6">
                <p className={`${theme.textSecondary} text-sm mb-1`}>Project Progress</p>
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className={`${theme.textSecondary} text-xs mt-1`}>
                  {progress}% completed • {tasks.filter((t) => t.done).length}/{tasks.length} tasks
                </p>
              </div>

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 mb-10 ${theme.backdropBlur}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-space">🏁 Project Milestones</h2>
                  <button
                    onClick={runNextStep}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition`}
                  >
                    Next Step (AI)
                  </button>
                </div>

                {computedMilestones.length === 0 && (
                  <p className={`${theme.textSecondary} text-sm`}>No milestones defined.</p>
                )}

                <div className="space-y-4">
                  {computedMilestones.map((m) => {
                    const isOpen = openMilestoneId === m.id;
                    return (
                      <div key={m.id} className={`p-4 rounded-xl border ${theme.cardBorderClass} ${theme.cardBgClass}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setOpenMilestoneId(isOpen ? null : m.id)}
                          >
                            <span className="text-xl">{m.done ? "✅" : "📌"}</span>
                            <h3 className="text-lg font-space">{m.title}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${theme.textSecondary}`}>
                              {m.done ? "Completed" : "In progress"} • {m.tasks.filter((t) => t.done).length}/{m.tasks.length} tasks
                            </span>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="mt-3 space-y-2">
                            {m.tasks.map((t) => (
                              <div
                                key={t.index}
                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${theme.cardBorderClass} ${
                                  t.done ? "bg-green-500/20 line-through" : theme.cardBgClass
                                }`}
                              >
                                <div onClick={() => toggleTask(t.index)} className="flex items-center gap-3 cursor-pointer">
                                  <div className={`w-4 h-4 rounded-full ${t.done ? "bg-green-400" : "bg-cyan-400"}`}></div>
                                  <span>{t.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 mb-10 ${theme.backdropBlur}`}>
                <h2 className="text-2xl font-space mb-4">📚 Learning Resources</h2>
                <ul className="space-y-3">
                  {project.resources.map((res, i) => (
                    <li key={i}>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${theme.textAccent} hover:underline flex items-center gap-2`}
                      >
                        <span>🔗</span>
                        <span>{res.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              {aiPanel.type && (
                <div className={`bg-white/5 border border-purple-500/40 rounded-2xl p-6 ${theme.backdropBlur}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-space">{aiPanel.title || "AI Assistant"}</h2>
                    <button
                      onClick={() => setAiPanel({ type: null, title: "", loading: false, data: null })}
                      className={`text-xs ${theme.textSecondary} hover:${theme.textPrimary}`}
                    >
                      Close
                    </button>
                  </div>

                  {aiPanel.loading && <p className={`${theme.textSecondary} text-sm`}>AI is thinking...</p>}

                  {!aiPanel.loading && aiPanel.type === "next-step" && aiPanel.data && (
                    <div className="space-y-3 text-sm">
                      <p className={`${theme.textSecondary}`}>{aiPanel.data?.message}</p>
                      <div className={`${theme.cardBgClass} border border-cyan-400/30 rounded-xl p-3`}>
                        <p className={`${theme.textAccent} font-space text-xs mb-1`}>Suggested next step</p>
                        <p className={`${theme.textSecondary}`}>{aiPanel.data?.next_step}</p>
                      </div>
                    </div>
                  )}

                  {!aiPanel.loading && aiPanel.type !== "next-step" && aiPanel.data && (
                    <div className="space-y-4 text-sm">
                      <p className={`${theme.textSecondary}`}>{aiPanel.data?.review}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`${theme.cardBgClass} rounded-xl p-3 border ${theme.cardBorderClass}`}>
                          <h3 className="font-space text-xs mb-2 text-green-300">Strengths</h3>
                          <ul className="space-y-1 text-white/80">
                            {(aiPanel.data?.strengths || []).map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className={`${theme.cardBgClass} rounded-xl p-3 border ${theme.cardBorderClass}`}>
                          <h3 className="font-space text-xs mb-2 text-yellow-300">Improvements</h3>
                          <ul className="space-y-1 text-white/80">
                            {(aiPanel.data?.improvements || []).map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className={`${theme.cardBgClass} rounded-xl p-3 border ${theme.cardBorderClass}`}>
                          <h3 className="font-space text-xs mb-2 text-cyan-300">Next steps</h3>
                          <ul className="space-y-1 text-white/80">
                            {(aiPanel.data?.next_steps || []).map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
                <h2 className="text-2xl font-space mb-4">💡 AI Code Assistant</h2>

                <div className="h-64 overflow-y-auto space-y-3 mb-4 pr-2">
                  {codeMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl max-w-[90%] ${
                        msg.sender === "user" ? `ml-auto bg-gradient-to-r ${theme.buttonGradient}` : theme.cardBgClass
                      }`}
                    >
                      <p className="text-sm opacity-80 mb-1">{msg.sender === "user" ? "You" : "AI Assistant"}</p>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                  {loadingCode && <p className={`${theme.textSecondary} text-sm`}>AI is thinking...</p>}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendCodeMessage()}
                    placeholder="Ask for technical help..."
                    className={`flex-1 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                  />
                  <button
                    onClick={sendCodeMessage}
                    disabled={!codeInput.trim() || loadingCode}
                    className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loadingCode ? "..." : "Send"}
                  </button>
                </div>
              </div>

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-space">🤖 AI Project Tips</h2>
                  <button
                    onClick={getAiTips}
                    disabled={loadingTips}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loadingTips ? "Generating..." : "Generate Tips"}
                  </button>
                </div>

                {loadingTips && <p className={theme.textSecondary}>AI is thinking...</p>}

                {!loadingTips && aiTips.length > 0 && (
                  <ul className="space-y-3">
                    {aiTips.map((tip, i) => (
                      <li key={i} className={`p-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass}`}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} h-[600px] flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-space mb-1">💬 Project Team Chat</h2>
                <p className={`${theme.textSecondary} text-sm`}>
                  Discuss {project.title} with your team {aiEnabledInChat && "and AI Assistant"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAiEnabledInChat((p) => !p)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                    aiEnabledInChat ? "bg-gradient-to-r from-purple-500 to-indigo-500" : `${theme.cardBgClass} border ${theme.cardBorderClass}`
                  } transition`}
                >
                  <span>🤖</span>
                  <span className="text-sm">{aiEnabledInChat ? "AI Enabled" : "Enable AI"}</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {chatUsers.map((u) => (
                      <div
                        key={u.id}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center text-xs font-bold border-2 border-[#060318]`}
                        title={`${u.name} (${u.role})`}
                      >
                        {u.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span className={`${theme.textSecondary} text-sm`}>{chatUsers.length} members</span>
                </div>
              </div>
            </div>

            {aiEnabledInChat && (
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-400/30">
                <div className="flex items-center gap-2">
                  <span className="text-purple-300">🤖</span>
                  <span className="text-sm text-purple-200">
                    AI Assistant is listening and will provide technical guidance when helpful
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
              {chatMessages.map((msg) => {
                const sender =
                  chatUsers.find((u) => u.id === msg.sender) ||
                  {
                    name: msg.sender === "ai" ? "AI Assistant" : "Unknown",
                    color: msg.sender === "ai" ? "from-yellow-500 to-orange-500" : "from-gray-500 to-gray-600",
                  };

                const isCurrentUser = msg.sender === "user1";
                const isAI = msg.sender === "ai";

                return (
                  <div key={msg.id} className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${sender.color} flex items-center justify-center text-xs font-bold mt-1`}>
                      {isAI ? "🤖" : sender.name?.charAt(0) || "?"}
                    </div>

                    <div className={`max-w-[70%] ${isCurrentUser ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${isAI ? "text-yellow-300" : ""}`}>
                          {sender.name} {msg.sender === "coach1" && "👨‍🏫"} {msg.sender === "peer1" && "👥"}
                        </span>
                        <span className="text-xs text-white/40">{msg.timestamp}</span>
                        {isAI && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">AI</span>}
                      </div>

                      <div
                        className={`p-3 rounded-2xl ${
                          isCurrentUser
                            ? `bg-gradient-to-r ${theme.buttonGradient} ml-auto`
                            : isAI
                            ? "bg-yellow-500/10 border border-yellow-500/30"
                            : theme.cardBgClass
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder={`Type a message about ${project.title}...`}
                className={`flex-1 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none focus:ring-2 focus:ring-cyan-400`}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || sendingChat}
                className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.03] transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {sendingChat ? "..." : "Send"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setChatInput("Can someone review my code for the homepage layout?")}
                className={`px-3 py-1.5 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/10 transition`}
              >
                Request code review
              </button>
              <button
                onClick={() => setChatInput("I'm stuck on the API integration, any help?")}
                className={`px-3 py-1.5 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/10 transition`}
              >
                Need help debugging
              </button>
              <button
                onClick={() => setChatInput("Let's schedule a pair programming session this week")}
                className={`px-3 py-1.5 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/10 transition`}
              >
                Schedule pairing
              </button>
              <button
                onClick={() => setChatInput("Update: I just completed the first milestone!")}
                className={`px-3 py-1.5 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/10 transition`}
              >
                Share progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
