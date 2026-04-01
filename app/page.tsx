"use client";

import React, { useEffect, useState } from "react";

type Project = {
  id: number;
  name: string;
};

type UTM = {
  id: number;
  name: string;
};

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [utms, setUtms] = useState<UTM[]>([]);

  const [projectId, setProjectId] = useState("");
  const [utmId, setUtmId] = useState("");

  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  const [txt, setTxt] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // load projects
  useEffect(() => {
    fetch("/api/okurl-projects")
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
      });
  }, []);

  // load utm templates
  useEffect(() => {
    fetch("/api/okurl-utms")
      .then(res => res.json())
      .then(data => {
        setUtms(data.utms || []);
      });
  }, []);

  const generate = async () => {
    setMsg("");

    if (!longUrl || !projectId || !utmId) {
      setMsg("Please fill all fields");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/okurl-create", {
      method: "POST",
      body: JSON.stringify({
        url: longUrl,
        project_id: Number(projectId),
        utm_template_id: Number(utmId)
      })
    });

    const data = await res.json();

    setLoading(false);

    if (data.short_url) {
      setShortUrl(data.short_url);
      setMsg("Generated");
    } else {
      setMsg(data.error || "Error");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setMsg("Copied");
  };

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h2>OKURL Generator</h2>

      <div>
        <label>Original URL</label>
        <input
          value={longUrl}
          onChange={e => setLongUrl(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />
      </div>

      <div>
        <label>Project</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        >
          <option value="">Select</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>UTM Template</label>
        <select
          value={utmId}
          onChange={e => setUtmId(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        >
          <option value="">Select</option>
          {utms.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <button onClick={generate} disabled={loading}>
        {loading ? "Generating..." : "Generate Short URL"}
      </button>

      {shortUrl && (
        <div style={{ marginTop: 12 }}>
          <input value={shortUrl} readOnly style={{ width: "80%" }} />
          <button onClick={copy}>Copy</button>
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h3>TXT Generator</h3>

      <textarea
        value={txt}
        onChange={e => setTxt(e.target.value)}
        style={{
          width: "100%",
          height: 80,   // ✅ 縮小（約3行）
        }}
      />

      {msg && <p>{msg}</p>}
    </div>
  );
}
