// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorDeAutenticacao } from '../auth/AuthContext';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import { ProvedorDeFlash } from '../components/Flash';
import { ConfigurarMfa } from '../pages/auth/ConfigurarMfa';

interface Chamada {
  metodo: string;
  rota: string;
  corpo: unknown;
}

// o openapi-fetch guarda o fetch global ao criar o cliente, então o mock precisa existir antes dos imports
const { fetchFalso, estado } = vi.hoisted(() => {
  const estado = { mfaConfigurado: false, chamadas: [] as Chamada[] };
  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, opcoes?: RequestInit) => {
    const requisicao = entrada instanceof Request ? entrada : new Request(String(entrada), opcoes);
    const rota = new URL(requisicao.url).pathname;
    const texto = await requisicao.clone().text();
    estado.chamadas.push({ metodo: requisicao.method, rota, corpo: texto ? JSON.parse(texto) : null });

    if (rota.endsWith('/usuarios/me')) {
      const usuario = { id: 'u1', nome: 'Teste', email: 'teste@teste', role: 'admin', mfa_enabled: estado.mfaConfigurado, mfa_configurado: estado.mfaConfigurado, mfa_ativo: estado.mfaConfigurado };
      return Response.json({ sucesso: true, dados: usuario });
    }
    if (rota.endsWith('/auth/mfa/setup')) return Response.json({ sucesso: true, dados: { secret: 'ABC', qr_url: 'data:image/png;base64,AAAA' } });
    if (rota.endsWith('/auth/mfa/activate')) {
      return Response.json({ sucesso: true, dados: { mensagem: 'MFA ativado', sessao: { access_token: 'access-novo', refresh_token: 'refresh-novo' } } });
    }
    return Response.json({ sucesso: false, erro: 'Rota não simulada' }, { status: 404 });
  });
  globalThis.fetch = fetchFalso as unknown as typeof fetch;
  return { fetchFalso, estado };
});

const chamadasPara = (final: string) => estado.chamadas.filter((chamada) => chamada.rota.endsWith(final));

function abrir(mfaConfigurado: boolean) {
  estado.mfaConfigurado = mfaConfigurado;
  armazenamentoDeTokens.salvar('token-falso', 'refresh-falso');
  armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 'teste@teste', role: 'admin' });
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ProvedorDeFlash>
            <ProvedorDeAutenticacao>
              <ConfigurarMfa />
            </ProvedorDeAutenticacao>
          </ProvedorDeFlash>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

function digitar(rotulo: string, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

describe('ConfigurarMfa — POST /auth/mfa/setup com segredo pendente', () => {
  beforeEach(() => {
    fetchFalso.mockClear();
    estado.chamadas = [];
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('gera o segredo com um único POST ao abrir, mesmo no modo estrito', async () => {
    abrir(false);

    await waitFor(() => expect(screen.getByAltText('QR Code MFA')).toBeTruthy());
    expect(screen.getByAltText('QR Code MFA').getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(chamadasPara('/auth/mfa/setup')).toEqual([{ metodo: 'POST', rota: '/api/v1/auth/mfa/setup', corpo: null }]);
  });

  it('sem autenticador, ativa só com o código novo e grava a sessão devolvida', async () => {
    abrir(false);
    await waitFor(() => expect(screen.getByText('Ativar MFA')).toBeTruthy());
    expect(screen.queryByLabelText('Código do autenticador atual')).toBeNull();

    digitar('Código de 6 dígitos', '123456');
    fireEvent.click(screen.getByText('Ativar MFA'));

    await waitFor(() => expect(chamadasPara('/auth/mfa/activate')).toHaveLength(1));
    expect(chamadasPara('/auth/mfa/activate')[0].corpo).toEqual({ codigo: '123456' });
    await waitFor(() => expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-novo'));
    expect(armazenamentoDeTokens.obterRefreshToken()).toBe('refresh-novo');
  });

  it('com autenticador configurado, pede o código atual e envia os dois', async () => {
    abrir(true);
    await waitFor(() => expect(screen.getByLabelText('Código do autenticador atual')).toBeTruthy());

    digitar('Código do autenticador novo', '111111');
    digitar('Código do autenticador atual', '222222');
    fireEvent.click(screen.getByText('Trocar autenticador'));

    await waitFor(() => expect(chamadasPara('/auth/mfa/activate')).toHaveLength(1));
    expect(chamadasPara('/auth/mfa/activate')[0].corpo).toEqual({ codigo: '111111', codigo_atual: '222222' });
  });
});
