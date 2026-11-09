import React from 'react';
import { ShieldCheck, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { TomatoIcon } from './TomatoIcon';
import { AuthErrorInfo } from '../types';

interface LoginScreenProps {
  isLoading: boolean;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  authError: AuthErrorInfo | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ isLoading, isLoggingIn, onGoogleLogin, authError }) => {
  return (
    <div className="min-h-screen bg-[#F8F9F3] text-[#11310C] font-sans flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-[#11310C]/10 flex items-center justify-center">
            <TomatoIcon className="w-7 h-7" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight">Strato</span>
        </div>

        <div className="bg-white rounded-[28px] border border-[#11310C]/10 shadow-[0_20px_60px_-30px_rgba(17,49,12,0.35)] p-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[#11310C]/70">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-semibold">Carregando…</span>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold leading-tight">
                Entre para ver suas <span className="font-serif italic text-[#A9A72E]">finanças</span>
              </h1>
              <p className="mt-2 text-sm text-[#11310C]/70">
                Seus dados ficam no banco do Strato e só aparecem para a sua conta.
              </p>

              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="mt-6 w-full py-3.5 rounded-2xl bg-[#11310C] text-[#FAFBF6] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1c4a14] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                  </svg>
                )}
                <span>{isLoggingIn ? 'Abrindo o Google…' : 'Entrar com Google'}</span>
              </button>

              {authError && (
                <div className="mt-5 rounded-2xl bg-[#FDECE8] border border-[#E8402A]/20 p-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#B5301E]">
                    <AlertTriangle className="w-4 h-4" />
                    {authError.title}
                  </div>
                  <p className="mt-1.5 text-[#11310C]/80">{authError.solution}</p>
                  {authError.helpUrl && (
                    <a
                      href={authError.helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-bold text-[#11310C] underline"
                    >
                      Abrir configuração <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center gap-2 text-[11px] text-[#11310C]/60">
                <ShieldCheck className="w-4 h-4 text-[#A9A72E]" />
                Acesso protegido por conta Google
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
