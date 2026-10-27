"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePlaylistStore } from "@/store/playlist-store";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function AccountSecurityModal() {
  const {
    user,
    isSecurityModalOpen,
    closeSecurityModal,
    updatePassword,
    signOut,
  } = useAuthStore();
  const { syncVaultWithCloud, fetchPlaylists } = usePlaylistStore();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  if (!isSecurityModalOpen || !user) return null;

  const handleClose = () => {
    closeSecurityModal();
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setSuccessMsg("");
    setSyncSuccess(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    const res = await updatePassword(newPassword);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(res.message || "Master password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setSuccessMsg("");
      }, 4000);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await syncVaultWithCloud();
      await fetchPlaylists();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-aether-surface border border-aether-gold/30 rounded-3xl p-7 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-aether-elevated text-aether-muted hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-aether-elevated border border-aether-gold/40 shadow-gold-glow flex items-center justify-center text-aether-gold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-aether-gold text-[10px] font-mono tracking-widest uppercase">
              Sanctuary Security Center
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Account Security & Master Key
            </h2>
          </div>
        </div>

        {/* Identity & Status Card */}
        <div className="p-4 rounded-2xl bg-aether-dark/90 border border-aether-border/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-aether-gold" />
              <span className="text-xs font-semibold text-white truncate max-w-[220px]">
                {user.email}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-2.5 h-2.5" />
              Sanctuary Verified
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-aether-border/40 text-[11px] font-mono">
            <div>
              <span className="text-aether-muted text-[10px] block">Auth Method</span>
              <span className="text-aether-subdued">Supabase SSR Master Session</span>
            </div>
            <div>
              <span className="text-aether-muted text-[10px] block">Cloud Vault</span>
              <span className="text-emerald-400">Synchronized & Active</span>
            </div>
          </div>
        </div>

        {/* Change Master Password Form */}
        <div className="p-4 rounded-2xl bg-aether-dark/90 border border-aether-border/60 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider">
            <KeyRound className="w-4 h-4 text-aether-gold" />
            <span>Update Master Password</span>
          </div>
          <p className="text-[11px] text-aether-muted leading-relaxed">
            Ensure your sanctuary master key meets high-entropy audiophile cryptographic standards.
          </p>

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

          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                New Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter new master password"
                  className="w-full bg-aether-elevated border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-10 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aether-muted hover:text-white transition"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Password Entropy Meter */}
              {newPassword && <PasswordStrengthMeter password={newPassword} />}
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Repeat new master password"
                  className="w-full bg-aether-elevated border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-10 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aether-muted hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="flex items-center justify-center gap-2 w-full mt-1 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-gold-glow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Securing Master Password...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Update Master Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cloud Session & Sign Out Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleForceSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-aether-dark border border-aether-border/60 hover:border-aether-gold/40 text-aether-subdued hover:text-white text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-aether-gold" : ""}`} />
            <span>{syncSuccess ? "Vault Synced!" : "Sync Vault Now"}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              handleClose();
              await signOut();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 text-rose-300 hover:text-rose-100 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Sanctuary</span>
          </button>
        </div>
      </div>
    </div>
  );
}
