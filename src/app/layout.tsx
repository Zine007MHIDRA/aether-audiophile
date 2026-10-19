import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { LyricsModal } from "@/components/LyricsModal";

export const metadata: Metadata = {
  title: "Aether — Audiophile Music",
  description: "Minimalist, zero-storage high-fidelity music player",
  applicationName: "Aether",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aether",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#060709",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen flex flex-col bg-aether-black text-aether-text overflow-hidden antialiased">
        {/* Main Application Area (Sidebar + Canvas) */}
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          <Sidebar />
          <main className="flex-1 bg-gradient-to-b from-aether-dark via-aether-black to-black rounded-2xl border border-aether-border/40 overflow-y-auto relative flex flex-col shadow-2xl">
            {children}
            {/* Bottom spacer so floating island player doesn't occlude bottom content */}
            <div className="h-28 shrink-0" />
          </main>
        </div>

        {/* Floating Dynamic Island Luxury Player Bar */}
        <PlayerBar />

        {/* Fullscreen Synced Lyrics */}
        <LyricsModal />
      </body>
    </html>
  );
}
