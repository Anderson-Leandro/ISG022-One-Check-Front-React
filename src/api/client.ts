import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';

export const URL_DA_API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export interface Paginacao {
  total: number;
  pagina: number;
  por_pagina?: number;
  itens_por_pagina?: number;
  total_paginas?: number;
}

export interface RespostaApi<T> {
  sucesso: boolean;
  dados: T;
  paginacao?: Paginacao;
  erro?: string;
}

/** Mensagens por campo do 422 ({"senha": "…", "endereco.rua": "…"}). */
export type ErrosPorCampo = Record<string, string>;

export class ErroApi extends Error {
  readonly status: number;
  readonly corpo: unknown;
  /** Preenchido no 422; vazio nos outros erros. */
  readonly erros: ErrosPorCampo;
  /** Segundos de espera pedidos pela API no 429 (header Retry-After). */
  readonly esperarSegundos: number | null;

  constructor(mensagem: string, status: number, corpo: unknown, esperarSegundos: number | null = null) {
    super(mensagem);
    this.status = status;
    this.corpo = corpo;
    this.erros = extrairErrosPorCampo(corpo);
    this.esperarSegundos = esperarSegundos;
  }
}

function extrairErrosPorCampo(corpo: unknown): ErrosPorCampo {
  const erros = (corpo as { erros?: unknown } | null | undefined)?.erros;
  if (!erros || typeof erros !== 'object' || Array.isArray(erros)) return {};
  return Object.fromEntries(Object.entries(erros).filter((par): par is [string, string] => typeof par[1] === 'string'));
}

/** Todo erro da API vem no envelope {sucesso: false, erro, erros?}; o resto é falha de rede ou de proxy. */
export function extrairMensagemDeErro(corpo: unknown, status: number): string {
  const objeto = (corpo ?? {}) as Record<string, unknown>;
  if (typeof objeto.erro === 'string' && objeto.erro) return objeto.erro;

  if (status === 0) return 'API indisponível';
  if (status === 404) return 'Endpoint não encontrado na API.';
  if (status === 405) return 'Método não permitido na API.';
  if (status === 413) return 'Arquivo ou conteúdo grande demais.';
  if (status === 429) return 'Muitas tentativas. Tente novamente mais tarde.';
  return 'Resposta inválida da API';
}

function lerRetryAfter(resposta: Response): number | null {
  const segundos = Number(resposta.headers.get('Retry-After'));
  return Number.isFinite(segundos) && segundos > 0 ? Math.ceil(segundos) : null;
}

/** Monta o ErroApi de uma resposta recusada. No 429, a mensagem diz quanto esperar, sem falar em senha errada. */
export function criarErroDaResposta(corpo: unknown, resposta: Response): ErroApi {
  if (resposta.status === 429) {
    const esperarSegundos = lerRetryAfter(resposta);
    if (esperarSegundos !== null) {
      const minutos = Math.ceil(esperarSegundos / 60);
      const espera = esperarSegundos < 60 ? `${esperarSegundos} segundo(s)` : `${minutos} minuto(s)`;
      return new ErroApi(`Muitas tentativas. Tente novamente em ${espera}.`, 429, corpo, esperarSegundos);
    }
  }
  return new ErroApi(extrairMensagemDeErro(corpo, resposta.status), resposta.status, corpo);
}

const ROTA_DE_REFRESH = '/api/v1/auth/refresh';
/**
 * Rotas que não usam o access token (login, etapas do login com temp_token, refresh e logout).
 * Um 401 nelas é a própria recusa: renovar a sessão e repetir reenviaria a senha ou o código errado
 * e contaria duas falhas no limite de tentativas da API.
 */
const ROTAS_SEM_RENOVACAO = [
  '/api/v1/auth/login',
  '/api/v1/auth/mfa/verify',
  '/api/v1/auth/mfa/setup-login',
  '/api/v1/auth/mfa/activate-login',
  ROTA_DE_REFRESH,
  '/api/v1/auth/logout',
];
const AVISO_DE_SESSAO_ENCERRADA = 'Sua sessão foi encerrada. Faça login novamente.';
const INICIO_DO_ERRO_DE_SENHA_EXPIRADA = 'Sua senha não atende à política atual';
const TRAVA_DE_REFRESH = 'onecheck.refresh';

const requisicoesOriginais = new WeakMap<Request, Request>();

type ResultadoDaRenovacao = 'renovado' | 'recusado' | 'indisponivel';
let refreshEmAndamento: Promise<ResultadoDaRenovacao> | null = null;

/**
 * Uma renovação por vez também entre abas: a API encerra todas as sessões se um refresh token
 * já trocado for reenviado. Com a trava, a segunda aba espera e usa o token que a primeira gravou.
 */
function comTravaEntreAbas<T>(tarefa: () => Promise<T>): Promise<T> {
  const travas = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return travas ? (travas.request(TRAVA_DE_REFRESH, tarefa) as Promise<T>) : tarefa();
}

