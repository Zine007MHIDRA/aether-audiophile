import { create } from "zustand";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;

  openAuthModal: () => void;
  closeAuthModal: () => void;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthModalOpen: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  initAuth: () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: false });
      return;
    }

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        set({ session, user: session?.user || null, isLoading: false });
      }).catch(() => {
        set({ isLoading: false });
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user || null, isLoading: false });
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase authentication is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment." };
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }
    set({ isAuthModalOpen: false });
    return {};
  },

  signUpWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase authentication is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment." };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }
    if (data?.session) {
      set({ isAuthModalOpen: false });
      return { message: "Account created successfully!" };
    }
    return { message: "Check your email inbox to confirm your account." };
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
