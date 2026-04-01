import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ucreator Console",
  description: "Social publishing console for shorts, uploads, and automation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
