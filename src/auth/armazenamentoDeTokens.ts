import type { Usuario } from './tipos';

const CHAVE_REFRESH = 'onecheck.refresh_token';
const CHAVE_ACCESS = 'onecheck.access_token';
const CHAVE_USUARIO = 'onecheck.usuario';
const CHAVE_TEMP_MFA = 'onecheck.mfa_temp_token';
const CHAVE_AVISO = 'onecheck.aviso_de_sessao';

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

function idDoUsuarioGuardado(bruto: string | null): string | null {
  if (!bruto) return null;
  try {
    return (JSON.parse(bruto) as Usuario).id ?? null;
  } catch {
    return null;
  }
}

/** Esquece só o que é desta aba (sessionStorage); o que é compartilhado já foi trocado pela outra aba. */
function descartarSessaoDestaAba(aviso: string | null): void {
  gravar(sessionStorage, CHAVE_ACCESS, null);
  gravar(sessionStorage, CHAVE_TEMP_MFA, null);
  if (aviso) gravar(sessionStorage, CHAVE_AVISO, aviso);
  ouvintes.forEach((ouvinte) => ouvinte());
}

export const AVISO_DE_SAIDA_EM_OUTRA_ABA = 'Sua sessão foi encerrada em outra aba.';

/**
 * O refresh token e o usuário ficam na localStorage, compartilhada entre as abas; o access token fica na
 * sessionStorage de cada aba. Sem isto, sair numa aba deixaria as outras funcionando até o access token vencer.
 * O evento "storage" só chega às outras abas, nunca à que fez a mudança.
 */
function sincronizarComOutrasAbas(evento: StorageEvent): void {
  if (evento.storageArea !== localStorage) return;
  // outra aba saiu (ou o armazenamento foi limpo): esta aba sai também e avisa no login.
  // O logout apaga o refresh token e o usuário; olhar os dois cobre também a sessão que veio sem refresh token
  const saiuEmOutraAba = !ler(localStorage, CHAVE_REFRESH) && !ler(localStorage, CHAVE_USUARIO);
  if ((evento.key === CHAVE_REFRESH || evento.key === CHAVE_USUARIO || evento.key === null) && saiuEmOutraAba) {
    const estavaLogada = Boolean(ler(sessionStorage, CHAVE_ACCESS) || evento.oldValue);
    descartarSessaoDestaAba(estavaLogada ? AVISO_DE_SAIDA_EM_OUTRA_ABA : null);
    return;
  }
  if (evento.key === CHAVE_USUARIO) {
    const idAnterior = idDoUsuarioGuardado(evento.oldValue);
    const idNovo = idDoUsuarioGuardado(evento.newValue);
    // outra conta entrou neste navegador: o refresh token compartilhado agora é dela, então esta aba passa a
    // usar essa conta. O access token desta aba ainda é da conta anterior e é descartado (o AuthContext limpa o cache)
    if (idAnterior && idNovo && idAnterior !== idNovo) {
      descartarSessaoDestaAba(null);
      return;
    }
    // login em outra aba, ou o mesmo usuário com dados novos (nome, marca de senha expirada…): só atualiza a tela
    ouvintes.forEach((ouvinte) => ouvinte());
  }
}

if (typeof window !== 'undefined') window.addEventListener('storage', sincronizarComOutrasAbas);

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
    gravar(sessionStorage, CHAVE_AVISO, null);
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
    gravar(sessionStorage, CHAVE_AVISO, null);
    ouvintes.forEach((ouvinte) => ouvinte());
  },

  /**
   * Troca de credencial (senha, autenticador, MFA): a API encerra todas as sessões e devolve em
   * dados.sessao o único par que continua valendo. Sem gravar, a próxima requisição daria 401.
   */
  aplicarSessao(dados: unknown): void {
    const sessao = (dados as { sessao?: { access_token?: unknown; refresh_token?: unknown } } | null | undefined)?.sessao;
    if (typeof sessao?.access_token !== 'string' || !sessao.access_token) return;
    this.salvar(sessao.access_token, typeof sessao.refresh_token === 'string' ? sessao.refresh_token : null);
  },

  /** A API recusou a renovação: descarta a sessão e deixa um aviso para a tela de login. */
  encerrarSessao(aviso: string): void {
    this.limpar();
    gravar(sessionStorage, CHAVE_AVISO, aviso);
  },

  /** Aviso deixado por encerrarSessao; some no próximo login ou logout. */
  obterAvisoDeSessao: (): string | null => ler(sessionStorage, CHAVE_AVISO),
  limparAvisoDeSessao: (): void => gravar(sessionStorage, CHAVE_AVISO, null),

  /** Notifica o AuthContext quando o client renova ou descarta tokens. */
  aoMudar(ouvinte: Ouvinte): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },
};
