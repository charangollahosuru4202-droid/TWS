import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
  clearError: () => void;
}

const DEMO_USER_STORAGE_KEY = 'taskflow_active_session_user';

// Map raw Supabase errors into human-readable messages
export function formatAuthError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Wrong password or email. Please check your credentials and try again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists') || lower.includes('email address has already been taken')) {
    return 'This email is already in use. Please sign in instead.';
  }
  if (lower.includes('password should be at least 6 characters') || lower.includes('weak password') || lower.includes('password is too short')) {
    return 'Weak password: Password must be at least 6 characters long.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address via the link sent to your inbox.';
  }
  if (lower.includes('rate limit')) {
    return 'Too many login attempts. Please wait a minute and try again.';
  }
  return rawMessage;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (isSupabaseConfigured) {
      // 1. Initial Session Retrieval
      supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) {
          setError(formatAuthError(sessionError.message));
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }).catch((err) => {
        if (!mounted) return;
        setError(formatAuthError(err.message || 'Failed to initialize session'));
        setLoading(false);
      });

      // 2. Real-time Session Tracker
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Local development fallback session (if previously logged in)
      try {
        const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setSession({ user: parsed } as unknown as Session);
        } else {
          // Explicitly null - start on login page
          setUser(null);
          setSession(null);
        }
      } catch {
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }

      return () => {
        mounted = false;
      };
    }
  }, []);

  // Sign In with email & password
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      const err = new Error('Please enter both email and password.');
      setError(err.message);
      return { error: err };
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const friendlyMsg = formatAuthError(error.message);
        setError(friendlyMsg);
        return { error: new Error(friendlyMsg) };
      }

      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } else {
      // Local session
      const mockUser = {
        id: `local-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-uuid`,
        email: cleanEmail,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: cleanEmail.split('@')[0] },
      } as unknown as User;

      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      setSession({ user: mockUser } as unknown as Session);
      return { error: null };
    }
  }, []);

  // Sign Up with email & password
  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null; isNewUser?: boolean }> => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      const err = new Error('Please enter both email and password.');
      setError(err.message);
      return { error: err };
    }
    if (password.length < 6) {
      const err = new Error('Weak password: Password must be at least 6 characters long.');
      setError(err.message);
      return { error: err };
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        const friendlyMsg = formatAuthError(error.message);
        setError(friendlyMsg);
        return { error: new Error(friendlyMsg) };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
      }
      return { error: null, isNewUser: true };
    } else {
      // Local session
      const mockUser = {
        id: `local-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-uuid`,
        email: cleanEmail,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: cleanEmail.split('@')[0] },
      } as unknown as User;

      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      setSession({ user: mockUser } as unknown as Session);
      return { error: null, isNewUser: true };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    setError(null);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(formatAuthError(error.message));
        return { error };
      }
      setUser(null);
      setSession(null);
      return { error: null };
    } else {
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      setUser(null);
      setSession(null);
      return { error: null };
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    session,
    loading,
    error,
    isDemoMode: !isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}