async function pedirNovoPar(tokenQueFalhou: string | null): Promise<ResultadoDaRenovacao> {
  // outra aba (ou uma troca de credencial) já gravou um access token novo enquanto esperávamos a trava
  const accessTokenAtual = armazenamentoDeTokens.obterAccessToken();
  if (accessTokenAtual && accessTokenAtual !== tokenQueFalhou) return 'renovado';

  const refreshToken = armazenamentoDeTokens.obterRefreshToken();
  if (!refreshToken) return 'recusado';
  try {
    const resposta = await fetch(`${URL_DA_API}${ROTA_DE_REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const corpo = await resposta.json().catch(() => null);
    const accessToken = corpo?.dados?.access_token;
    if (resposta.ok && corpo?.sucesso && accessToken) {
      armazenamentoDeTokens.salvar(accessToken, corpo.dados.refresh_token ?? refreshToken);
      return 'renovado';
    }
    // 5xx é falha do servidor, não recusa do token: a sessão continua guardada
    return resposta.status >= 500 ? 'indisponivel' : 'recusado';
  } catch {
    return 'indisponivel';
  }
}

/** Vários 401 ao mesmo tempo compartilham uma única renovação. */
function renovarToken(tokenQueFalhou: string | null): Promise<ResultadoDaRenovacao> {
  refreshEmAndamento ??= comTravaEntreAbas(() => pedirNovoPar(tokenQueFalhou)).finally(() => {
    refreshEmAndamento = null;
  });
  return refreshEmAndamento;
}

function tokenEnviado(requisicao: Request): string | null {
  return requisicao.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null;
}

/** 403 de conta com senha fora da política: marca o usuário para a tela de troca de senha assumir. */
async function marcarSenhaExpirada(resposta: Response): Promise<void> {
  const corpo = await resposta.clone().json().catch(() => null);
  const erro = typeof corpo?.erro === 'string' ? corpo.erro : '';
  if (!erro.startsWith(INICIO_DO_ERRO_DE_SENHA_EXPIRADA)) return;
  const usuario = armazenamentoDeTokens.obterUsuario();
  if (usuario && !usuario.senha_expirada) armazenamentoDeTokens.salvarUsuario({ ...usuario, senha_expirada: true });
}

const middlewareDeAutenticacao: Middleware = {
  onRequest({ request }) {
    const token = armazenamentoDeTokens.obterAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    request.headers.set('Accept', 'application/json');
    requisicoesOriginais.set(request, request.clone());
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status === 403) {
      await marcarSenhaExpirada(response);
      return response;
    }
    const rota = new URL(request.url).pathname;
    if (response.status !== 401 || ROTAS_SEM_RENOVACAO.some((semRenovacao) => rota.endsWith(semRenovacao))) return response;
    if (!armazenamentoDeTokens.obterRefreshToken()) return response;

    const original = requisicoesOriginais.get(request);
    if (!original) return response;

    const resultado = await renovarToken(tokenEnviado(request));
    if (resultado === 'indisponivel') return response;
    if (resultado === 'recusado') {
      armazenamentoDeTokens.encerrarSessao(AVISO_DE_SESSAO_ENCERRADA);
      return response;
    }

    // uma única nova tentativa: se também der 401, a resposta segue para a tela
    const novaTentativa = new Request(original);
    novaTentativa.headers.set('Authorization', `Bearer ${armazenamentoDeTokens.obterAccessToken()}`);
    return fetch(novaTentativa);
  },
};

export const api = createClient<paths>({ baseUrl: URL_DA_API });
api.use(middlewareDeAutenticacao);

/**
 * Converte o retorno do openapi-fetch no envelope {sucesso, dados, paginacao}.
 * Lança ErroApi quando a requisição falha ou a API responde sucesso=false.
 */
export async function desembrulhar<T>(
  chamada: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<RespostaApi<T>> {
  let resultado: Awaited<typeof chamada>;
  try {
    resultado = await chamada;
  } catch (erro) {
    throw new ErroApi(`API indisponível: ${(erro as Error).message}`, 0, null);
  }

  const { data, error, response } = resultado;
  const corpo = (data ?? error) as RespostaApi<T> | undefined;
  if (!response.ok || !corpo?.sucesso) {
    throw criarErroDaResposta(corpo, response);
  }
  return corpo;
}

/** Atalho para quando só os `dados` interessam. */
export async function obterDados<T>(
  chamada: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  return (await desembrulhar<T>(chamada)).dados;
}

/** Fotos/arquivos podem vir com caminho relativo (/api/v1/uploads/...) ou URL completa. */
export function urlDeArquivo(caminho: string | null | undefined): string {
  if (!caminho) return '';
  if (/^https?:\/\//i.test(caminho)) return caminho;
  return `${URL_DA_API}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}
