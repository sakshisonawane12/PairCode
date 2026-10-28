import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import useWebSocket from "../hooks/useWebSocket";
import PasswordModal from "../components/PasswordModal";
import HistoryPanel from "../components/HistoryPanel";
import FileTabs from "../components/FileTabs";
import {
  getRoom,
  getChatHistory,
  executeCode,
  verifyRoomPassword,
  saveSnapshot,
  getRoomFiles,
  createRoomFile,
  updateRoomFile,
  deleteRoomFile,
  getMyProfile,
} from "../services/api";
import useYjs from "../hooks/useYjs";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
const mono = { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" };

export default function Room() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const { theme } = useTheme(); // ← add this line
  const { roomCode } = useParams();
  useEffect(() => {
    getMyProfile()
      .then((res) => setUsername(res.data.username))
      .catch(() => navigate("/login"));
  }, []);

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("// Start coding here...");
  const [language, setLanguage] = useState("javascript");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [editorMounted, setEditorMounted] = useState(false);

  const chatEndRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Save visited room to localStorage so it appears in Home recent rooms
  useEffect(() => {
    if (!roomCode) return;
    const visited = JSON.parse(localStorage.getItem("visitedRooms") || "[]");
    if (!visited.includes(roomCode))
      localStorage.setItem(
        "visitedRooms",
        JSON.stringify([...visited, roomCode]),
      );
  }, [roomCode]);
  const loadedRef = useRef(false);
  const fileContentsRef = useRef({});
  const activeFileRef = useRef(null);
  const editorRef = useRef(null);

  const getDefaultCode = (lang) => {
    switch (lang) {
      case "python":
        return "# Start coding here...\n";
      case "java":
        return "// Start coding here...\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}";
      case "cpp":
        return "// Start coding here...\n#include<iostream>\nusing namespace std;\nint main() {\n    \n    return 0;\n}";
      case "typescript":
        return "// Start coding here...\n";
      case "go":
        return '// Start coding here...\npackage main\nimport "fmt"\nfunc main() {\n    \n}';
      default:
        return "// Start coding here...\n";
    }
  };

  const handleRemoteFileCreated = () => {
    getRoomFiles(roomCode)
      .then((res) => {
        setFiles([...res.data]);
        res.data.forEach((f) => {
          if (!fileContentsRef.current[f.fileName])
            fileContentsRef.current[f.fileName] = f.content || "";
        });
      })
      .catch(() => {});
  };

  const { messages, connected, sendMessage, sendFileCreated, onlineUsers } =
    useWebSocket(roomCode, username, handleRemoteFileCreated);

  const {
    connected: yjsConnected,
    awarenessUsers,
    sharedLanguage,
    setLanguage: setSharedLanguage,
  } = useYjs(
    roomCode,
    activeFile?.fileName,
    username,
    editorMounted ? editorRef : null,
    activeFile
      ? (fileContentsRef.current[activeFile.fileName] ??
          activeFile.content ??
          "")
      : "",
  );

  // When another user changes language, sync it locally
  useEffect(() => {
    if (sharedLanguage && sharedLanguage !== language) {
      setLanguage(sharedLanguage);
    }
  }, [sharedLanguage]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    getRoom(roomCode)
      .then((res) => {
        setRoom(res.data);
        setCode(res.data.currentCode || "// Start coding here...");
        setLanguage(res.data.language || "javascript");
        if (res.data.private && !passwordVerified) setShowPasswordModal(true);
      })
      .catch(() => navigate("/home"));

    getChatHistory(roomCode)
      .then((res) => setChatMessages(res.data))
      .catch(() => {});

    getRoomFiles(roomCode)
      .then((res) => {
        if (res.data.length > 0) {
          setFiles(res.data);
          setActiveFile(res.data[0]);
          setCode(res.data[0].content || getDefaultCode(res.data[0].language));
          setLanguage(res.data[0].language);
          res.data.forEach((f) => {
            fileContentsRef.current[f.fileName] = f.content || "";
          });
        } else {
          createRoomFile(roomCode, {
            fileName: "main.js",
            language: "javascript",
          }).then((r) => {
            setFiles([r.data]);
            setActiveFile(r.data);
            setCode(getDefaultCode("javascript"));
            fileContentsRef.current["main.js"] = getDefaultCode("javascript");
          });
        }
      })
      .catch(() => {});
  }, [roomCode]);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[messages.length - 1];
      setChatMessages((prev) => {
        const dup = prev.some(
          (m) =>
            m.sentAt === latest.sentAt &&
            m.username === latest.username &&
            m.content === latest.content,
        );
        return dup ? prev : [...prev, latest];
      });
    }
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handlePasswordSubmit = async (password) => {
    try {
      const res = await verifyRoomPassword(roomCode, password);
      if (res.data.valid) {
        setPasswordVerified(true);
        setShowPasswordModal(false);
      } else alert("Wrong password!");
    } catch {
      alert("Error verifying password");
    }
  };

  const handleCodeChange = (val) => {
    if (activeFile) fileContentsRef.current[activeFile.fileName] = val || "";
    setSaveStatus("saving...");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeFile && val)
        updateRoomFile(roomCode, activeFile.fileName, { content: val }).catch(
          () => {},
        );
      setSaveStatus("saved ✓");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setShowOutput(true);
    setOutput("running...");
    try {
      const currentCode = editorRef.current?.getValue() ?? code;
      const res = await executeCode({ code: currentCode, language });
      const data = res.data;
      setOutput(
        `exit: ${data.status}\n\n${data.stdout || data.stderr || "no output"}`,
      );
    } catch {
      setOutput("error: failed to execute");
    } finally {
      setRunning(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
    alert(`Link copied!`);
  };

  const handleSaveSnapshot = async () => {
    try {
      await saveSnapshot(roomCode, {
        content: editorRef.current?.getValue() ?? code,
        language,
      });
      setSaveStatus("snapshot saved ✓");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      console.error("Failed to save snapshot");
    }
  };

  const handleRestore = (snapshot) => {
    setCode(snapshot.content);
    setLanguage(snapshot.language);
    setShowHistory(false);
    setSaveStatus("restored ✓");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleSelectFile = async (file) => {
    if (activeFile?.id === file.id) return;
    if (activeFile)
      await updateRoomFile(roomCode, activeFile.fileName, {
        content: fileContentsRef.current[activeFile.fileName] ?? code,
      }).catch(() => {});
    setActiveFile(file);
    setCode(
      fileContentsRef.current[file.fileName] ??
        file.content ??
        getDefaultCode(file.language),
    );
    setLanguage(file.language);
  };

  const handleAddFile = async (fileName, lang) => {
    try {
      if (activeFile)
        await updateRoomFile(roomCode, activeFile.fileName, {
          content: fileContentsRef.current[activeFile.fileName] ?? code,
        }).catch(() => {});
      const res = await createRoomFile(roomCode, { fileName, language: lang });
      const def = getDefaultCode(lang);
      fileContentsRef.current[fileName] = def;
      setFiles((prev) => [...prev, res.data]);
      setActiveFile(res.data);
      setCode(def);
      setLanguage(lang);
      sendFileCreated(fileName, lang);
    } catch {
      alert("File already exists or invalid name!");
    }
  };

  const handleDeleteFile = async (fileName) => {
    if (!window.confirm(`Delete ${fileName}?`)) return;
    try {
      await deleteRoomFile(roomCode, fileName);
      const updated = files.filter((f) => f.fileName !== fileName);
      setFiles(updated);
      if (activeFile?.fileName === fileName && updated.length > 0) {
        setActiveFile(updated[0]);
        setCode(updated[0].content || getDefaultCode(updated[0].language));
        setLanguage(updated[0].language);
      }
    } catch {
      alert("Failed to delete file");
    }
  };

  const languages = ["javascript", "python", "java", "cpp", "typescript", "go"];
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  const langColors = {
    javascript: "#F0DB4F",
    python: "#4B8BBE",
    java: "#F89820",
    cpp: "#9C6EF9",
    typescript: "#3178C6",
    go: "#00ADD8",
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        ...mono,
        color: "var(--text-primary)",
      }}
    >
      {showHistory && (
        <HistoryPanel
          roomCode={roomCode}
          onRestore={handleRestore}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showPasswordModal && (
        <PasswordModal
          roomCode={roomCode}
          onSuccess={handlePasswordSubmit}
          onCancel={() => navigate("/home")}
        />
      )}

      {/* File tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <FileTabs
          files={files}
          activeFile={activeFile}
          onSelect={handleSelectFile}
          onAdd={handleAddFile}
          onDelete={handleDeleteFile}
        />
      </div>

      {/* Header */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 1rem",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            onClick={() => navigate("/home")}
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              cursor: "pointer",
              letterSpacing: "-0.5px",
            }}
          >
            PairCode
          </span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ fontSize: "13px", color: "#8b949e" }}>
            {room?.name}
          </span>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(35,134,54,0.15)",
              color: "#3fb950",
              border: "1px solid rgba(63,185,80,0.25)",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            {roomCode}
          </span>
          <button onClick={copyRoomLink} style={ghostBtn}>
            ⎋ copy link
          </button>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Live indicator */}
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: yjsConnected
                ? "rgba(63,185,80,0.12)"
                : "rgba(248,81,73,0.12)",
              color: yjsConnected ? "#3fb950" : "#f85149",
              border: `1px solid ${yjsConnected ? "rgba(63,185,80,0.25)" : "rgba(248,81,73,0.25)"}`,
            }}
          >
            {yjsConnected ? "● live" : "○ offline"}
          </span>
          {/* Users */}
          <span style={{ fontSize: "12px", color: "#8b949e" }}>
            {awarenessUsers.length} online
          </span>
          <div
            style={{
              width: "1px",
              height: "16px",
              background: "var(--border)",
            }}
          />
          {/* Lang select */}
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setSharedLanguage(e.target.value);
            }}
            style={{
              background: "#161b22",
              border: "1px solid var(--border)",
              borderRadius: "5px",
              color: langColors[language] || "#e6edf3",
              fontSize: "12px",
              padding: "3px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {languages.map((l) => (
              <option key={l} value={l} style={{ color: "#e6edf3" }}>
                {l}
              </option>
            ))}
          </select>
          {/* Action buttons */}
          <button
            onClick={handleRunCode}
            disabled={running}
            style={{
              ...actionBtn,
              background: running
                ? "var(--bg-elevated)"
                : "rgba(31,111,235,0.15)",
              color: running ? "#484f58" : "#58a6ff",
              border: "1px solid rgba(31,111,235,0.3)",
            }}
          >
            {running ? "⏳ running..." : "▶ run"}
          </button>
          <button
            onClick={handleSaveSnapshot}
            style={{
              ...actionBtn,
              background: "rgba(35,134,54,0.12)",
              color: "#3fb950",
              border: "1px solid rgba(63,185,80,0.25)",
            }}
          >
            ↓ snapshot
          </button>
          <button onClick={() => setShowHistory(true)} style={ghostBtn}>
            ⧖ history
          </button>
          {saveStatus && (
            <span
              style={{
                fontSize: "11px",
                color: saveStatus.includes("✓") ? "#3fb950" : "#e3b341",
              }}
            >
              {saveStatus}
            </span>
          )}
          <div
            style={{
              width: "1px",
              height: "16px",
              background: "var(--border)",
            }}
          />
          <ThemeToggle /> {/* ← add here */}
          {/* Avatar */}
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #238636, #1f6feb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--text-primary)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Editor */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: showOutput ? "0 0 65%" : "1", minHeight: 0 }}>
            <Editor
              height="100%"
              language={language}
              defaultValue=""
              keepCurrentModel={false}
              theme={theme === "dark" ? "vs-dark" : "light"}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editorRef.current = editor;
                setEditorMounted(true);
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                cursorSmoothCaretAnimation: "on",
                cursorBlinking: "smooth",
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: false,
              }}
            />
          </div>

          {showOutput && (
            <div
              style={{
                flex: "0 0 35%",
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-base)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#58a6ff",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  ▶ output
                </span>
                <button
                  onClick={() => setShowOutput(false)}
                  style={{ ...ghostBtn, fontSize: "11px" }}
                >
                  ✕ close
                </button>
              </div>
              <pre
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "12px 16px",
                  fontSize: "12px",
                  color: "#3fb950",
                  margin: 0,
                  lineHeight: 1.6,
                  ...mono,
                }}
              >
                {output}
              </pre>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div
          style={{
            width: "260px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-faint)",
                margin: "0 0 8px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              — chat
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {awarenessUsers.map((u, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "11px",
                    padding: "2px 7px",
                    borderRadius: "3px",
                    background: u.color + "22",
                    color: "var(--text-primary)",
                    border: `1px solid ${u.color}44`,
                  }}
                >
                  ● {u.name}
                </span>
              ))}
              {awarenessUsers.length === 0 &&
                onlineUsers.map((u, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "11px",
                      padding: "2px 7px",
                      borderRadius: "3px",
                      background: "rgba(63,185,80,0.1)",
                      color: "#3fb950",
                      border: "1px solid rgba(63,185,80,0.2)",
                    }}
                  >
                    ● {u}
                  </span>
                ))}
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {chatMessages.length === 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dead)",
                  textAlign: "center",
                  marginTop: "2rem",
                }}
              >
                no messages yet
              </p>
            )}
            {chatMessages.map((msg, i) =>
              msg.type === "CHAT" ? (
                <div key={i}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#3fb950",
                      fontWeight: 600,
                    }}
                  >
                    {msg.username}{" "}
                  </span>
                  <span
                    style={{ fontSize: "12px", color: "var(--text-muted)" }}
                  >
                    {msg.content}
                  </span>
                </div>
              ) : (
                <p
                  key={i}
                  style={{
                    fontSize: "11px",
                    color: "var(--text-dead)",
                    textAlign: "center",
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  {msg.content}
                </p>
              ),
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "6px",
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="message..."
              style={{
                flex: 1,
                minWidth: 0,
                background: "#161b22",
                border: "1px solid var(--border)",
                borderRadius: "5px",
                padding: "6px 10px",
                color: "#e6edf3",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3fb950")}
              onBlur={(e) => (e.target.style.borderColor = "#21262d")}
            />
            <button
              type="submit"
              style={{
                background: "#238636",
                border: "none",
                borderRadius: "5px",
                color: "var(--text-primary)",
                fontSize: "12px",
                padding: "6px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const ghostBtn = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  color: "var(--text-muted)",
  fontSize: "12px",
  padding: "3px 9px",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace",
  transition: "color 0.15s, border-color 0.15s",
};

const actionBtn = {
  border: "none",
  borderRadius: "5px",
  fontSize: "12px",
  padding: "3px 10px",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
  transition: "opacity 0.15s",
};
