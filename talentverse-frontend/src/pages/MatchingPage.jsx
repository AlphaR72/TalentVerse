// src/pages/MatchingPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import { apiFetch } from "../config/api";

const MatchingPage = () => {
  const [activeTab, setActiveTab] = useState("peers");
  const [matches, setMatches] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null); // { type: "success"|"error"|"info", message: string }
  const toastTimerRef = useRef(null);

  const [connectingIds, setConnectingIds] = useState(new Set()); // prevent spamming

  const user = auth.currentUser;
  const navigate = useNavigate();
  const theme = useAdaptiveTheme();

  const clearToastTimer = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const showToast = useCallback((type, message) => {
    clearToastTimer();
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      clearToastTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const data = await apiFetch(`/matching/${user.uid}`).catch(() => null);
        setMatches(Array.isArray(data?.matches) ? data.matches : []);

        // بيانات وهمية للاتصالات (للديمو)
        setConnections([
          {
            id: 1,
            name: "Alex Johnson",
            role: "Coach",
            field: "Frontend",
            level: "Senior",
            status: "active",
            connectedSince: "2 weeks ago",
          },
          {
            id: 2,
            name: "Sam Wilson",
            role: "Peer",
            field: "Fullstack",
            level: "Intermediate",
            status: "active",
            connectedSince: "1 month ago",
          },
          {
            id: 3,
            name: "Taylor Swift",
            role: "Peer",
            field: "Backend",
            level: "Beginner",
            status: "pending",
            connectedSince: "3 days ago",
          },
        ]);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setMatches([]);
        showToast("error", "Couldn’t load matches right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, showToast]);

  const handleConnect = async (peerId, peerMeta) => {
    if (!user) return;

    // منع الضغط المتكرر
    setConnectingIds((prev) => {
      const next = new Set(prev);
      next.add(String(peerId));
      return next;
    });

    try {
      await apiFetch("/connect", {
        method: "POST",
        body: JSON.stringify({ requester: user.uid, target: peerId }),
      });

      // Optimistic (demo): أضف اتصال pending
      if (peerMeta?.name) {
        setConnections((prev) => {
          const already = prev.some((c) => String(c.id) === String(peerId));
          if (already) return prev;
          return [
            ...prev,
            {
              id: peerId,
              name: peerMeta.name,
              role: "Peer",
              field: peerMeta.field || "Web",
              level: peerMeta.level || "Intermediate",
              status: "pending",
              connectedSince: "just now",
            },
          ];
        });
      }

      showToast("success", "Connection request sent!");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to send request.");
    } finally {
      setConnectingIds((prev) => {
        const next = new Set(prev);
        next.delete(String(peerId));
        return next;
      });
    }
  };

  const handleStartCollab = (userId) => {
    navigate(`/collaboration?with=${userId}`);
  };

  const handleMessage = (userId) => {
    showToast("info", `Starting chat with user ${userId} (demo)`);
  };

  const isConnecting = (id) => connectingIds.has(String(id));

  if (loading)
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Finding your perfect matches...</span>
        </div>
      </div>
    );

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

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

      <div className="relative z-10 max-w-6xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-6 text-center">👥 Connect & Collaborate</h1>

        <p className={`${theme.textSecondary} text-center mb-12 max-w-2xl mx-auto`}>
          Find peers to learn with, coaches to guide you, and build your learning network based on skills, goals, and personality compatibility.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setActiveTab("peers")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "peers"
                ? `bg-gradient-to-r ${theme.buttonGradient} text-white`
                : `${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20`
            }`}
          >
            👥 Find Peers
          </button>
          <button
            onClick={() => setActiveTab("coaches")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "coaches"
                ? `bg-gradient-to-r ${theme.buttonGradient} text-white`
                : `${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20`
            }`}
          >
            👨‍🏫 Find Coaches
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "connections"
                ? `bg-gradient-to-r ${theme.buttonGradient} text-white`
                : `${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20`
            }`}
          >
            🤝 My Connections
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "rooms"
                ? `bg-gradient-to-r ${theme.buttonGradient} text-white`
                : `${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20`
            }`}
          >
            🧩 Collaboration Rooms
          </button>
        </div>

        <div className={`bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass} rounded-2xl p-8 mb-10 ${theme.backdropBlur}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🤖</div>
            <h3 className="text-xl font-space">AI Matching Recommendation</h3>
          </div>
          <p className={`${theme.textSecondary} mb-4`}>
            Based on your profile analysis and learning style, our AI recommends connecting with people who:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${theme.cardBgClass} rounded-xl p-4`}>
              <h4 className={`font-space mb-2 ${theme.textAccent}`}>For Skill Development</h4>
              <ul className="list-disc pl-5 space-y-1 text-white/70 text-sm">
                <li>Frontend developers with React experience</li>
                <li>Peers who completed similar projects</li>
                <li>Coaches specializing in JavaScript/TypeScript</li>
              </ul>
            </div>
            <div className={`${theme.cardBgClass} rounded-xl p-4`}>
              <h4 className={`font-space mb-2 ${theme.textAccent}`}>For Personality Match</h4>
              <ul className="list-disc pl-5 space-y-1 text-white/70 text-sm">
                <li>Collaborative learners who enjoy pair programming</li>
                <li>Structured mentors for guided learning</li>
                <li>Accountability partners for consistent progress</li>
              </ul>
            </div>
          </div>
        </div>

        {activeTab === "peers" && (
          <div>
            <h2 className="text-2xl font-space mb-6">👥 Recommended Peers</h2>
            {matches.length === 0 ? (
              <div className={`text-center py-12 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl`}>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-space mb-2">No peer matches yet</h3>
                <p className={`${theme.textSecondary} mb-6 max-w-md mx-auto`}>
                  Complete more projects and update your skills to get better peer recommendations
                </p>
                <button
                  onClick={() => navigate("/projects")}
                  className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}
                >
                  Browse Projects
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.slice(0, 6).map((peer, index) => {
                  const peerId = peer?.id ?? index;
                  return (
                    <div
                      key={peerId}
                      className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} hover:bg-white/10 transition`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center text-xl font-bold`}>
                          {peer.name ? peer.name.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div>
                          <h3 className="text-xl font-space">{peer.name || "Peer User"}</h3>
                          <p className={`${theme.textSecondary} text-sm`}>Learning {peer.field || "Web Development"}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                          <p className={`${theme.textSecondary} text-xs mb-1`}>Current Level</p>
                          <p className="font-medium capitalize">{peer.level || "Intermediate"}</p>
                        </div>
                        <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                          <p className={`${theme.textSecondary} text-xs mb-1`}>Learning Focus</p>
                          <p>{peer.focus || "Frontend Development"}</p>
                        </div>
                        <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                          <p className={`${theme.textSecondary} text-xs mb-1`}>Match Score</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${theme.buttonGradient}`}
                                style={{ width: `${Math.min(90, 70 + index * 5)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{Math.min(90, 70 + index * 5)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConnect(peerId, peer)}
                          disabled={isConnecting(peerId)}
                          className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.03] transition disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isConnecting(peerId) ? "Sending..." : "Connect"}
                        </button>
                        <button
                          onClick={() => handleMessage(peerId)}
                          className={`px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/20 transition`}
                        >
                          💬
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "coaches" && (
          <div>
            <h2 className="text-2xl font-space mb-6">👨‍🏫 Available Coaches</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} hover:bg-white/10 transition`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold">
                      {["A", "B", "C", "D", "E", "F"][i - 1]}
                    </div>
                    <div>
                      <h3 className="text-xl font-space">
                        {["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley"][i - 1]}{" "}
                        {["👨‍🏫", "👩‍🏫", "👨‍🏫", "👩‍🏫", "👨‍🏫", "👩‍🏫"][i - 1]}
                      </h3>
                      <p className={`${theme.textSecondary} text-sm`}>
                        {["Senior Frontend", "Fullstack Lead", "Backend Architect", "DevOps Expert", "UX Specialist", "Mobile Developer"][i - 1]}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                      <p className={`${theme.textSecondary} text-xs mb-1`}>Specialty</p>
                      <p className="font-medium">{["React & TypeScript", "Node.js & AWS", "Python & Databases", "Cloud & CI/CD", "UI/UX Design", "React Native"][i - 1]}</p>
                    </div>
                    <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                      <p className={`${theme.textSecondary} text-xs mb-1`}>Experience</p>
                      <p>
                        {[5, 7, 8, 6, 4, 5][i - 1]}+ years • {[50, 75, 60, 40, 30, 45][i - 1]} students coached
                      </p>
                    </div>
                    <div className={`${theme.cardBgClass} rounded-xl p-3`}>
                      <p className={`${theme.textSecondary} text-xs mb-1`}>Coaching Style</p>
                      <p>{["Hands-on projects", "Structured curriculum", "Code reviews", "Career guidance", "Design critiques", "Mobile development"][i - 1]}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConnect(`coach${i}`, { name: `Coach ${["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley"][i - 1]}`, field: "Coaching", level: "Senior" })}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-[1.03] transition"
                    >
                      Request Coaching
                    </button>
                    <button className={`px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/20 transition`} title="View Profile">
                      👁️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "connections" && (
          <div>
            <h2 className="text-2xl font-space mb-6">🤝 Your Connections</h2>
            <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Name</th>
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Role</th>
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Field</th>
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Status</th>
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Connected</th>
                      <th className={`text-left py-3 px-4 ${theme.textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((conn) => (
                      <tr key={conn.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${
                                conn.role === "Coach" ? "bg-gradient-to-br from-purple-500 to-pink-500" : `bg-gradient-to-br ${theme.buttonGradient}`
                              } flex items-center justify-center text-sm font-bold`}
                            >
                              {conn.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {conn.name} {conn.role === "Coach" && "👨‍🏫"}
                              </p>
                              <p className={`${theme.textSecondary} text-xs`}>{conn.level}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${conn.role === "Coach" ? "bg-purple-500/20 text-purple-300" : `bg-cyan-500/20 ${theme.textAccent}`}`}>
                            {conn.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">{conn.field}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${conn.status === "active" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                            {conn.status}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${theme.textSecondary}`}>{conn.connectedSince}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMessage(conn.id)}
                              className={`px-3 py-1.5 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/20 transition`}
                            >
                              Message
                            </button>
                            <button
                              onClick={() => handleStartCollab(conn.id)}
                              className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition`}
                            >
                              Collaborate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {connections.length === 0 && (
                      <tr>
                        <td colSpan={6} className={`${theme.textSecondary} py-10 text-center`}>
                          No connections yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rooms" && (
          <div>
            <h2 className="text-2xl font-space mb-6">🧩 Active Collaboration Rooms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} hover:bg-white/10 transition`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-space">Portfolio Project Room</h3>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs">Active Now</span>
                </div>
                <p className={`${theme.textSecondary} mb-6`}>Working on homepage layout and responsive design with Alex (Coach) and Sam (Peer)</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold border-2 border-[#060318]"
                      ></div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate("/collaboration")}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition`}
                  >
                    Join Room
                  </button>
                </div>
              </div>

              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} hover:bg-white/10 transition`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-space">Code Review Session</h3>
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs">Starts in 2h</span>
                </div>
                <p className={`${theme.textSecondary} mb-6`}>Weekly code review with Coach Jordan - bring your questions and code snippets</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold border-2 border-[#060318]"
                      ></div>
                    ))}
                  </div>
                  <button className={`px-4 py-2 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} text-sm hover:bg-white/20 transition`}>
                    Set Reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`mt-16 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 ${theme.backdropBlur}`}>
          <h3 className="text-2xl font-space mb-8 text-center">How Our Matching System Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="font-space mb-2">Analyze Profile</h4>
              <p className={`${theme.textSecondary} text-sm`}>We analyze your skills, goals, personality, and learning style</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🤝</div>
              <h4 className="font-space mb-2">Find Matches</h4>
              <p className={`${theme.textSecondary} text-sm`}>AI suggests peers and coaches with complementary skills and compatible personalities</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">💬</div>
              <h4 className="font-space mb-2">Connect & Chat</h4>
              <p className={`${theme.textSecondary} text-sm`}>Start conversations, share goals, and build learning relationships</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🚀</div>
              <h4 className="font-space mb-2">Collaborate & Grow</h4>
              <p className={`${theme.textSecondary} text-sm`}>Work on projects together, share feedback, and accelerate learning</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchingPage;
