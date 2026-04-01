"use client";

import { useEffect, useState } from "react";

/** ====== USER 權限 ====== */
const USERS = {
  haiyennt: {
    password: "Hge&geTEg@ge123",
    pages: ["tastefulworldzh","feelgoodbeautyzh","worldtravelerszh","culturalwander"],
  },
  hannah: {
    password: "UhgTRg@kg$253",
    pages: ["clearviewdaily","viewscopedaily","dailytrendpulse","flashbrieftoday"],
  },
};

/** ====== Page → Project mapping ====== */
const PAGE_PROJECT_MAP: Record<string, string> = {
  clearviewdaily: "8",
  viewscopedaily: "9",
  dailytrendpulse: "10",
  flashbrieftoday: "11",
};

/** ====== UTM TEMPLATE（你可自由擴充）====== */
const UTM_TEMPLATES = [
  { id: "1", name: "Default FB Reel" },
  { id: "2", name: "IG Traffic" },
];

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [page, setPage] = useState("");
  const [projectId, setProjectId] = useState("");

  const [utmId, setUtmId] = useState("");

  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [txt, setTxt] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState("");

  /** ====== LOGIN ====== */
  const handleLogin = () => {
    const u = USERS[username as keyof typeof USERS];
    if (!u || u.password !== password) {
      alert("Login failed");
      return;
    }
    setUser({ name: username, pages: u.pages });
  };

  /** ====== Page change → 自動帶 project ====== */
  useEffect(() => {
    if (page && PAGE_PROJECT_MAP[page]) {
      setProjectId(PAGE_PROJECT_MAP[page]);
    }
  }, [page]);

  /** ====== OKURL ====== */
  const generateShort = async () => {
    if (!longUrl || !projectId || !utmId) {
      alert("請填完整");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/okurl-create", {
        method: "POST",
        body: JSON.stringify({
          url: longUrl,
          project_id: projectId,
          utm_tpl_id: utmId, // 🔥 關鍵
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "error");

      setShortUrl(data.short_url);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(shortUrl);
    setMsg("Copied!");
  };

  /** ====== TXT ====== */
  const downloadTxt = () => {
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "caption.txt";
    a.click();
  };

  /** ====== Upload ====== */
  const upload = () => {
    alert("Upload logic 接 n8n");
  };

  /** ====== LOGIN UI ====== */
  if (!user) {
    return (
      <div className="centered">
        <div className="card auth-card">
          <h2>Sign in</h2>
          <input placeholder="username" onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="password" type="password" onChange={(e) => setPassword(e.target.value)} />
          <button className="button primary full" onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    );
  }

  /** ====== MAIN UI ====== */
  return (
    <div className="page-shell">
      <div className="topbar">
        <h1>Upload Console</h1>
        <div>
          <b>{user.name}</b>
        </div>
      </div>

      <div className="grid">
        {/* LEFT */}
        <div className="main-column">

          {/* STEP 1 */}
          <div className="card">
            <h2>Step 1 - Upload Settings</h2>

            <div className="form-grid">
              <div className="field">
                <label>Page</label>
                <select onChange={(e) => setPage(e.target.value)}>
                  <option>Select</option>
                  {user.pages.map((p: string) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Project ID</label>
                <input value={projectId} readOnly />
              </div>
            </div>
          </div>

          {/* STEP 2 OKURL */}
          <div className="card">
            <h2>OKURL Generator</h2>

            <input
              placeholder="Original URL"
              onChange={(e) => setLongUrl(e.target.value)}
            />

            <select onChange={(e) => setUtmId(e.target.value)}>
              <option>Select UTM Template</option>
              {UTM_TEMPLATES.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <button className="button primary" onClick={generateShort}>
              {loading ? "Generating..." : "Generate Short URL"}
            </button>

            {shortUrl && (
              <div className="result-box">
                <div className="link-output">{shortUrl}</div>
                <button className="button secondary" onClick={copy}>
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* STEP 3 TXT */}
          <div className="card">
            <h2>TXT Generator</h2>

            <textarea
              rows={3}
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="貼 short link + 描述"
            />

            <button className="button primary" onClick={downloadTxt}>
              Download TXT
            </button>
          </div>

          {/* STEP 4 Upload */}
          <div className="card">
            <h2>Upload Files</h2>

            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />

            <button className="button primary" onClick={upload}>
              Upload
            </button>
          </div>

        </div>

        {/* RIGHT */}
        <div className="side-column">
          <div className="card">
            <h2>Flow</h2>
            <ul>
              <li>1. 選 page</li>
              <li>2. 生成 short link</li>
              <li>3. 寫 TXT</li>
              <li>4. 上傳</li>
            </ul>
          </div>

          {msg && <div className="alert success">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
