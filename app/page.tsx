"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [projects, setProjects] = useState<any[]>([]);
  const [utms, setUtms] = useState<any[]>([]);

  const [projectId, setProjectId] = useState("");
  const [utmId, setUtmId] = useState("");
  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  const [txt, setTxt] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Load OKURL Projects
  useEffect(() => {
    fetch("/api/okurl-projects")
      .then(res => res.json())
      .then(data => setProjects(data.projects || []));
  }, []);

  // ✅ Load UTM Templates
  useEffect(() => {
    fetch("/api/okurl-utms")
      .then(res => res.json())
      .then(data => setUtms(data.utms || []));
  }, []);

  // ✅ Generate Short URL
  const generateShort = async () => {
    setMsg("");

    if (!longUrl || !projectId || !utmId) {
      setMsg("請填寫完整");
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
      setMsg("✅ Short URL 生成成功");
    } else {
      setMsg(data.error || "❌ 生成失敗");
    }
  };

  // ✅ Copy
  const copy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setMsg("📋 已複製");
  };

  // ✅ TXT Download
  const downloadTxt = () => {
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "content.txt";
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* LEFT SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white p-6">
        <h2 className="text-xl font-bold mb-6">Upload Console</h2>

        <div className="text-sm space-y-3">
          <p>• Generate Short Link</p>
          <p>• Create TXT</p>
          <p>• Upload Files</p>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10 max-w-4xl">

        <h1 className="text-3xl font-bold mb-6">
          Content Upload Dashboard
        </h1>

        {/* ================= OKURL ================= */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">OKURL Generator</h2>

          <input
            placeholder="Original URL"
            value={longUrl}
            onChange={e => setLongUrl(e.target.value)}
            className="w-full border p-2 rounded mb-3"
          />

          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full border p-2 rounded mb-3"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={utmId}
            onChange={e => setUtmId(e.target.value)}
            className="w-full border p-2 rounded mb-4"
          >
            <option value="">Select UTM Template</option>
            {utms.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <button
            onClick={generateShort}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Generating..." : "Generate Short URL"}
          </button>

          {shortUrl && (
            <div className="mt-4 flex gap-2">
              <input
                value={shortUrl}
                readOnly
                className="flex-1 border p-2 rounded"
              />
              <button
                onClick={copy}
                className="bg-gray-800 text-white px-3 rounded"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* ================= TXT ================= */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">TXT Generator</h2>

          <textarea
            value={txt}
            onChange={e => setTxt(e.target.value)}
            placeholder="輸入描述（建議貼 short link）"
            className="w-full border p-3 rounded h-24 mb-3"
          />

          <button
            onClick={downloadTxt}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Download TXT
          </button>
        </div>

        {/* ================= UPLOAD ================= */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Upload Files</h2>

          <input
            type="file"
            multiple
            onChange={e => setFiles(Array.from(e.target.files || []))}
            className="mb-3"
          />

          <div className="text-sm text-gray-600">
            {files.length} files selected
          </div>
        </div>

        {msg && (
          <div className="mt-4 text-sm text-green-600">
            {msg}
          </div>
        )}

      </div>
    </div>
  );
}
