import type { Usuario } from './tipos';

const CHAVE_REFRESH = 'onecheck.refresh_token';
const CHAVE_ACCESS = 'onecheck.access_token';
const CHAVE_USUARIO = 'onecheck.usuario';
const CHAVE_TEMP_MFA = 'onecheck.mfa_temp_token';

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

function ler(armazenamento: Storage, chave: string): string | null {
  try {
    return armazenamento.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(armazenamento: Storage, chave: string, valor: string | null): void {
  try {
    if (valor === null) armazenamento.removeItem(chave);
    else armazenamento.setItem(chave, valor);
  } catch {
    // armazenamento indisponível (modo privado) — segue só em memória
  }
}

/**
 * Substitui $_SESSION['api_token' | 'api_refresh_token' | 'user' | 'mfa_temp_token'].
 * Access token e temp token MFA ficam na sessionStorage (somem ao fechar a aba);
 * refresh token e usuário ficam na localStorage para manter o login.
 */
export const armazenamentoDeTokens = {
  obterAccessToken: (): string | null => ler(sessionStorage, CHAVE_ACCESS),
  obterRefreshToken: (): string | null => ler(localStorage, CHAVE_REFRESH),

  salvar(accessToken: string, refreshToken: string | null): void {
    gravar(sessionStorage, CHAVE_ACCESS, accessToken);
    if (refreshToken) gravar(localStorage, CHAVE_REFRESH, refreshToken);
    ouvintes.forEach((ouvinte) => ouvinte());
  },

  obterUsuario(): Usuario | null {
    const bruto = ler(localStorage, CHAVE_USUARIO);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as Usuario;
    } catch {
      return null;
    }
  },

  salvarUsuario(usuario: Usuario | null): void {
    gravar(localStorage, CHAVE_USUARIO, usuario ? JSON.stringify(usuario) : null);
    ouvintes.forEach((ouvinte) => ouvinte());
  },

  obterTempTokenMfa: (): string | null => ler(sessionStorage, CHAVE_TEMP_MFA),
  salvarTempTokenMfa: (token: string | null): void => gravar(sessionStorage, CHAVE_TEMP_MFA, token),

  limpar(): void {
    gravar(sessionStorage, CHAVE_ACCESS, null);
    gravar(sessionStorage, CHAVE_TEMP_MFA, null);
    gravar(localStorage, CHAVE_REFRESH, null);
    gravar(localStorage, CHAVE_USUARIO, null);
    ouvintes.forEach((ouvinte) => ouvinte());
  },

  /** Notifica o AuthContext quando o client renova ou descarta tokens. */
  aoMudar(ouvinte: Ouvinte): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },
};
