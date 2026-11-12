// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi, obterDados } from '../api/client';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';

type Resposta = { status: number; corpo: unknown; cabecalhos?: Record<string, string> };
type Roteador = (rota: string, requisicao: Request) => Resposta | Promise<Resposta>;

// o openapi-fetch guarda o fetch global ao criar o cliente, então o mock precisa existir antes dos imports
const fetchFalso = vi.hoisted(() => {
  const falso = vi.fn<(entrada: RequestInfo | URL, opcoes?: RequestInit) => Promise<Response>>();
  globalThis.fetch = falso as unknown as typeof fetch;
  return falso;
});

function responderCom(roteador: Roteador) {
  fetchFalso.mockImplementation(async (entrada, opcoes) => {
    const requisicao = entrada instanceof Request ? entrada : new Request(String(entrada), opcoes);
    const { status, corpo, cabecalhos } = await roteador(new URL(requisicao.url).pathname, requisicao);
    return Response.json(corpo, { status, headers: cabecalhos });
  });
}

const chamadasPara = (trecho: string) =>
  fetchFalso.mock.calls.filter(([entrada]) => String(entrada instanceof Request ? entrada.url : entrada).includes(trecho));

async function capturarErro(chamada: Promise<unknown>): Promise<ErroApi> {
  const erro = await chamada.then(
    () => null,
    (falha: unknown) => falha,
  );
  expect(erro).toBeInstanceOf(ErroApi);
  return erro as ErroApi;
}

const ROTA_DE_REFRESH = '/api/v1/auth/refresh';
const recusa = (erro: string, extras: Record<string, unknown> = {}) => ({ sucesso: false, erro, ...extras });

