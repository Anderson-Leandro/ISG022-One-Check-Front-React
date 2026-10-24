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

export class ErroApi extends Error {
  readonly status: number;
  readonly corpo: unknown;

  constructor(mensagem: string, status: number, corpo: unknown) {
    super(mensagem);
    this.status = status;
    this.corpo = corpo;
  }
}

/** Equivalente a ApiClient::normalizeResponse — extrai a mensagem de erro do corpo da API. */
export function extrairMensagemDeErro(corpo: unknown, status: number): string {
  const objeto = (corpo ?? {}) as Record<string, unknown>;
  if (typeof objeto.erro === 'string' && objeto.erro) return objeto.erro;
  if (typeof objeto.message === 'string' && objeto.message) return objeto.message;

  const detalhe = objeto.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe)) {
    const mensagens = detalhe
      .map((item) => (item && typeof item === 'object' ? (item as { msg?: unknown }).msg : null))
      .filter((mensagem): mensagem is string => typeof mensagem === 'string');
    return mensagens.length ? mensagens.join('; ') : 'Erro de validação na API';
  }

  if (status === 0) return 'API indisponível';
  if (status === 404) return 'Endpoint não encontrado na API.';
  if (status === 405) return 'Método não permitido na API.';
  return 'Resposta inválida da API';
}

const ROTA_DE_REFRESH = '/api/v1/auth/refresh';
const requisicoesOriginais = new WeakMap<Request, Request>();
let refreshEmAndamento: Promise<boolean> | null = null;

/** Equivalente a ApiClient::tryRefreshToken — uma única renovação por vez. */
async function renovarToken(): Promise<boolean> {
  const refreshToken = armazenamentoDeTokens.obterRefreshToken();
  if (!refreshToken) return false;

  refreshEmAndamento ??= (async () => {
    try {
      const resposta = await fetch(`${URL_DA_API}${ROTA_DE_REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const corpo = await resposta.json().catch(() => null);
      const accessToken = corpo?.dados?.access_token;
      if (!resposta.ok || !corpo?.sucesso || !accessToken) return false;
      armazenamentoDeTokens.salvar(accessToken, corpo.dados.refresh_token ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshEmAndamento = null;
    }
  })();

  return refreshEmAndamento;
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
    if (response.status !== 401 || request.url.endsWith(ROTA_DE_REFRESH)) return response;
    if (!armazenamentoDeTokens.obterRefreshToken()) return response;

    const original = requisicoesOriginais.get(request);
    if (!original || !(await renovarToken())) {
      armazenamentoDeTokens.limpar();
      return response;
    }

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
    throw new ErroApi(extrairMensagemDeErro(corpo, response.status), response.status, corpo);
  }
  return corpo;
}

/** Atalho para quando só os `dados` interessam. */
export async function obterDados<T>(
  chamada: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  return (await desembrulhar<T>(chamada)).dados;
}
