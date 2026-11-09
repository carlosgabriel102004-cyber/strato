import React, { useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Lock,
  Percent,
  Receipt,
  Check,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertTriangle,
  X,
  UserCheck,
} from 'lucide-react';
import { SpreadsheetConnection, Transaction, TaxSettings, AuthErrorInfo, UserProfile } from '../types';
import { PlanilhasView } from './PlanilhasView';

interface ConfiguracoesViewProps {
  googleUser: UserProfile | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  spreadsheets: SpreadsheetConnection[];
  onAddSpreadsheet: (sheet: SpreadsheetConnection) => void;
  onImportCsvTransactions: (newTransactions: Transaction[]) => void;
  onRefreshSheets: () => void;
  taxSettings: TaxSettings;
  onUpdateTaxSettings: (newSettings: TaxSettings) => void;
  authError?: AuthErrorInfo | null;
  onClearAuthError?: () => void;
  onDirectCarlosLogin?: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  googleUser,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
  spreadsheets,
  onAddSpreadsheet,
  onImportCsvTransactions,
  onRefreshSheets,
  taxSettings,
  onUpdateTaxSettings,
  authError,
  onClearAuthError,
  onDirectCarlosLogin,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);
  const isInIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  const handleSync = () => {
    setIsSyncing(true);
    onRefreshSheets();
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleCopyDomain = (domain: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(domain);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2500);
    }
  };

  const handleOpenNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
            Configurações do <span className="italic font-medium text-[#11310C]/70">Sistema</span>
          </h1>
          <p className="text-xs text-[#11310C]/60 mt-1">
            Gerencie integrações, planilhas e preferências de impostos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 text-xs font-bold bg-[#11310C] text-[#FAFBF6] hover:bg-[#1A4713] px-4 py-2.5 rounded-2xl cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#C4C240] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Testar & Sincronizar Agora'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold bg-[#11310C]/08 text-[#11310C] px-4 py-2.5 rounded-2xl">
            <Lock className="w-4 h-4 text-emerald-700" />
            <span>Criptografia de Ponta a Ponta</span>
          </div>
        </div>
      </div>

      {/* Tax & Fees Configuration Section - White Glass Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#11310C] text-[#C4C240] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#11310C]">
                Configuração de Impostos e Outras Taxas
              </h3>
              <p className="text-xs text-[#11310C]/70 font-medium">
                Calcule automaticamente impostos sobre sua renda no Dashboard
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() =>
              onUpdateTaxSettings({
                ...taxSettings,
                enabled: !taxSettings.enabled,
              })
            }
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              taxSettings.enabled ? 'bg-[#C4C240]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                taxSettings.enabled ? 'translate-x-5 bg-[#11310C]' : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>

        {taxSettings.enabled ? (
          <div className="p-4 rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-[#11310C] mb-1">
                  Porcentagem de Impostos sobre Renda / Faturamento (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxSettings.percentage}
                    onChange={(e) =>
                      onUpdateTaxSettings({
                        ...taxSettings,
                        percentage: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-[#11310C]/20 text-sm font-extrabold text-[#11310C] focus:outline-none focus:ring-2 focus:ring-[#C4C240]"
                    placeholder="Ex: 6.0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#11310C]/60">
                    %
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#11310C]/10 text-xs space-y-2">
                <span className="font-extrabold text-[#11310C] block">Simulação de Cálculo:</span>
                <p className="text-[11px] text-[#11310C]/70 font-medium">
                  Com faturamento bruto de <strong>R$ 10.000,00</strong> a uma taxa de{' '}
                  <strong className="text-[#11310C]">{taxSettings.percentage}%</strong>:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold pt-1">
                  <div className="p-2.5 rounded-xl bg-[#FDECE9] border border-[#E13513]/20 text-[#E13513]">
                    <span className="text-[9px] uppercase tracking-wider block font-extrabold opacity-80">Imposto ({taxSettings.percentage}%)</span>
                    <span className="text-xs font-extrabold">- R$ {((10000 * taxSettings.percentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950">
                    <span className="text-[9px] uppercase tracking-wider block font-extrabold text-emerald-800">Renda Líquida</span>
                    <span className="text-xs font-extrabold text-emerald-950">R$ {(10000 - (10000 * taxSettings.percentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#11310C]/70 font-medium">
              Com esta opção ativada, o Dashboard exibirá o cálculo de impostos e a Renda Líquida resultante.
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#11310C]/60 italic font-medium">
            Impostos desativados. Os totais de renda e sobras serão exibidos em valor bruto.
          </p>
        )}
      </div>

      {/* Google Authentication Box - Verde Escuro Glass Dark Card Featured */}
      <div className="glass-dark-card rounded-3xl p-6 text-[#FAFBF6] space-y-5 shadow-xl relative overflow-hidden glaze-shine border border-[#C4C240]/30">
        <div className="flex items-center justify-between pb-3 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#11310C] flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#FAFBF6]">Conexão Google Sheets</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240] text-[#11310C] uppercase tracking-wider">
                  Destaque
                </span>
              </div>
              <p className="text-xs text-[#FAFBF6]/80 font-medium">Sincronização com planilhas privadas do Google Drive</p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#C4C240]/20 text-[#C4C240] border border-[#C4C240]/40">
            <ShieldCheck className="w-4 h-4 text-[#C4C240]" />
            Integrado
          </span>
        </div>

        {googleUser ? (
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#C4C240]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#C4C240] text-[#11310C] font-extrabold flex items-center justify-center">
                    {googleUser.email ? googleUser.email[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm text-[#FAFBF6]">
                    {googleUser.displayName || 'Usuário Autenticado'}
                  </h4>
                  <p className="text-xs font-semibold text-[#C4C240]">{googleUser.email}</p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#C4C240]/20 text-[#C4C240] border border-[#C4C240]/40 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C4C240]" />
                {googleUser.isSimulated ? 'Modo Direto Ativo' : 'Conectado'}
              </span>
            </div>

            <p className="text-xs text-[#FAFBF6]/80 font-medium">
              {googleUser.isSimulated
                ? 'Sessão ativa configurada para carlos@dominus.site. Todas as planilhas e métricas estão liberadas para consulta.'
                : 'Sua conta Google está conectada com sucesso. As planilhas do Google Sheets privadas são sincronizadas em tempo real.'}
            </p>

            <button
              onClick={onGoogleLogout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15 space-y-4 backdrop-blur-md">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#C4C240] text-[#11310C] flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6 text-[#11310C]" />
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-[#FAFBF6]">Conecte sua Conta Google</h4>
                <p className="text-xs text-[#FAFBF6]/80 mt-1 max-w-sm mx-auto font-medium">
                  Inicie sessão para autorizar a leitura automática das suas planilhas de gastos, cartões e investimentos no Google Drive.
                </p>
              </div>
            </div>

            {/* In-iframe notice */}
            {isInIframe && !authError && (
              <div className="p-3 rounded-xl bg-[#C4C240]/10 border border-[#C4C240]/30 text-left text-xs text-[#FAFBF6]/90 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[#C4C240]">
                  <span>💡</span> Dica de Autenticação em Iframe:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Como o aplicativo está sendo executado no preview do AI Studio, os pop-ups do Google podem ser bloqueados pelo navegador. Se o botão abaixo não responder, use <strong>"Abrir em Nova Aba"</strong> ou <strong>"Modo Direto Carlos"</strong>.
                </p>
              </div>
            )}

            {/* Error Diagnostics Card */}
            {authError && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-left space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{authError.title}</span>
                  </div>
                  {onClearAuthError && (
                    <button
                      onClick={onClearAuthError}
                      className="p-1 rounded-lg hover:bg-white/10 text-[#FAFBF6]/60 hover:text-[#FAFBF6] cursor-pointer"
                      title="Fechar alerta"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#FAFBF6]/90 leading-relaxed font-medium">
                  {authError.solution}
                </p>

                {/* Domain authorization instructions */}
                {authError.isDomainError && authError.currentDomain && (
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#FAFBF6]/60">Domínio Atual:</span>
                      <button
                        onClick={() => handleCopyDomain(authError.currentDomain!)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-[#C4C240] text-[#11310C] hover:bg-[#d6d44a] transition-all cursor-pointer"
                      >
                        {domainCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Domínio</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block p-2 rounded bg-black/50 text-[11px] font-mono text-[#C4C240] break-all select-all">
                      {authError.currentDomain}
                    </code>

                    <div className="pt-1 text-[11px] text-[#FAFBF6]/80 space-y-1">
                      <p className="font-bold text-[#FAFBF6]">Passo a passo para autorizar:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-[11px] pl-1">
                        <li>Copie o domínio acima.</li>
                        <li>Abra o Firebase Console nas configurações de autenticação.</li>
                        <li>Em <strong>Domínios autorizados (Authorized domains)</strong>, clique em <strong>Adicionar domínio</strong> e cole.</li>
                      </ol>
                    </div>

                    {authError.helpUrl && (
                      <a
                        href={authError.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C4C240] hover:underline pt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Configurações do Firebase Console</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Actions inside error card */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleOpenNewTab}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </button>

                  {onDirectCarlosLogin && (
                    <button
                      onClick={onDirectCarlosLogin}
                      className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-[#C4C240] hover:bg-[#d6d44a] text-[#11310C] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Entrar como Carlos (Modo Direto)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 text-[#11310C] font-extrabold text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 border border-gray-200/80"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoggingIn ? 'Autenticando...' : 'Iniciar Sessão com o Google'}</span>
              </button>

              <button
                onClick={handleOpenNewTab}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-[#FAFBF6] font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
                title="Abre o aplicativo em uma aba separada do navegador para evitar restrições de pop-up"
              >
                <ExternalLink className="w-4 h-4 text-[#C4C240]" />
                <span>Abrir em Nova Aba</span>
              </button>

              {onDirectCarlosLogin && !authError && (
                <button
                  onClick={onDirectCarlosLogin}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#C4C240]/20 hover:bg-[#C4C240]/30 text-[#C4C240] font-extrabold text-xs flex items-center justify-center gap-2 border border-[#C4C240]/40 transition-all cursor-pointer"
                  title="Acesse diretamente como Carlos (carlos@dominus.site) sem passar pelo pop-up"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Modo Direto (Carlos)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Embedded Planilhas & Conexões Section */}
      <div className="pt-4 border-t border-[#11310C]/10">
        <PlanilhasView
          spreadsheets={spreadsheets}
          onAddSpreadsheet={onAddSpreadsheet}
          onImportCsvTransactions={onImportCsvTransactions}
          onRefreshSheets={onRefreshSheets}
        />
      </div>
    </div>
  );
};

