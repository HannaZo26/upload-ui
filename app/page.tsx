"use client";

import React, { useMemo, useRef, useState } from "react";

type DemoUser = {
  password: string;
  displayName: string;
  folders: string[];
  pages: string[];
};

const demoUsers: Record<string, DemoUser> = {
  haiyennt: {
    password: "Hge&geTEg@ge123",
    displayName: "Haiyen",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
    ],
  },

  hannah: {
    password: "UhgTRg@kg$253",
    displayName: "Hannah",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
  },

  gjwmarketing: {
    password: "jgGTR#kg$93",
    displayName: "GJW Marketing",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
  },

  ying: {
    password: "HGtYEG$eff@323",
    displayName: "Ying",
    folders: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
    pages: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
  },

  ivyzhang: {
    password: "ygeTTge$eff@#24",
    displayName: "Ivy Zhang",
    folders: ["everydayvitalityzh", "healthyrhythmdaily"],
    pages: ["everydayvitalityzh", "healthyrhythmdaily"],
  },

  lucywang: {
    password: "GhyTge#rge@87",
    displayName: "Lucy Wang",
    folders: ["horizonupdatesshow", "flashbrieftoday"],
    pages: ["horizonupdatesshow", "flashbrieftoday"],
  },
};

type CurrentUser = {
  username: string;
  displayName: string;
};

