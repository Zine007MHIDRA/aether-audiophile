"use client";

import React, { useState } from "react";
import { X, Lock, Mail, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePlaylistStore } from "@/store/playlist-store";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithEmail, signUpWithEmail } = useAuthStore();
  const { syncVaultWithCloud, fetchPlaylists } = usePlaylistStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (isSignUp) {
      const res = await signUpWithEmail(email, password);
      setLoading(false);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Account created!");
        setTimeout(() => {
          syncVaultWithCloud();
          fetchPlaylists();
        }, 500);
      }
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        syncVaultWithCloud();
        fetchPlaylists();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-aether-surface border border-aether-gold/30 rounded-3xl p-7 shadow-2xl relative flex flex-col gap-6">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-aether-elevated text-aether-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-aether-gold/40 shadow-gold-glow mb-1">
            <img
              src="/branding/aether-logo.jpg"
              alt="Aether"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-aether-gold text-[10px] font-mono tracking-widest uppercase">
            Aether Hi-Fi Sanctuary
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? "Create Your Sanctuary" : "Welcome Back"}
          </h2>
          <p className="text-aether-subdued text-xs leading-relaxed max-w-xs">
            {isSignUp
              ? "Join Aether to sync your personal Vault and playlists across all your devices."
              : "Sign in to access your cloud-synced acoustic library."}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-aether-elevated/80 p-1 rounded-xl border border-aether-border/60">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              !isSignUp
                ? "bg-aether-surface text-aether-gold shadow border border-aether-gold/20 font-semibold"
                : "text-aether-subdued hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              isSignUp
                ? "bg-aether-surface text-aether-gold shadow border border-aether-gold/20 font-semibold"
                : "text-aether-subdued hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="audiophile@domain.com"
                className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-4 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-4 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{isSignUp ? "Register Sanctuary" : "Sign In"}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
