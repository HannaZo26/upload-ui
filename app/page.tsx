"use client";

import { useMemo, useState } from "react";

type DemoUserRecord = {
  password: string;
  displayName: string;
  folders: string[];
  pages: string[];
};

type ShortUrlResult = {
  id?: string;
  slug?: string;
  shortUrl?: string;
  raw?: unknown;
};

const demoUsers: Record<string, DemoUserRecord> = {
  hannah: {
    password: "demo123",
    displayName: "Hannah",
    folders: ["clearviewdaily", "dailytrendpulse", "flashbrieftoday", "horizonupdatesshow", "viewscopedaily"],
    pages: ["clearviewdaily", "dailytrendpulse", "flashbrieftoday", "horizonupdatesshow", "viewscopedaily"],
  },
  editor1: {
    password: "demo123",
    displayName: "Editor 1",
    folders: ["clearviewdaily", "dailytrendpulse", "viewscopedaily"],
    pages: ["clearviewdaily", "dailytrendpulse", "viewscopedaily"],
  },
  editor2: {
    password: "demo123",
    displayName: "Editor 2",
    folders: ["viewscopedaily"],
    pages: ["viewscopedaily"],
  },
};

export default function Page() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string } | null>(null);
  const [authError, setAuthError] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [domainId, setDomainId] = useState("1");
  const [projectId, setProjectId] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("https://n8n.influencerconnectagency.biz/webhook/upload-entry");

  const [targetUrl, setTargetUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [folderName, setFolderName] = useState("clearviewdaily");
  const [pageName, setPageName] = useState("clearviewdaily");
  const [files, setFiles] = useState<File[]>([]);
  const [shortUrlResult, setShortUrlResult] = useState<ShortUrlResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableFolders = currentUser ? demoUsers[currentUser.username]?.folders ?? [] : [];
  const availablePages = currentUser ? demoUsers[currentUser.username]?.pages ?? [] : [];

  const acceptedSummary = useMemo(() => {
    if (!files.length) return "No files selected";
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const mb = (total / 1024 / 1024).toFixed(2);
    return `${files.length} file(s) selected · ${mb} MB`;
  }, [files]);

  const handleLogin = () => {
    setAuthError("");
    setError("");
    setSuccess("");

    const key = loginUsername.trim().toLowerCase();
    const record = demoUsers[key];

    if (!record || record.password !== loginPassword) {
      setCurrentUser(null);
      setAuthError("Invalid username or password.");
      return;
    }

    setCurrentUser({ username: key, displayName: record.displayName });
    setFolderName(record.folders[0] || "");
    setPageName(record.pages[0] || "");
    setSuccess(`Welcome, ${record.displayName}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginPassword("");
    setAuthError("");
    setFiles([]);
    setShortUrlResult(null);
    setSuccess("");
    setError("");
  };

  const handleFiles = (incoming: FileList | null) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    setError("");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createShortUrl = async () => {
    setCreating(true);
    setError("");
    setSuccess("");
    setShortUrlResult(null);

    try {
      if (!apiKey.trim()) throw new Error("Please enter your OKURL API key.");
      if (!domainId.trim()) throw new Error("Please enter domain_id.");
      if (!targetUrl.trim()) throw new Error("Please enter the original URL.");

      const payload: Record<string, string> = {
        domain_id: domainId.trim(),
        url: targetUrl.trim(),
      };

      if (customSlug.trim()) payload.slug = customSlug.trim();
      if (title.trim()) payload.title = title.trim();
      if (projectId.trim()) payload.project_id = projectId.trim();

      const res = await fetch("https://okurl.io/v1/urls/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data?._res !== "ok") {
        throw new Error(data?.msg || data?.code || "Failed to create short URL.");
      }

      const possibleShortUrl =
        data.short_url ||
        data.shorturl ||
        data.url_short ||
        data.url ||
        (data.slug ? `https://okurl.io/${data.slug}` : "");

      setShortUrlResult({
        id: data.id,
        slug: data.slug,
        shortUrl: possibleShortUrl,
        raw: data,
      });
      setSuccess("Short URL created successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create short URL.");
    } finally {
      setCreating(false);
    }
  };

  const copyShortUrl = async () => {
    if (!shortUrlResult?.shortUrl) return;
    await navigator.clipboard.writeText(shortUrlResult.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const submitToN8n = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!currentUser) throw new Error("Please log in first.");
      if (!n8nWebhookUrl.trim()) throw new Error("Please enter your n8n webhook URL.");
      if (!folderName.trim()) throw new Error("Please select a Google Drive folder.");
      if (!pageName.trim()) throw new Error("Please select a page.");
      if (!files.length) throw new Error("Please add at least one file.");

      const formData = new FormData();
      formData.append("username", currentUser.username);
      formData.append("display_name", currentUser.displayName);
      formData.append("page_name", pageName);
      formData.append("folder_name", folderName);
      formData.append("title", title);
      formData.append("notes", notes);
      formData.append("target_url", targetUrl);
      formData.append("okurl_slug", shortUrlResult?.slug || "");
      formData.append("short_url", shortUrlResult?.shortUrl || "");
      formData.append("project_id", projectId);
      formData.append("domain_id", domainId);

      files.forEach((file, index) => {
        formData.append(`file_${index + 1}`, file);
      });

      const res = await fetch(n8nWebhookUrl.trim(), {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        const message = typeof data === "string" ? data : data?.message || data?.error || "n8n webhook failed.";
        throw new Error(message);
      }

      setSuccess("Submitted to n8n successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit to n8n.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <main className="page-shell centered">
        <section className="card auth-card">
          <div className="badge">Protected upload portal</div>
          <h1>Sign in to upload</h1>
          <p className="muted">Each user only sees the Google Drive folders assigned to them.</p>

          <div className="field">
            <label>Username</label>
            <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="hannah" />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="button primary full" onClick={handleLogin}>
            Log in
          </button>

          {authError ? <div className="alert error">{authError}</div> : null}

          <div className="demo-box">
            Demo accounts:
            <br />
            hannah / demo123
            <br />
            editor1 / demo123
            <br />
            editor2 / demo123
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="topbar card">
        <div>
          <div className="muted small">Signed in as</div>
          <div className="user-line">
            {currentUser.displayName} <span className="muted">({currentUser.username})</span>
          </div>
        </div>
        <button className="button secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="grid">
        <div className="main-column">
          <section className="card">
            <div className="badge">Single entry portal</div>
            <h1>Upload to Google Drive + OKURL + n8n</h1>
            <p className="muted">One page for file upload, short-link creation, and workflow submission.</p>

            <div className="form-grid">
              <div className="field">
                <label>OKURL API Key</label>
                <input
                  type="password"
                  placeholder="okurl_xxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="field">
                <label>n8n Webhook URL</label>
                <input
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  placeholder="https://n8n.influencerconnectagency.biz/webhook-test/upload-entry"
                />
              </div>

              <div className="field">
                <label>OKURL domain_id</label>
                <input value={domainId} onChange={(e) => setDomainId(e.target.value)} />
              </div>

              <div className="field">
                <label>OKURL project_id (optional)</label>
                <input value={projectId} onChange={(e) => setProjectId(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card">
            <h2>1) Drag files here</h2>
            <p className="muted">Users can drag files here instead of opening multiple Google Drive links.</p>

            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
            >
              <div className="drop-title">Drop files here or click to browse</div>
              <div className="muted">Supports video, text, image, and other workflow files</div>
              <input className="hidden-file-input" type="file" multiple onChange={(e) => handleFiles(e.target.files)} />
            </label>

            <div className="summary">{acceptedSummary}</div>

            {files.length ? (
              <div className="file-list">
                {files.map((file, index) => (
                  <div className="file-row" key={`${file.name}-${index}`}>
                    <div>
                      <div className="file-name">{file.name}</div>
                      <div className="muted small">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button className="button secondary small" onClick={() => removeFile(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card">
            <h2>2) Fill metadata</h2>

            <div className="form-grid">
              <div className="field">
                <label>Page Name</label>
                <select value={pageName} onChange={(e) => setPageName(e.target.value)}>
                  {availablePages.map((page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Google Drive Folder</label>
                <select value={folderName} onChange={(e) => setFolderName(e.target.value)}>
                  {availableFolders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field span-2">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title or campaign title" />
              </div>

              <div className="field span-2">
                <label>Original URL</label>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/article-or-landing-page"
                />
              </div>

              <div className="field">
                <label>Custom slug (optional)</label>
                <input value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} placeholder="custom-slug" />
              </div>

              <div className="field">
                <label>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra instructions for n8n" />
              </div>
            </div>
          </section>
        </div>

        <div className="side-column">
          <section className="card">
            <h2>3) Create OKURL short link</h2>
            <p className="muted">Uses OKURL endpoint POST /v1/urls/add.</p>

            <button className="button primary full" onClick={createShortUrl} disabled={creating}>
              {creating ? "Generating..." : "Generate Short URL"}
            </button>

            {shortUrlResult ? (
              <div className="result-box">
                <div className="muted small">Generated link</div>
                <div className="link-output">{shortUrlResult.shortUrl || `slug: ${shortUrlResult.slug}`}</div>
                <button className="button secondary small" onClick={copyShortUrl}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="card">
            <h2>4) Send everything to n8n</h2>
            <p className="muted">Submits files and all metadata to your existing workflow.</p>

            <button className="button primary full" onClick={submitToN8n} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit to n8n"}
            </button>

            <hr className="divider" />

            <div className="muted">
              Recommended n8n flow:
              <br />
              Webhook → Code → IF → Google Drive Upload → Respond to Webhook
            </div>
          </section>

          {error ? <div className="alert error">{error}</div> : null}
          {success ? <div className="alert success">{success}</div> : null}

          <section className="card">
            <h2>Before you use it</h2>
            <div className="bullet-list muted">
              <div>• Replace the n8n webhook URL with your real endpoint.</div>
              <div>• Real authentication and folder authorization should also be enforced in n8n.</div>
              <div>• Paste your OKURL API key in the first field.</div>
              <div>• Fill in the correct OKURL domain_id.</div>
              <div>• Your n8n webhook should accept multipart/form-data.</div>
              <div>• For large video files, upload in small tests first.</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
