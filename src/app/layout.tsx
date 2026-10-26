import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { PlayerBar } from "@/components/PlayerBar";
import { LyricsModal } from "@/components/LyricsModal";
import { AuthModal } from "@/components/AuthModal";
import { CreatePlaylistModal } from "@/components/CreatePlaylistModal";
import { AuthInitializer } from "@/components/AuthInitializer";
import { TrackContextMenu } from "@/components/TrackContextMenu";
import { QueueDrawer } from "@/components/QueueDrawer";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { AudioVisualizerModal } from "@/components/AudioVisualizerModal";
import { AudioEqualizerModal } from "@/components/AudioEqualizerModal";

export const metadata: Metadata = {
  title: "Aether — Audiophile Music",
  description: "Minimalist, zero-storage high-fidelity music player with cloud sync",
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
        {/* Mobile Navigation Header (< md) */}
        <MobileNav />

        {/* Main Application Area (Sidebar + Canvas) */}
        <div className="flex-1 flex overflow-hidden p-2 md:p-3 gap-3">
          <Sidebar />
          <main className="flex-1 bg-gradient-to-b from-aether-dark via-aether-black to-black rounded-xl md:rounded-2xl border border-aether-border/40 overflow-y-auto relative flex flex-col shadow-2xl pb-36">
            {children}
            {/* Bottom spacer for floating dynamic island */}
            <div className="h-36 shrink-0" />
          </main>
        </div>

        {/* Floating Dynamic Island Luxury Player Bar */}
        <PlayerBar />

        {/* Session Initializer */}
        <AuthInitializer />

        {/* Modals & Overlays */}
        <LyricsModal />
        <AuthModal />
        <CreatePlaylistModal />
        <TrackContextMenu />
        <QueueDrawer />
        <KeyboardShortcutsModal />
        <AudioVisualizerModal />
        <AudioEqualizerModal />
      </body>
    </html>
  );
}
