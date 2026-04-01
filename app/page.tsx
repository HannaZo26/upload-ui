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

const OKURL_PROJECT_MAP: Record<string, number> = {
  clearviewdaily: 33,
  dailytrendpulse: 36,
  flashbrieftoday: 37,
  horizonupdatesshow: 34,
  viewscopedaily: 35,

  tastefulworld: 12,
  feelgoodbeauty: 7,
  worldtravelers: 8,

  tastefulworldzh: 2,
  feelgoodbeautyzh: 3,
  worldtravelerszh: 4,

  healthyliving: 6,
  healthylivingzh: 1,

  culturalwander: 5,
  gjwmysteries: 24,

  exclusivevisiondaily: 20,
  freshpickstoday: 21,
  dailytalktime: 22,
  beyondheadlinesdaily: 19,

  everydayvitalityzh: 42,
  healthyrhythmdaily: 41,
  renaradar: 38,
  renaradarzh: 40,
  lukeinsights: 39,
  heresthequestion: 43,
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

  const n8nWebhookUrl =
    "https://n8n.influencerconnectagency.biz/webhook/upload-entry";

  const [folderName, setFolderName] = useState("clearviewdaily");
  const [pageName, setPageName] = useState("clearviewdaily");

  const [txtDescription, setTxtDescription] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [shortUrlError, setShortUrlError] = useState("");
  const [shortUrlSuccess, setShortUrlSuccess] = useState("");

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

  const currentProjectId = useMemo(() => {
    return OKURL_PROJECT_MAP[pageName] ?? null;
  }, [pageName]);

  const resetUploadForm = () => {
    setFiles([]);
    setTxtDescription("");
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setShortUrlError("");
    setShortUrlSuccess("");

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
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setTxtDescription("");
    setShortUrlError("");
    setShortUrlSuccess("");
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
    if (!txtDescription.trim()) {
      setError("Please enter TXT content before downloading.");
      setSuccess("");
      return;
    }

    const blob = new Blob(["\uFEFF" + txtDescription.trim()], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const fileName =
      pageName + "_" + yyyy + mm + dd + "_" + hh + mi + ss + ".txt";

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setSuccess("UTF-8 TXT downloaded successfully.");
    setError("");
  };

  const generateShortUrl = async () => {
    setShortUrlError("");
    setShortUrlSuccess("");

    if (!longUrl.trim()) {
      setShortUrlError("Please enter the original URL first.");
      return;
    }

    if (!currentProjectId) {
      setShortUrlError("No OKURL project is mapped for this page.");
      return;
    }

    try {
      setCreatingShortUrl(true);

      const res = await fetch("/api/okurl-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: longUrl.trim(),
          project_id: currentProjectId,
          slug: customSlug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to generate short URL.");
      }

      const generatedShortUrl =
        data?.short_url ||
        data?.shortUrl ||
        data?.data?.short_url ||
        data?.data?.shortUrl ||
        data?.url ||
        "";

      if (!generatedShortUrl) {
        throw new Error("Short URL was not returned.");
      }

      setShortUrl(generatedShortUrl);
      setShortUrlSuccess("Short URL generated successfully.");
    } catch (err: any) {
      setShortUrlError(err?.message || "Failed to generate short URL.");
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const copyShortUrl = async () => {
    if (!shortUrl.trim()) {
      setShortUrlError("No short URL to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shortUrl);
      setShortUrlSuccess("Short URL copied.");
      setShortUrlError("");
    } catch {
      setShortUrlError("Copy failed.");
    }
  };

  const submitToN8n = async () => {
    setSuccess("");
    setError("");

    if (!currentUser) {
      setError("Please sign in first.");
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
      formData.append("title", "");
      formData.append("target_url", "");
      formData.append("notes", "");
      formData.append("short_url", shortUrl);
      formData.append("okurl_slug", customSlug);

      files.forEach((file, idx) => {
        formData.append("file_" + String(idx + 1), file, file.name);
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
        throw new Error(
          data?.error ||
            data?.message ||
            "Upload failed (" + String(res.status) + ")"
        );
      }

      resetUploadForm();
      setSuccess(
        data?.message || "Submitted to n8n successfully. Form has been cleared."
      );
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
          <div>
            <div style={styles.logoBox}>
              <div style={styles.logoDot} />
              <div>
                <div style={styles.logoTitle}>Upload Console</div>
                <div style={styles.logoSub}>Drive + OKURL + n8n</div>
              </div>
            </div>

            {currentUser ? (
              <>
                <div style={styles.sidebarInfoCard}>
                  <div style={styles.sidebarInfoTitle}>Operator</div>
                  <div style={styles.sidebarInfoName}>{currentUser.displayName}</div>
                  <div style={styles.sidebarInfoSub}>
                    Username: {currentUser.username}
                  </div>
                </div>

                <div style={styles.sidebarInfoCard}>
                  <div style={styles.sidebarInfoTitle}>Signed in</div>
                  <div style={styles.sidebarInfoName}>
                    {currentUser.displayName} ({currentUser.username})
                  </div>
                  <button
                    style={{ ...styles.secondaryButton, width: "100%", marginTop: 12 }}
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : null}
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
              <li>Enter original URL first</li>
              <li>Choose page destination</li>
              <li>Generate short link if needed</li>
              <li>Create and download TXT</li>
              <li>Upload mp4 + txt together</li>
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
                Enter the original URL, generate a short link for the selected page,
                then prepare TXT content and upload the video and matching TXT file together.
              </p>
            </div>
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
                      <div style={styles.panelTitle}>Upload settings</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Choose the page destination first. The OKURL project will be detected automatically from the selected page.
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
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 2</div>
                      <div style={styles.panelTitle}>TXT generator</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Write the TXT content, then download it before uploading.
                  </div>

                  <div style={styles.formStack}>
                    <div>
                      <label style={styles.label}>TXT Description</label>
                      <textarea
                        style={styles.textareaLarge}
                        value={txtDescription}
                        onChange={(e) => setTxtDescription(e.target.value)}
                        placeholder="Write the TXT content here"
                      />
                    </div>
                  </div>

                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.secondaryButton} onClick={downloadTxt}>
                      Download UTF-8 TXT
                    </button>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 3</div>
                      <div style={styles.panelTitle}>Upload files</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    After downloading the TXT file, upload the video and the matching TXT file together.
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
                      Recommended: one .mp4 and one matching .txt
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
                      <div key={file.name + "-" + String(idx)} style={styles.fileRow}>
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
              </div>

              <aside style={styles.actionColumn}>
                <div style={styles.actionStack}>
                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>OKURL</div>

                    <div style={styles.formStack}>
                      <div>
                        <label style={styles.label}>Original URL</label>
                        <input
                          style={styles.input}
                          value={longUrl}
                          onChange={(e) => setLongUrl(e.target.value)}
                          placeholder="Paste the long URL here"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Detected project_id</label>
                        <input
                          style={styles.inputReadonly}
                          value={currentProjectId ? String(currentProjectId) : ""}
                          readOnly
                          placeholder="No mapping found"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Custom slug (optional)</label>
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
                          style={styles.inputReadonly}
                          value={shortUrl}
                          readOnly
                          placeholder="Generated short link"
                        />
                      </div>
                    </div>

                    <div style={styles.inlineActions}>
                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          opacity: creatingShortUrl ? 0.7 : 1,
                          cursor: creatingShortUrl ? "not-allowed" : "pointer",
                        }}
                        onClick={generateShortUrl}
                        disabled={creatingShortUrl}
                      >
                        {creatingShortUrl ? "Generating..." : "Generate Short URL"}
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={copyShortUrl}
                      >
                        Copy
                      </button>
                    </div>

                    {shortUrlSuccess ? (
                      <div style={styles.successBox}>{shortUrlSuccess}</div>
                    ) : null}

                    {shortUrlError ? (
                      <div style={styles.errorBox}>{shortUrlError}</div>
                    ) : null}
                  </section>

                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>n8n Submission</div>
                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
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
                      <span>project_id</span>
                      <strong>{currentProjectId ?? "-"}</strong>
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
                      <li>Enter original URL first</li>
                      <li>Choose page to auto-map project_id</li>
                      <li>Generate and copy short URL if needed</li>
                      <li>Paste short URL into TXT manually</li>
                      <li>Download TXT and upload mp4 + txt together</li>
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
    marginBottom: 18,
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
  sidebarInfoCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sidebarInfoTitle: {
    fontSize: 12,
    color: "#8fa4c7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: 700,
  },
  sidebarInfoName: {
    fontWeight: 800,
    fontSize: 18,
    color: "#ffffff",
    lineHeight: 1.3,
  },
  sidebarInfoSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#c1d2ef",
    lineHeight: 1.5,
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
  inputReadonly: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#f3f6fb",
    color: "#4b5b72",
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
  textareaLarge: {
    width: "100%",
    minHeight: 220,
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
