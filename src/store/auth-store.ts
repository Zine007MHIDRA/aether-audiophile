import { create } from "zustand";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isPasswordRecovery: boolean;

  openAuthModal: () => void;
  closeAuthModal: () => void;
  setIsPasswordRecovery: (isRecovery: boolean) => void;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error?: string; unconfirmed?: boolean }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{
    error?: string;
    message?: string;
    alreadyRegistered?: boolean;
    needsConfirmation?: boolean;
  }>;
  resendConfirmationEmail: (
    email: string
  ) => Promise<{ error?: string; message?: string }>;
  sendPasswordResetEmail: (
    email: string
  ) => Promise<{ error?: string; message?: string }>;
  updatePassword: (
    newPassword: string
  ) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthModalOpen: false,
  isPasswordRecovery: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setIsPasswordRecovery: (isRecovery) => set({ isPasswordRecovery: isRecovery }),
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  initAuth: () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: false });
      return;
    }

    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then((res) => {
          const session = res.data?.session ?? null;
          set({ session, user: session?.user || null, isLoading: false });
          if (session?.user && typeof window !== "undefined") {
            import("@/store/playlist-store").then(({ usePlaylistStore }) => {
              usePlaylistStore.getState().fetchPlaylists();
            });
          }
        })
        .catch(() => {
          set({ isLoading: false });
        });

      supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        set({ session, user: session?.user || null, isLoading: false });
        if (_event === "PASSWORD_RECOVERY") {
          set({ isPasswordRecovery: true, isAuthModalOpen: true });
        }
        if (session?.user && typeof window !== "undefined") {
          import("@/store/playlist-store").then(({ usePlaylistStore }) => {
            usePlaylistStore.getState().fetchPlaylists();
          });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        error:
          "Supabase authentication is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const isBlockedDomain =
      cleanEmail.endsWith("@example.com") || cleanEmail.endsWith("@test.com");
    if (isBlockedDomain) {
      return {
        error:
          "Please use a real email domain (e.g. @gmail.com or @mailinator.com) — Supabase blocks @example.com",
      };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const msg = error.message;
      if (msg.toLowerCase().includes("email not confirmed")) {
        return {
          error:
            "Email not confirmed. Please check your inbox or resend the confirmation link.",
          unconfirmed: true,
        };
      }
      if (
        msg.toLowerCase().includes("rate limit") ||
        (error as any).status === 429
      ) {
        return {
          error:
            "Email rate limit exceeded. Please wait a few minutes or disable email confirmation in your Supabase dashboard.",
        };
      }
      return { error: msg };
    }

    set({
      session: data.session,
      user: data.session?.user || data.user,
      isAuthModalOpen: false,
    });

    if (typeof window !== "undefined") {
      import("@/store/playlist-store").then(({ usePlaylistStore }) => {
        usePlaylistStore.getState().syncVaultWithCloud();
        usePlaylistStore.getState().fetchPlaylists();
      });
    }

    return {};
  },

  signUpWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        error:
          "Supabase authentication is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const isBlockedDomain =
      cleanEmail.endsWith("@example.com") || cleanEmail.endsWith("@test.com");
    if (isBlockedDomain) {
      return {
        error:
          "Please use a real email domain (e.g. @gmail.com or @mailinator.com) — Supabase blocks @example.com",
      };
    }

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const msg = error.message;
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already in use") ||
        msg.toLowerCase().includes("user_already_exists") ||
        (error as any).code === "user_already_exists"
      ) {
        return {
          error:
            "An account with this email already exists. Please switch to Sign In.",
          alreadyRegistered: true,
        };
      }
      if (
        msg.toLowerCase().includes("rate limit") ||
        (error as any).status === 429
      ) {
        return {
          error:
            "Email rate limit exceeded. Please wait a few minutes or disable email confirmation in your Supabase dashboard.",
        };
      }
      return { error: msg };
    }

    // Supabase User Enumeration Protection:
    // If the email is already registered, Supabase returns data.user with empty identities: []
    if (
      data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        error:
          "An account with this email already exists. Please sign in instead.",
        alreadyRegistered: true,
      };
    }

    // If confirmation is disabled in Supabase, a session is immediately issued
    if (data?.session) {
      set({
        session: data.session,
        user: data.session.user || data.user,
        isAuthModalOpen: false,
      });

      if (typeof window !== "undefined") {
        import("@/store/playlist-store").then(({ usePlaylistStore }) => {
          usePlaylistStore.getState().syncVaultWithCloud();
          usePlaylistStore.getState().fetchPlaylists();
        });
      }

      return { message: "Account created and signed in successfully!" };
    }

    // User created, confirmation email sent
    if (data?.user && !data.session) {
      return {
        message: "Confirmation email sent! Please check your inbox.",
        needsConfirmation: true,
      };
    }

    return { message: "Account created successfully." };
  },

  resendConfirmationEmail: async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase authentication is not configured." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const msg = error.message;
      if (
        msg.toLowerCase().includes("rate limit") ||
        (error as any).status === 429
      ) {
        return {
          error:
            "Email rate limit exceeded (Supabase free tier limits confirmation emails to 2 per hour).",
        };
      }
      return { error: msg };
    }

    return { message: "Confirmation email resent! Please check your inbox." };
  },

  sendPasswordResetEmail: async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase authentication is not configured." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const isBlockedDomain =
      cleanEmail.endsWith("@example.com") || cleanEmail.endsWith("@test.com");
    if (isBlockedDomain) {
      return {
        error:
          "Please use a real email domain (e.g. @gmail.com or @mailinator.com) — Supabase blocks @example.com",
      };
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/?reset=true`
        : undefined;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      const msg = error.message;
      if (
        msg.toLowerCase().includes("rate limit") ||
        (error as any).status === 429
      ) {
        return {
          error:
            "Email rate limit exceeded (Supabase limits password reset emails). Please wait a few minutes.",
        };
      }
      return { error: msg };
    }

    return {
      message: "Password reset link sent! Please check your email inbox.",
    };
  },

  updatePassword: async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase authentication is not configured." };
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: "Password must be at least 6 characters long." };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      set({
        user: data.user,
        isPasswordRecovery: false,
      });
    }

    return { message: "Master password successfully updated! Welcome back." };
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) {
      set({ user: null, session: null });
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
