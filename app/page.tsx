// FINAL VERSION V3
// Changes:
// 1. Generate Shorts button shows "Generating" instead of "Checking..."
// 2. TXT Generator title made more prominent
// 3. Upload Files hint updated

"use client";

import { useState } from "react";

export default function Page() {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="p-6 space-y-6">

      {/* Step 3: Shorts Generator */}
      <div>
        <h2 className="text-xl font-semibold">Step 3: Shorts Generator</h2>

        <button
          onClick={() => {
            setIsGenerating(true);
            setTimeout(() => setIsGenerating(false), 2000);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded"
        >
          {isGenerating ? "Generating" : "Generate Shorts"}
        </button>

        {/* TXT Generator */}
        <div className="mt-4 border-2 border-orange-400 rounded p-4 bg-orange-50">
          <h3 className="text-lg font-bold text-orange-700 mb-2">
            TXT Generator
          </h3>

          <textarea
            className="w-full border rounded p-2"
            rows={4}
            placeholder="Edit title and description here"
          />
        </div>
      </div>

      {/* Step 4: Upload Files */}
      <div>
        <h2 className="text-xl font-semibold">Step 4: Upload Files</h2>

        <p className="text-sm text-gray-600 mb-2">
          Upload the video.mp4 and matching video.txt here.
        </p>

        <div className="border rounded p-4">
          <input type="file" multiple />
        </div>
      </div>

    </div>
  );
}
