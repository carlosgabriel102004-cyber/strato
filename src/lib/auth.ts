import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthErrorInfo, UserProfile } from '../types';

export function toUserProfile(user: User): UserProfile {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : null),
    photoURL: meta.avatar_url || meta.picture || null,
  };
}

/** Subscribes to auth changes. Calls onReady once with the current user (or null). */
export function initAuth(onChange: (user: UserProfile | null) => void): () => void {
  let lastUserId: string | null | undefined;
  const emit = (user: User | null) => {
    const id = user?.id ?? null;
    if (id === lastUserId) return;
    lastUserId = id;
    onChange(user ? toUserProfile(user) : null);
  };

  supabase.auth.getSession().then(({ data }) => emit(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => emit(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

/** Redirects to Google. The page comes back signed in. */
export async function googleSignIn(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export function parseAuthError(error: any): AuthErrorInfo {
  const message: string = error?.message || String(error || '');
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

  if (/provider is not enabled|Unsupported provider/i.test(message)) {
    return {
      code: 'provider-disabled',
      title: 'Login com Google ainda não está ativado',
      message,
      solution: 'Ative o provedor Google em Supabase → Authentication → Sign In / Providers e informe o Client ID e o Client Secret do Google Cloud.',
      helpUrl: 'https://supabase.com/dashboard/project/ltmgmdbxgpyxcgpymdck/auth/providers',
    };
  }

  if (/redirect/i.test(message)) {
    return {
      code: 'redirect-not-allowed',
      title: 'Endereço não autorizado',
      message,
      solution: `Adicione ${currentDomain} em Supabase → Authentication → URL Configuration → Redirect URLs.`,
      helpUrl: 'https://supabase.com/dashboard/project/ltmgmdbxgpyxcgpymdck/auth/url-configuration',
      isDomainError: true,
      currentDomain,
    };
  }

  return {
    code: 'auth-error',
    title: 'Não foi possível entrar',
    message,
    solution: 'Tente novamente. Se continuar, confira a configuração do login Google no Supabase.',
  };
}
