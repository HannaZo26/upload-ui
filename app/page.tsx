// app/page.tsx
// ✅ Version: removed Video Title under Copy area (clean UI)

"use client";

import { useState } from "react";

export default function Page() {
  const [shortUrl, setShortUrl] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setShortUrl("https://gjw.us/s/example");
    setGenerated(true);
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
  };

  return (
    <main style={{ padding: 24 }}>
      {/* Generate */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleGenerate}
          style={{
            background: "#f97316",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 12,
            fontWeight: 600,
          }}
        >
          Generate Short URL
        </button>

        {generated && (
          <span style={{ color: "#16a34a", fontWeight: 600 }}>
            Generated
          </span>
        )}
      </div>

      {/* Short URL */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Short URL</div>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={shortUrl}
            readOnly
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
            }}
          />

          <button
            onClick={handleCopy}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #f97316",
              color: "#f97316",
              fontWeight: 600,
            }}
          >
            Copy
          </button>
        </div>

        {/* ✅ 已移除 Video Title 顯示 */}
      </div>
    </main>
  );
}
