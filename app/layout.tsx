import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Portal",
  description: "Upload to Google Drive + OKURL + n8n",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