describe('cliente da API', () => {
  beforeEach(() => {
    fetchFalso.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('não renova a sessão nem repete um login recusado', async () => {
    armazenamentoDeTokens.salvar('access-antigo', 'refresh-guardado');
    responderCom(() => ({ status: 401, corpo: recusa('Credenciais inválidas') }));

    const erro = await capturarErro(obterDados(api.POST('/api/v1/auth/login', { body: { email: 'a@b.c', senha: 'errada' } })));

    expect(erro.status).toBe(401);
    expect(erro.message).toBe('Credenciais inválidas');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-guardado');
  });

  it('não renova a sessão num código MFA recusado no login', async () => {
    armazenamentoDeTokens.salvar('access-antigo', 'refresh-guardado');
    responderCom(() => ({ status: 401, corpo: recusa('Código MFA inválido') }));

    await capturarErro(obterDados(api.POST('/api/v1/auth/mfa/verify', { body: { temp_token: 't', codigo: '000000' } })));

    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('usa o Retry-After do 429 para dizer quanto esperar', async () => {
    responderCom(() => ({ status: 429, corpo: recusa('Muitas tentativas. Tente novamente mais tarde.'), cabecalhos: { 'Retry-After': '900' } }));

    const erro = await capturarErro(obterDados(api.POST('/api/v1/auth/login', { body: { email: 'a@b.c', senha: 'x' } })));

    expect(erro.status).toBe(429);
    expect(erro.esperarSegundos).toBe(900);
    expect(erro.message).toBe('Muitas tentativas. Tente novamente em 15 minuto(s).');
  });

  it('mantém a mensagem da API no 429 sem Retry-After', async () => {
    responderCom(() => ({ status: 429, corpo: recusa('Muitas tentativas. Tente novamente mais tarde.') }));

    const erro = await capturarErro(obterDados(api.POST('/api/v1/auth/login', { body: { email: 'a@b.c', senha: 'x' } })));

    expect(erro.esperarSegundos).toBeNull();
    expect(erro.message).toBe('Muitas tentativas. Tente novamente mais tarde.');
  });

  it('expõe as mensagens por campo do 422', async () => {
    responderCom(() => ({
      status: 422,
      corpo: recusa('A senha deve ter pelo menos 10 caracteres', { erros: { senha: 'A senha deve ter pelo menos 10 caracteres', cpf: 'CPF inválido' } }),
    }));

    const erro = await capturarErro(obterDados(api.POST('/api/v1/usuarios', { body: { nome: 'N', email: 'a@b.c', senha: 'curta', role: 'locatario' } })));

    expect(erro.message).toBe('A senha deve ter pelo menos 10 caracteres');
    expect(erro.erros).toEqual({ senha: 'A senha deve ter pelo menos 10 caracteres', cpf: 'CPF inválido' });
  });

  it('não lê mais o formato antigo com "detail"', async () => {
    responderCom(() => ({ status: 403, corpo: { detail: 'Permissão negada' } }));

    const erro = await capturarErro(obterDados(api.GET('/api/v1/usuarios/me')));

    expect(erro.message).toBe('Resposta inválida da API');
    expect(erro.erros).toEqual({});
  });

  it('faz um único refresh para vários 401 simultâneos e repete as requisições', async () => {
    armazenamentoDeTokens.salvar('access-vencido', 'refresh-1');
    responderCom((rota, requisicao) => {
      if (rota === ROTA_DE_REFRESH) return { status: 200, corpo: { sucesso: true, dados: { access_token: 'access-novo', refresh_token: 'refresh-2' } } };
      if (requisicao.headers.get('Authorization') !== 'Bearer access-novo') return { status: 401, corpo: recusa('Token inválido') };
      return { status: 200, corpo: { sucesso: true, dados: { rota } } };
    });

    const respostas = await Promise.all([
      obterDados<{ rota: string }>(api.GET('/api/v1/usuarios/me')),
      obterDados<{ rota: string }>(api.GET('/api/v1/dashboard')),
      obterDados<{ rota: string }>(api.GET('/api/v1/imoveis')),
    ]);

    expect(respostas.map((resposta) => resposta.rota)).toEqual(['/api/v1/usuarios/me', '/api/v1/dashboard', '/api/v1/imoveis']);
    expect(chamadasPara(ROTA_DE_REFRESH)).toHaveLength(1);
    expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-novo');
    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-2');
  });

  it('encerra a sessão com aviso quando a API recusa o refresh, sem repetir a requisição', async () => {
    armazenamentoDeTokens.salvar('access-vencido', 'refresh-revogado');
    armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 't@t', role: 'admin' });
    responderCom(() => ({ status: 401, corpo: recusa('Sessão encerrada; faça login novamente') }));

    const erro = await capturarErro(obterDados(api.GET('/api/v1/usuarios/me')));

    expect(erro.status).toBe(401);
    expect(chamadasPara('/api/v1/usuarios/me')).toHaveLength(1);
    expect(chamadasPara(ROTA_DE_REFRESH)).toHaveLength(1);
    expect(armazenamentoDeTokens.obterAccessToken()).toBeNull();
    expect(armazenamentoDeTokens.obterRefreshToken()).toBeNull();
    expect(armazenamentoDeTokens.obterUsuario()).toBeNull();
    expect(armazenamentoDeTokens.consumirAvisoDeSessao()).toBe('Sua sessão foi encerrada. Faça login novamente.');
    expect(armazenamentoDeTokens.consumirAvisoDeSessao()).toBeNull();
  });

  it.each([500, 429])('mantém a sessão quando o refresh falha com %i, que não é recusa do token', async (statusDoRefresh) => {
    armazenamentoDeTokens.salvar('access-vencido', 'refresh-1');
    responderCom((rota) => (rota === ROTA_DE_REFRESH ? { status: statusDoRefresh, corpo: recusa('Tente novamente mais tarde.') } : { status: 401, corpo: recusa('Token inválido') }));

    await capturarErro(obterDados(api.GET('/api/v1/usuarios/me')));

    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-1');
    expect(armazenamentoDeTokens.consumirAvisoDeSessao()).toBeNull();
  });

  it('um 401 que chega depois de uma renovação concluída renova de novo com o refresh token atual', async () => {
    armazenamentoDeTokens.salvar('access-1', 'refresh-1');
    let renovacoes = 0;
    responderCom(async (rota, requisicao) => {
      if (rota === ROTA_DE_REFRESH) {
        renovacoes += 1;
        const { refresh_token: enviado } = (await requisicao.json()) as { refresh_token: string };
        if (enviado !== `refresh-${renovacoes}`) return { status: 401, corpo: recusa('Refresh token reutilizado') };
        return { status: 200, corpo: { sucesso: true, dados: { access_token: `access-${renovacoes + 1}`, refresh_token: `refresh-${renovacoes + 1}` } } };
      }
      const valido = requisicao.headers.get('Authorization') === `Bearer access-${renovacoes + 1}` && renovacoes > 0;
      return valido ? { status: 200, corpo: { sucesso: true, dados: { rota } } } : { status: 401, corpo: recusa('Token inválido') };
    });

    await obterDados(api.GET('/api/v1/usuarios/me'));
    armazenamentoDeTokens.salvar('access-revogado', 'refresh-2');
    await obterDados(api.GET('/api/v1/dashboard'));

    expect(renovacoes).toBe(2);
    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-3');
  });

  it('o aviso de sessão encerrada some depois de um logout comum', () => {
    armazenamentoDeTokens.encerrarSessao('Sua sessão foi encerrada. Faça login novamente.');
    armazenamentoDeTokens.limpar();

    expect(armazenamentoDeTokens.consumirAvisoDeSessao()).toBeNull();
  });

  it('junta as mensagens quando um campo do 422 vem como lista', async () => {
    responderCom(() => ({ status: 422, corpo: recusa('muito curta', { erros: { senha: ['muito curta', 'sem letra'] } }) }));

    const erro = await capturarErro(obterDados(api.GET('/api/v1/usuarios/me')));

    expect(erro.erros).toEqual({ senha: 'muito curta; sem letra' });
  });

  it('marca senha_expirada no usuário guardado quando a API responde o 403 da política de senha', async () => {
    armazenamentoDeTokens.salvar('access', 'refresh');
    armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 't@t', role: 'gestor' });
    responderCom(() => ({ status: 403, corpo: recusa('Sua senha não atende à política atual: troque-a em PUT /api/v1/usuarios/me/senha') }));

    await capturarErro(obterDados(api.GET('/api/v1/imoveis')));

    expect(armazenamentoDeTokens.obterUsuario()?.senha_expirada).toBe(true);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('não marca senha_expirada num 403 comum de permissão', async () => {
    armazenamentoDeTokens.salvar('access', 'refresh');
    armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 't@t', role: 'gestor' });
    responderCom(() => ({ status: 403, corpo: recusa('Permissão negada') }));

    await capturarErro(obterDados(api.GET('/api/v1/logs')));

    expect(armazenamentoDeTokens.obterUsuario()?.senha_expirada).toBeUndefined();
  });

  it('aplicarSessao grava o par novo de dados.sessao e ignora respostas sem sessão', () => {
    armazenamentoDeTokens.salvar('access-antigo', 'refresh-antigo');

    armazenamentoDeTokens.aplicarSessao({ mensagem: 'Senha alterada' });
    expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-antigo');

    armazenamentoDeTokens.aplicarSessao({ mensagem: 'Senha alterada', sessao: { access_token: 'access-novo', refresh_token: 'refresh-novo' } });
    expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-novo');
    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-novo');
  });
});
