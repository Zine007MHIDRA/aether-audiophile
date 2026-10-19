import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { LyricsModal } from "@/components/LyricsModal";

export const metadata: Metadata = {
  title: "Spotify - Web Player",
  description: "Personal zero-storage music streaming player",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden">
        {/* Main Application Area (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden p-2 gap-2">
          <Sidebar />
          <main className="flex-1 bg-spotify-dark rounded-lg overflow-y-auto relative flex flex-col">
            {children}
          </main>
        </div>

        {/* Persistent Bottom Audio Player */}
        <PlayerBar />

        {/* Synced Lyrics Fullscreen Overlay */}
        <LyricsModal />
      </body>
    </html>
  );
}
