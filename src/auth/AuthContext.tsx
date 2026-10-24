import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, obterDados } from '../api/client';
import { armazenamentoDeTokens } from './armazenamentoDeTokens';
import type { RespostaDeLogin, Usuario } from './tipos';

/** Próximo passo após enviar credenciais (equivale aos redirects de public/login.php). */
export type ResultadoDoLogin = 'autenticado' | 'mfa_obrigatorio' | 'mfa_configuracao_obrigatoria';

interface ValorDoContexto {
  usuario: Usuario | null;
  autenticado: boolean;
  iniciais: string;
  entrar(email: string, senha: string): Promise<ResultadoDoLogin>;
  verificarMfa(codigo: string): Promise<void>;
  ativarMfaNoLogin(codigo: string): Promise<void>;
  sair(): Promise<void>;
}

const ContextoDeAutenticacao = createContext<ValorDoContexto | null>(null);

function calcularIniciais(usuario: Usuario | null): string {
  if (!usuario) return 'U';
  const partes = String(usuario.nome ?? '').trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'U';
}

function estaAutenticado(): boolean {
  return Boolean(armazenamentoDeTokens.obterAccessToken() || armazenamentoDeTokens.obterRefreshToken());
}

function guardarSessao(dados: RespostaDeLogin): void {
  armazenamentoDeTokens.salvarTempTokenMfa(null);
  armazenamentoDeTokens.salvar(dados.access_token!, dados.refresh_token ?? null);
  armazenamentoDeTokens.salvarUsuario(dados.usuario ?? null);
}

export function ProvedorDeAutenticacao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => armazenamentoDeTokens.obterUsuario());
  const [autenticado, setAutenticado] = useState<boolean>(estaAutenticado);

  useEffect(
    () =>
      armazenamentoDeTokens.aoMudar(() => {
        setUsuario(armazenamentoDeTokens.obterUsuario());
        setAutenticado(estaAutenticado());
      }),
    [],
  );

  const entrar = useCallback(async (email: string, senha: string): Promise<ResultadoDoLogin> => {
    const dados = await obterDados<RespostaDeLogin>(
      api.POST('/api/v1/auth/login', { body: { email, senha } }),
    );

    if (dados.access_token) {
      guardarSessao(dados);
      return 'autenticado';
    }
    armazenamentoDeTokens.salvarTempTokenMfa(dados.temp_token ?? null);
    return dados.mfa_setup_required ? 'mfa_configuracao_obrigatoria' : 'mfa_obrigatorio';
  }, []);

  const verificarMfa = useCallback(async (codigo: string) => {
    const tempToken = armazenamentoDeTokens.obterTempTokenMfa() ?? '';
    const dados = await obterDados<RespostaDeLogin>(
      api.POST('/api/v1/auth/mfa/verify', { body: { temp_token: tempToken, codigo } }),
    );
    guardarSessao(dados);
  }, []);

  const ativarMfaNoLogin = useCallback(async (codigo: string) => {
    const tempToken = armazenamentoDeTokens.obterTempTokenMfa() ?? '';
    const dados = await obterDados<RespostaDeLogin>(
      api.POST('/api/v1/auth/mfa/activate-login', { body: { temp_token: tempToken, codigo } }),
    );
    guardarSessao(dados);
  }, []);

  const sair = useCallback(async () => {
    const refreshToken = armazenamentoDeTokens.obterRefreshToken();
    if (refreshToken) {
      // faz logout local mesmo se a API falhar
      await api.POST('/api/v1/auth/logout', { body: { refresh_token: refreshToken } }).catch(() => null);
    }
    armazenamentoDeTokens.limpar();
  }, []);

  const valor = useMemo<ValorDoContexto>(
    () => ({
      usuario,
      autenticado,
      iniciais: calcularIniciais(usuario),
      entrar,
      verificarMfa,
      ativarMfaNoLogin,
      sair,
    }),
    [usuario, autenticado, entrar, verificarMfa, ativarMfaNoLogin, sair],
  );

  return <ContextoDeAutenticacao.Provider value={valor}>{children}</ContextoDeAutenticacao.Provider>;
}

export function useAuth(): ValorDoContexto {
  const contexto = useContext(ContextoDeAutenticacao);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <ProvedorDeAutenticacao>');
  return contexto;
}
