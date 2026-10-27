"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  Mail,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePlaylistStore } from "@/store/playlist-store";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    openAuthModal,
    signInWithEmail,
    signUpWithEmail,
    resendConfirmationEmail,
    sendPasswordResetEmail,
    updatePassword,
    isPasswordRecovery,
    setIsPasswordRecovery,
  } = useAuthStore();
  const { syncVaultWithCloud, fetchPlaylists } = usePlaylistStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [unconfirmedInSignIn, setUnconfirmedInSignIn] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dedicated Confirmation Pending Screen
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ error?: string; message?: string } | null>(null);

  // Forgot Password Screen
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Recovery Password Screen
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Catch URL ?reset=true on mount (when coming from email password reset link)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "true") {
        setIsPasswordRecovery(true);
        openAuthModal();
        // Remove ?reset=true without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [setIsPasswordRecovery, openAuthModal]);

  if (!isAuthModalOpen) return null;

  const cleanEmail = email.trim().toLowerCase();
  const isFakeDomain =
    cleanEmail.endsWith("@example.com") || cleanEmail.endsWith("@test.com");

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsAlreadyRegistered(false);
    setUnconfirmedInSignIn(false);
    setResendStatus(null);
  };

  const handleClose = () => {
    closeAuthModal();
    resetMessages();
    setIsConfirmationPending(false);
    setIsForgotPassword(false);
    setIsPasswordRecovery(false);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (isFakeDomain) {
      setErrorMsg(
        "Please use a real email domain (e.g. @gmail.com or @mailinator.com) — Supabase blocks @example.com"
      );
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const res = await signUpWithEmail(email, password);
      setLoading(false);

      if (res.alreadyRegistered) {
        setIsAlreadyRegistered(true);
        setErrorMsg(res.error || "An account with this email already exists.");
        return;
      }

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      if (res.needsConfirmation) {
        setUnconfirmedEmail(cleanEmail);
        setIsConfirmationPending(true);
        return;
      }

      setSuccessMsg(res.message || "Account created successfully!");
      setTimeout(() => {
        syncVaultWithCloud();
        fetchPlaylists();
        handleClose();
      }, 700);
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);

      if (res.unconfirmed) {
        setUnconfirmedInSignIn(true);
        setErrorMsg(res.error || "Email not confirmed.");
        return;
      }

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg("Signed in successfully!");
      setTimeout(() => {
        syncVaultWithCloud();
        fetchPlaylists();
        handleClose();
      }, 500);
    }
  };

  const handleResendConfirmation = async (targetEmail: string) => {
    setResending(true);
    setResendStatus(null);
    const res = await resendConfirmationEmail(targetEmail);
    setResending(false);
    setResendStatus(res);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const target = forgotEmail.trim() || email.trim();
    if (!target) return;

    setLoading(true);
    const res = await sendPasswordResetEmail(target);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(res.message || "Password reset link sent! Please check your email.");
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    const res = await updatePassword(newPassword);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(res.message || "Master password successfully updated!");
      setTimeout(() => {
        setIsPasswordRecovery(false);
        handleClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-aether-surface border border-aether-gold/30 rounded-3xl p-7 shadow-2xl relative flex flex-col gap-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-aether-elevated text-aether-muted hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ================================================================= */}
        {/* VIEW 1: RECOVERY / SET NEW PASSWORD SCREEN                       */}
        {/* ================================================================= */}
        {isPasswordRecovery ? (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-aether-elevated border border-aether-gold/40 shadow-gold-glow flex items-center justify-center text-aether-gold">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <span className="text-aether-gold text-[10px] font-mono tracking-widest uppercase">
                Aether Master Key
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Set New Master Password
              </h2>
              <p className="text-aether-subdued text-xs leading-relaxed max-w-xs mt-1">
                Enter your new master password to secure your sanctuary library.
              </p>
            </div>

            {errorMsg && (
              <div className="w-full flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="w-full flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePasswordSubmit} className="w-full flex flex-col gap-4 mt-1">
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
                    placeholder="Enter at least 6 characters"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-10 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aether-muted hover:text-white transition"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                  Confirm Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="Confirm password"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-10 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aether-muted hover:text-white transition"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmNewPassword}
                className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
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
        ) : isConfirmationPending ? (
          /* ================================================================= */
          /* VIEW 2: CONFIRMATION PENDING SCREEN                               */
          /* ================================================================= */
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-aether-elevated border border-aether-gold/40 shadow-gold-glow flex items-center justify-center text-aether-gold">
              <Mail className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <span className="text-aether-gold text-[10px] font-mono tracking-widest uppercase">
                Aether Sanctuary Verification
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Confirm Your Sanctuary
              </h2>
              <p className="text-aether-subdued text-xs leading-relaxed max-w-xs mt-1">
                A verification link has been dispatched to:
              </p>
              <div className="mt-2 px-3.5 py-1.5 rounded-xl bg-aether-dark border border-aether-gold/30 text-aether-gold font-mono text-xs font-semibold shadow-inner break-all">
                {unconfirmedEmail}
              </div>
            </div>

            {/* Resend Status Alerts */}
            {resendStatus?.error && (
              <div className="w-full flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resendStatus.error}</span>
              </div>
            )}
            {resendStatus?.message && (
              <div className="w-full flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resendStatus.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => handleResendConfirmation(unconfirmedEmail)}
                disabled={resending}
                className="w-full py-3 px-4 rounded-xl bg-aether-elevated hover:bg-aether-elevated/80 border border-aether-gold/30 hover:border-aether-gold text-aether-gold text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>{resending ? "Dispatching Email..." : "Resend Confirmation Email"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsConfirmationPending(false);
                  setIsSignUp(false);
                  resetMessages();
                }}
                className="w-full py-2.5 text-xs text-aether-subdued hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <span>Already confirmed? Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Helpful Supabase Rate Limit Notice */}
            <div className="w-full mt-2 p-3 rounded-xl bg-aether-dark/80 border border-aether-border/60 text-[11px] text-aether-muted flex items-start gap-2 text-left leading-relaxed">
              <Info className="w-4 h-4 text-aether-gold shrink-0 mt-0.5" />
              <div>
                <span className="text-aether-subdued font-semibold">Free Tier Notice:</span> Supabase free tier limits confirmation emails to 2 per hour. If you don&apos;t receive an email, you can disable &ldquo;Confirm email&rdquo; in Supabase Auth Settings &rarr; Providers &rarr; Email for instant logins.
              </div>
            </div>
          </div>
        ) : isForgotPassword ? (
          /* ================================================================= */
          /* VIEW 3: FORGOT PASSWORD / REQUEST RESET SCREEN                    */
          /* ================================================================= */
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-aether-elevated border border-aether-gold/40 shadow-gold-glow flex items-center justify-center text-aether-gold">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <span className="text-aether-gold text-[10px] font-mono tracking-widest uppercase">
                Aether Security
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Reset Sanctuary Access
              </h2>
              <p className="text-aether-subdued text-xs leading-relaxed max-w-xs mt-1">
                Enter your registered email address to receive an instant recovery link.
              </p>
            </div>

            {errorMsg && (
              <div className="w-full flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="w-full flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="w-full flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="audiophile@domain.com"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-4 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !forgotEmail.trim()}
                className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Dispatching Recovery Link...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-black" />
                    <span>Send Recovery Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  resetMessages();
                }}
                className="w-full py-2.5 text-xs text-aether-subdued hover:text-white transition flex items-center justify-center gap-1.5 mt-1"
              >
                <span>Remember your password? Back to Sign In</span>
              </button>
            </form>
          </div>
        ) : (
          /* ================================================================= */
          /* VIEW 4: MAIN SIGN IN / SIGN UP FORM                               */
          /* ================================================================= */
          <>
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
                  resetMessages();
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
                  resetMessages();
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
              <div className="flex flex-col gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>

                {/* Account Already Exists Prompt */}
                {isAlreadyRegistered && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      resetMessages();
                    }}
                    className="self-start text-[11px] text-aether-gold underline hover:text-white font-medium pl-6 transition"
                  >
                    Switch to Sign In &rarr;
                  </button>
                )}

                {/* Email Not Confirmed Prompt */}
                {unconfirmedInSignIn && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnconfirmedEmail(cleanEmail);
                      setIsConfirmationPending(true);
                    }}
                    className="self-start text-[11px] text-aether-gold underline hover:text-white font-medium pl-6 transition"
                  >
                    Resend confirmation link &rarr;
                  </button>
                )}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="audiophile@domain.com"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-4 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                </div>

                {/* Inline Fake Domain Validation Hint */}
                {isFakeDomain && (
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] px-1 pt-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Please use a real email domain (e.g. @gmail.com or @mailinator.com) — Supabase blocks @example.com
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(email);
                        resetMessages();
                      }}
                      className="text-[10px] font-mono text-aether-gold hover:underline transition pr-1"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-aether-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="••••••••••••"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-10 pr-10 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aether-muted hover:text-white transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isFakeDomain}
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
          </>
        )}
      </div>
    </div>
  );
}