export default function Page() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authError, setAuthError] = useState("");

  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(
    "https://n8n.influencerconnectagency.biz/webhook/upload-entry"
  );

  const [apiKey, setApiKey] = useState("");
  const [domainId, setDomainId] = useState("1");
  const [projectId, setProjectId] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  const [folderName, setFolderName] = useState("clearviewdaily");
  const [pageName, setPageName] = useState("clearviewdaily");

  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [txtTitle, setTxtTitle] = useState("");
  const [txtDescription, setTxtDescription] = useState("");
  const [txtExtra, setTxtExtra] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableFolders = useMemo(() => {
    if (!currentUser) return [];
    return demoUsers[currentUser.username]?.folders ?? [];
  }, [currentUser]);

  const availablePages = useMemo(() => {
    if (!currentUser) return [];
    return demoUsers[currentUser.username]?.pages ?? [];
  }, [currentUser]);

  const totalSizeMb = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return (total / 1024 / 1024).toFixed(2);
  }, [files]);

  const txtPreview = useMemo(() => {
    return [txtTitle.trim(), txtDescription.trim(), txtExtra.trim()]
      .filter(Boolean)
      .join("\n\n");
  }, [txtTitle, txtDescription, txtExtra]);

  const resetUploadForm = () => {
    setFiles([]);
    setTitle("");
    setTargetUrl("");
    setNotes("");
    setCustomSlug("");
    setShortUrl("");
    setTxtTitle("");
    setTxtDescription("");
    setTxtExtra("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSuccess("");
    setError("");

    const username = loginUsername.trim().toLowerCase();
    const user = demoUsers[username];

    if (!user || user.password !== loginPassword) {
      setAuthError("Invalid username or password.");
      return;
    }

    setCurrentUser({
      username,
      displayName: user.displayName,
    });

    const firstFolder = user.folders[0] ?? "";
    const firstPage = user.pages[0] ?? "";
    setFolderName(firstFolder);
    setPageName(firstPage);
    setLoginPassword("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setFiles([]);
    setSuccess("");
    setError("");
    setAuthError("");
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const file of list) {
        const exists = merged.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
        if (!exists) merged.push(file);
      }
      return merged;
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadTxt = () => {
    if (!txtPreview) {
      setError("Please enter TXT content before downloading.");
      setSuccess("");
      return;
    }

    const blob = new Blob(["\uFEFF" + txtPreview], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (txtTitle || title || "content")
      .trim()
      .replace(/[^\w\-]+/g, "_");
    a.href = url;
    a.download = `${safeTitle || "content"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSuccess("UTF-8 TXT downloaded successfully.");
    setError("");
  };

  const generateShortUrl = async () => {
    setSuccess("");
    setError("");

    if (!targetUrl.trim()) {
      setError("Please enter the original URL first.");
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter the OKURL API key.");
      return;
    }

    if (!domainId.trim()) {
      setError("Please enter the OKURL domain_id.");
      return;
    }

    try {
      setCreatingShortUrl(true);

      const payload: Record<string, string> = {
        url: targetUrl.trim(),
        domain_id: domainId.trim(),
      };

      if (projectId.trim()) payload.project_id = projectId.trim();
      if (customSlug.trim()) payload.slug = customSlug.trim();

      const res = await fetch("https://okurl.io/api/v1/urls/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to generate short URL.");
      }

      const value =
        data?.short_url ||
        data?.shortUrl ||
        data?.data?.short_url ||
        data?.data?.shortUrl ||
        "";

      if (!value) {
        throw new Error("Short URL was not returned by OKURL.");
      }

      setShortUrl(value);
      setSuccess("Short URL generated successfully.");
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to generate short URL.");
      setSuccess("");
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const submitToN8n = async () => {
    setSuccess("");
    setError("");

    if (!currentUser) {
      setError("Please sign in first.");
      return;
    }

    if (!n8nWebhookUrl.trim()) {
      setError("Please enter your n8n webhook URL.");
      return;
    }

    if (!pageName || !folderName) {
      setError("Please choose a page and folder.");
      return;
    }

    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("username", currentUser.username);
      formData.append("page_name", pageName);
      formData.append("folder_name", folderName);
      formData.append("title", title);
      formData.append("target_url", targetUrl);
      formData.append("notes", notes);
      formData.append("short_url", shortUrl);
      formData.append("okurl_slug", customSlug);
      formData.append("project_id", projectId);
      formData.append("domain_id", domainId);

      files.forEach((file, idx) => {
        formData.append(`file_${idx + 1}`, file, file.name);
      });

      const res = await fetch(n8nWebhookUrl, {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Upload failed (${res.status})`);
      }

      resetUploadForm();
      setSuccess(data?.message || "Submitted to n8n successfully. Form has been cleared.");
      setError("");
    } catch (err: any) {
      setError(err?.message || "Submit failed.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={styles.logoBox}>
            <div style={styles.logoDot} />
            <div>
              <div style={styles.logoTitle}>Upload Console</div>
              <div style={styles.logoSub}>Drive + OKURL + n8n</div>
            </div>
          </div>

          <div style={styles.navCard}>
            <div style={styles.navSectionTitle}>Workflow</div>
            <div style={styles.navItemActive}>Upload workspace</div>
            <div style={styles.navItem}>TXT generator</div>
            <div style={styles.navItem}>Short link tools</div>
          </div>

          <div style={styles.navCard}>
            <div style={styles.navSectionTitle}>Current flow</div>
            <ul style={styles.miniList}>
              <li>Login with assigned permissions</li>
              <li>Upload files to page folder</li>
              <li>Optionally generate short link</li>
              <li>Submit package to n8n</li>
            </ul>
          </div>
        </aside>

        <div style={styles.mainArea}>
          <div style={styles.topbar}>
            <div>
              <div style={styles.badge}>Admin Workspace</div>
              <h1 style={styles.title}>Content Upload Dashboard</h1>
              <p style={styles.subtitle}>
                A cleaner backend-style interface for file upload, metadata preparation,
                TXT generation, optional OKURL shortening, and n8n submission.
              </p>
            </div>

            {currentUser ? (
              <div style={styles.topUserBox}>
                <div style={styles.topUserMeta}>Signed in</div>
                <div style={styles.topUserName}>
                  {currentUser.displayName} ({currentUser.username})
                </div>
                <button style={styles.secondaryButton} onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>

          {!currentUser ? (
            <section style={styles.loginWrap}>
              <div style={styles.panel}>
                <div style={styles.panelTitle}>Sign in</div>
                <div style={styles.panelDesc}>
                  Sign in to access the page folders assigned to your account.
                </div>

                <form onSubmit={handleLogin} style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Username</label>
                    <input
                      style={styles.input}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Password</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>

                  <button type="submit" style={styles.primaryButton}>
                    Sign in
                  </button>
                </form>

                {authError ? <div style={styles.errorBox}>{authError}</div> : null}
              </div>
            </section>
          ) : (
            <div style={styles.workspace}>
              <div style={styles.contentColumn}>
                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 1</div>
                      <div style={styles.panelTitle}>Upload files</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Drag files here or click to browse. Recommended: one <code>.mp4</code> and one matching <code>.txt</code>.
                  </div>

                  <div
                    style={styles.dropzone}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={styles.dropzoneTitle}>Drop files here or click to browse</div>
                    <div style={styles.dropzoneSub}>
                      Supports video, text, image, and workflow support files
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={onFileChange}
                  />

                  <div style={styles.fileSummary}>
                    {files.length} file(s) selected · {totalSizeMb} MB
                  </div>

                  <div style={styles.fileList}>
                    {files.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} style={styles.fileRow}>
                        <div>
                          <div style={styles.fileName}>{file.name}</div>
                          <div style={styles.fileMeta}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => removeFile(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 2</div>
                      <div style={styles.panelTitle}>Upload settings</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Choose the page destination and prepare metadata for the upload workflow.
                  </div>

                  <div style={styles.formGridTwo}>
                    <div>
                      <label style={styles.label}>Page Name</label>
                      <select
                        style={styles.select}
                        value={pageName}
                        onChange={(e) => setPageName(e.target.value)}
                      >
                        {availablePages.map((page) => (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={styles.label}>Google Drive Folder</label>
                      <select
                        style={styles.select}
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                      >
                        {availableFolders.map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={styles.formStack}>
                    <div>
                      <label style={styles.label}>Title</label>
                      <input
                        style={styles.input}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Video title or campaign title"
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Original URL</label>
                      <input
                        style={styles.input}
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://example.com/article-or-landing-page"
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Notes</label>
                      <textarea
                        style={styles.textarea}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Extra instructions for workflow processing"
                      />
                    </div>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 3</div>
                      <div style={styles.panelTitle}>UTF-8 TXT generator</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Create text content here and download a UTF-8 TXT file for the upload package.
                  </div>

                  <div style={styles.formStack}>
                    <div>
                      <label style={styles.label}>TXT Title</label>
                      <input
                        style={styles.input}
                        value={txtTitle}
                        onChange={(e) => setTxtTitle(e.target.value)}
                        placeholder="Enter TXT title"
                      />
                    </div>

                    <div>
                      <label style={styles.label}>TXT Description</label>
                      <textarea
                        style={styles.textareaLarge}
                        value={txtDescription}
                        onChange={(e) => setTxtDescription(e.target.value)}
                        placeholder="Write the main description here"
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Extra Text</label>
                      <textarea
                        style={styles.textarea}
                        value={txtExtra}
                        onChange={(e) => setTxtExtra(e.target.value)}
                        placeholder="Optional CTA, hashtags, or extra notes"
                      />
                    </div>
                  </div>

                  <div style={styles.previewBox}>
                    <div style={styles.previewTitle}>TXT Preview</div>
                    <pre style={styles.previewContent}>
                      {txtPreview || "Your TXT content preview will appear here."}
                    </pre>
                  </div>

                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.secondaryButton} onClick={downloadTxt}>
                      Download UTF-8 TXT
                    </button>
                  </div>
                </section>
              </div>

              <aside style={styles.actionColumn}>
                <div style={styles.actionStack}>
                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>Operator</div>
                    <div style={styles.operatorName}>{currentUser.displayName}</div>
                    <div style={styles.operatorSub}>Username: {currentUser.username}</div>
                  </section>

                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>OKURL</div>
                    <div style={styles.formStack}>
                      <div>
                        <label style={styles.label}>API Key</label>
                        <input
                          style={styles.input}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="okurl_xxx"
                        />
                      </div>

                      <div style={styles.formGridTwo}>
                        <div>
                          <label style={styles.label}>domain_id</label>
                          <input
                            style={styles.input}
                            value={domainId}
                            onChange={(e) => setDomainId(e.target.value)}
                            placeholder="1"
                          />
                        </div>

                        <div>
                          <label style={styles.label}>project_id</label>
                          <input
                            style={styles.input}
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={styles.label}>Custom slug</label>
                        <input
                          style={styles.input}
                          value={customSlug}
                          onChange={(e) => setCustomSlug(e.target.value)}
                          placeholder="custom-slug"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Short URL</label>
                        <input
                          style={styles.input}
                          value={shortUrl}
                          onChange={(e) => setShortUrl(e.target.value)}
                          placeholder="Generated or manually pasted"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        ...styles.secondaryButton,
                        width: "100%",
                        opacity: creatingShortUrl ? 0.7 : 1,
                        cursor: creatingShortUrl ? "not-allowed" : "pointer",
                      }}
                      onClick={generateShortUrl}
                      disabled={creatingShortUrl}
                    >
                      {creatingShortUrl ? "Generating..." : "Generate Short URL"}
                    </button>
                  </section>

                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>n8n Submission</div>

                    <div>
                      <label style={styles.label}>Webhook URL</label>
                      <input
                        style={styles.input}
                        value={n8nWebhookUrl}
                        onChange={(e) => setN8nWebhookUrl(e.target.value)}
                        placeholder="https://your-n8n-domain/webhook/upload-entry"
                      />
                    </div>

                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
                        marginTop: 14,
                        opacity: submitting ? 0.7 : 1,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                      onClick={submitToN8n}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit to n8n"}
                    </button>

                    {success ? <div style={styles.successBox}>{success}</div> : null}
                    {error ? <div style={styles.errorBox}>{error}</div> : null}
                  </section>

                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>Current summary</div>
                    <div style={styles.summaryRow}>
                      <span>Page</span>
                      <strong>{pageName || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Folder</span>
                      <strong>{folderName || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Files</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Total size</span>
                      <strong>{totalSizeMb} MB</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Short URL</span>
                      <strong style={styles.summaryBreak}>{shortUrl || "Not set"}</strong>
                    </div>
                  </section>

                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>Notes</div>
                    <ul style={styles.miniList}>
                      <li>Uploads go directly to page folders</li>
                      <li>TXT files are downloaded in UTF-8 format</li>
                      <li>OKURL is optional</li>
                      <li>Successful upload clears the working form</li>
                      <li>n8n validates user and page permissions again</li>
                    </ul>
                  </section>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#132238",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "270px minmax(0, 1fr)",
    minHeight: "100vh",
  },
  sidebar: {
    background: "#0f1b2d",
    color: "#eef4ff",
    padding: 24,
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "grid",
    alignContent: "start",
    gap: 18,
  },
  logoBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "#7da2ff",
    boxShadow: "0 0 0 6px rgba(125,162,255,0.18)",
  },
  logoTitle: {
    fontWeight: 800,
    fontSize: 18,
  },
  logoSub: {
    fontSize: 12,
    color: "#94a7c6",
    marginTop: 2,
  },
  navCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 16,
  },
  navSectionTitle: {
    fontSize: 12,
    color: "#8fa4c7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    fontWeight: 700,
  },
  navItem: {
    padding: "10px 12px",
    borderRadius: 12,
    color: "#dbe6fb",
    fontSize: 14,
  },
  navItemActive: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#1d3358",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
  },
  miniList: {
    margin: 0,
    paddingLeft: 18,
    color: "inherit",
    lineHeight: 1.7,
    fontSize: 13,
  },
  mainArea: {
    padding: 28,
    display: "grid",
    alignContent: "start",
    gap: 22,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    background: "#e8efff",
    color: "#3b5ccc",
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 12px",
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    lineHeight: 1.08,
    margin: 0,
    fontWeight: 800,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 0,
    color: "#607086",
    fontSize: 16,
    maxWidth: 760,
    lineHeight: 1.6,
  },
  topUserBox: {
    minWidth: 260,
    background: "#ffffff",
    border: "1px solid #e5eaf4",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 10px 28px rgba(24, 39, 75, 0.06)",
  },
  topUserMeta: {
    fontSize: 12,
    color: "#7d8898",
    marginBottom: 6,
  },
  topUserName: {
    fontWeight: 800,
    fontSize: 20,
    marginBottom: 14,
  },
  loginWrap: {
    maxWidth: 620,
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) 360px",
    gap: 22,
    alignItems: "start",
  },
  contentColumn: {
    display: "grid",
    gap: 22,
  },
  actionColumn: {
    position: "relative",
  },
  actionStack: {
    position: "sticky",
    top: 18,
    display: "grid",
    gap: 16,
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e6ebf3",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 8px 28px rgba(24, 39, 75, 0.05)",
  },
  actionPanel: {
    background: "#ffffff",
    border: "1px solid #e6ebf3",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 8px 28px rgba(24, 39, 75, 0.05)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7a8aa2",
    fontWeight: 700,
    marginBottom: 6,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 14,
  },
  panelDesc: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  operatorName: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 6,
  },
  operatorSub: {
    color: "#6c7a90",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gap: 14,
  },
  formGridTwo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formStack: {
    display: "grid",
    gap: 16,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
    color: "#1d2a3b",
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    resize: "vertical",
    boxSizing: "border-box",
  },
  textareaLarge: {
    width: "100%",
    minHeight: 180,
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    resize: "vertical",
    boxSizing: "border-box",
  },
  primaryButton: {
    border: "none",
    background: "#10233f",
    color: "#fff",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d7dfec",
    background: "#ffffff",
    color: "#1c2a3d",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  dropzone: {
    border: "2px dashed #cfd8e8",
    borderRadius: 20,
    padding: "40px 18px",
    textAlign: "center",
    background: "#f9fbff",
    cursor: "pointer",
  },
  dropzoneTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 10,
  },
  dropzoneSub: {
    color: "#64748b",
    fontSize: 15,
  },
  fileSummary: {
    marginTop: 14,
    color: "#64748b",
    fontSize: 14,
  },
  fileList: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  fileRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    border: "1px solid #e6ebf3",
    borderRadius: 16,
    padding: "14px 16px",
    background: "#ffffff",
  },
  fileName: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 4,
  },
  fileMeta: {
    color: "#6b7789",
    fontSize: 13,
  },
  previewBox: {
    marginTop: 8,
    borderRadius: 18,
    border: "1px solid #e3eaf6",
    background: "#f8fbff",
    overflow: "hidden",
  },
  previewTitle: {
    padding: "12px 14px",
    fontWeight: 800,
    borderBottom: "1px solid #e3eaf6",
    background: "#f1f6ff",
  },
  previewContent: {
    margin: 0,
    padding: 16,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    whiteSpace: "pre-wrap",
    color: "#314255",
    minHeight: 90,
  },
  inlineActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 14,
  },
  successBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: "13px 14px",
    background: "#ebfbf1",
    color: "#177245",
    border: "1px solid #b8e8ca",
    fontWeight: 600,
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: "13px 14px",
    background: "#fff1f1",
    color: "#b12d2d",
    border: "1px solid #f1c7c7",
    fontWeight: 600,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #eef3f9",
    fontSize: 14,
  },
  summaryBreak: {
    textAlign: "right",
    wordBreak: "break-all",
  },
};
