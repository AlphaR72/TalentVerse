import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const languageTemplates = {
  javascript: `// JavaScript Collaboration Session
// Welcome to TalentVerse Live Coding

function greetTeam() {
  const team = ["You", "Coach Alex", "Peer Sam"];
  team.forEach((member) => console.log(\`Hello \${member}!\`));
  return "Let's code together!";
}

// Your code here...`,

  typescript: `// TypeScript Collaboration Session
// Welcome to TalentVerse Live Coding

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

const teamMembers: TeamMember[] = [
  { id: 1, name: "You", role: "Learner" },
  { id: 2, name: "Coach Alex", role: "Mentor" },
  { id: 3, name: "Peer Sam", role: "Collaborator" }
];

// Your TypeScript code here...`,

  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TalentVerse - Collaborative HTML</title>
</head>
<body>
  <h1>Collaborative HTML Editor</h1>
  <!-- Your HTML here -->
</body>
</html>`,

  css: `/* CSS Collaboration Session */
:root {
  --primary: #667eea;
  --secondary: #764ba2;
}

body {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
}`,

  python: `# Python Collaboration Session
def hello():
  print("Hello from TalentVerse!")`,

  java: `// Java Collaboration Session
public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from TalentVerse!");
  }
}
`,
};

const CollaborationRoom = () => {
  const theme = useAdaptiveTheme();

  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState("");
  const [input, setInput] = useState("");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState("");

  const [activeTab, setActiveTab] = useState("chat");
  const [codeContent, setCodeContent] = useState(languageTemplates.javascript);
  const [language, setLanguage] = useState("javascript");
  const [isCodeShared, setIsCodeShared] = useState(false);

  const [collaborators] = useState([
    { id: 1, name: "You", color: "from-indigo-500 to-cyan-400", isActive: true },
    { id: 2, name: "Coach Alex", color: "from-purple-500 to-pink-500", isActive: true },
    { id: 3, name: "Peer Sam", color: "from-green-500 to-emerald-400", isActive: false },
  ]);

  const languages = [
    { value: "javascript", label: "JavaScript", icon: "🟨" },
    { value: "typescript", label: "TypeScript", icon: "🔷" },
    { value: "html", label: "HTML", icon: "🌐" },
    { value: "css", label: "CSS", icon: "🎨" },
    { value: "python", label: "Python", icon: "🐍" },
    { value: "java", label: "Java", icon: "☕" },
  ];

  const showSystem = (text) => {
    setMessages((prev) => [...prev, { sender: "System", text, isSystem: true }]);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: "You", text: input }]);
    setInput("");
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [...prev, { text: newTask, done: false }]);
    setNewTask("");
    setShowTaskModal(false);
  };

  const toggleTask = (index) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const startCodeSharing = () => {
    setIsCodeShared(true);
    setActiveTab("code");
    showSystem("🎉 Live code collaboration session started! Join the code editor tab.");
  };

  const stopCodeSharing = () => {
    setIsCodeShared(false);
    showSystem("⏹️ Live code collaboration session ended.");
    alert("Live code sharing stopped. Code changes are not synced now.");
  };

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    if (languageTemplates[selected]) setCodeContent(languageTemplates[selected]);
  };

  const safeCopy = async (text, fallbackMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("📋 Copied!");
    } catch {
      alert(fallbackMsg || "Copy failed (browser permissions).");
    }
  };

  const saveSession = () => {
    const sessionData = { messages, tasks, notes, codeContent, language, timestamp: new Date().toISOString() };
    localStorage.setItem("collaboration_session", JSON.stringify(sessionData));
    alert("💾 Collaboration session saved locally!");
  };

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`} />

      <div className="relative z-10 max-w-7xl mx-auto py-20 px-6">
        <h1 className="text-5xl font-space font-bold mb-6 text-center">🧩 Advanced Collaboration Room</h1>

        <p className={`${theme.textSecondary} text-center mb-10 max-w-3xl mx-auto`}>
          Real-time collaboration with team chat, shared tasks, notes, and{" "}
          <span className={`${theme.textAccent} font-semibold`}>live code editing</span>.
        </p>

        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-4 mb-8 ${theme.backdropBlur}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-sm font-bold border-2 border-[#060318] relative`}
                  >
                    {c.name.charAt(0)}
                    {c.isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-[#060318]" />}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-space">Active Collaboration</h3>
                <p className={`${theme.textSecondary} text-sm`}>
                  {collaborators.filter((c) => c.isActive).length} of {collaborators.length} collaborators online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCodeShared && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-300">Live Code Sharing Active</span>
                </div>
              )}

              {isCodeShared ? (
                <button onClick={stopCodeSharing} className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium hover:scale-[1.03] transition flex items-center gap-2">
                  <span>⏹️</span> Stop Sharing
                </button>
              ) : (
                <button onClick={startCodeSharing} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-medium hover:scale-[1.03] transition flex items-center gap-2`}>
                  <span>💻</span> Start Live Code Share
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
          {[
            ["chat", `💬 Team Chat (${messages.length})`],
            ["tasks", `📝 Shared Tasks (${tasks.length})`],
            ["notes", "🗒 Shared Notes"],
            ["code", `💻 Live Code Editor ${isCodeShared ? "🔴" : ""}`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key ? `${theme.textPrimary} border-b-2 ${theme.textAccent}` : `${theme.textSecondary} hover:text-white`
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {activeTab === "chat" && (
            <div className="lg:col-span-2">
              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} shadow-xl flex flex-col h-[600px]`}>
                <h2 className="text-2xl font-space mb-4">💬 Team Chat</h2>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">💬</div>
                      <h3 className="text-xl font-space mb-2">Start the conversation</h3>
                      <p className={theme.textSecondary}>Send a message to begin collaborating with your team</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl max-w-[70%] ${
                          msg.sender === "You" ? `bg-gradient-to-r ${theme.buttonGradient} ml-auto` : msg.isSystem ? "bg-yellow-500/20 border border-yellow-500/40" : theme.cardBgClass
                        }`}
                      >
                        <p className="text-sm opacity-80">{msg.sender}</p>
                        <p className={theme.textPrimary}>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className={`flex-1 px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none`}
                  />
                  <button onClick={sendMessage} className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.03] transition`}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="lg:col-span-2">
              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} shadow-xl flex flex-col h-[600px]`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-space">📝 Shared Tasks</h2>
                  <button onClick={() => setShowTaskModal(true)} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white text-sm hover:scale-[1.03] transition`}>
                    Add Task
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📝</div>
                    <h3 className="text-xl font-space mb-2">No tasks yet</h3>
                    <p className={theme.textSecondary}>Add tasks to organize your collaboration session</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto pr-2">
                    <ul className="space-y-3">
                      {tasks.map((task, i) => (
                        <li
                          key={i}
                          className={`p-4 rounded-xl border ${theme.cardBorderClass} flex justify-between items-center ${
                            task.done ? "bg-green-500/20 line-through" : theme.cardBgClass
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => toggleTask(i)}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                                task.done ? "bg-green-500 border-green-500" : "border-white/40 hover:border-cyan-400"
                              } flex items-center justify-center`}
                            >
                              {task.done && <span>✓</span>}
                            </div>
                            <span className={task.done ? "text-white/60" : theme.textPrimary}>{task.text}</span>
                          </div>

                          <button onClick={() => deleteTask(i)} className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-500/10">
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="lg:col-span-2">
              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur} shadow-xl flex flex-col h-[600px]`}>
                <h2 className="text-2xl font-space mb-4">🗒 Shared Notes</h2>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write shared notes here..."
                  className={`flex-1 w-full ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-xl p-4 ${theme.textPrimary} focus:outline-none resize-none`}
                />

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => safeCopy(notes, "Copy notes failed")} className={`px-4 py-2 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20 transition`}>
                    Copy Notes
                  </button>
                  <button onClick={() => alert("Notes saved!")} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}>
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="lg:col-span-3">
              <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-0 overflow-hidden ${theme.backdropBlur} shadow-xl flex flex-col h-[700px]`}>
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-space">💻 Live Code Editor</h2>
                    {isCodeShared && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                        <span className="text-sm text-cyan-300">Live Collaboration Active</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={language}
                      onChange={handleLanguageChange}
                      className={`appearance-none ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-lg px-4 py-2 ${theme.textPrimary} focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer`}
                    >
                      {languages.map((lang) => (
                        <option key={lang.value} value={lang.value} className="bg-[#060318]">
                          {lang.icon} {lang.label}
                        </option>
                      ))}
                    </select>

                    <button onClick={() => safeCopy(codeContent, "Copy code failed")} className={`px-4 py-2 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/20 transition`}>
                      📋 Copy
                    </button>
                    <button onClick={() => alert("💾 Code saved!")} className={`px-4 py-2 rounded-lg bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}>
                      💾 Save
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <Editor
                    height="100%"
                    language={language}
                    value={codeContent}
                    onChange={(value) => setCodeContent(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      wordWrap: "on",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`${theme.textSecondary} text-sm`}>Collaborators editing:</span>
                      <div className="flex gap-2 flex-wrap">
                        {collaborators
                          .filter((c) => c.isActive)
                          .map((c) => (
                            <div key={c.id} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10">
                              <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${c.color}`} />
                              <span className="text-sm">{c.name}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className={`${theme.textSecondary} text-sm`}>
                      {isCodeShared ? (
                        <span className="text-green-300">🟢 Changes are synced in real-time</span>
                      ) : (
                        <span className="text-yellow-300">🟡 Local only. Start sharing to collaborate.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
              <h3 className="text-xl font-space mb-4">⚡ Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowTaskModal(true)} className={`${theme.cardBgClass} border ${theme.cardBorderClass} p-3 rounded-xl hover:bg-white/20 transition`}>
                  ➕ Add Task
                </button>
                <button onClick={() => safeCopy(codeContent, "Copy code failed")} className={`${theme.cardBgClass} border ${theme.cardBorderClass} p-3 rounded-xl hover:bg-white/20 transition`}>
                  📋 Copy Code
                </button>
                <button onClick={() => safeCopy(notes, "Copy notes failed")} className={`${theme.cardBgClass} border ${theme.cardBorderClass} p-3 rounded-xl hover:bg-white/20 transition`}>
                  🗒 Copy Notes
                </button>
                <button onClick={saveSession} className={`p-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} hover:scale-[1.03] transition`}>
                  💾 Save Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 w-full max-w-md`}>
            <h3 className="text-xl font-space mb-4">Add New Task</h3>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Task description..."
              className={`w-full px-4 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} focus:outline-none mb-4`}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowTaskModal(false)} className={`px-4 py-2 rounded-xl ${theme.cardBgClass} ${theme.textPrimary} hover:bg-white/20 transition`}>
                Cancel
              </button>
              <button onClick={addTask} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}>
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationRoom;
