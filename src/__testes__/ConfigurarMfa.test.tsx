// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorDeAutenticacao } from '../auth/AuthContext';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import { ProvedorDeFlash } from '../components/Flash';
import { ConfigurarMfa } from '../pages/auth/ConfigurarMfa';

// o openapi-fetch guarda o fetch global ao criar o cliente, então o mock precisa existir antes dos imports
const fetchFalso = vi.hoisted(() => {
  const falso = vi.fn<(requisicao: RequestInfo | URL) => Promise<Response>>(async () => Response.json({ sucesso: true, dados: { secret: 'ABC', qr_code_url: 'otpauth://totp/x?secret=ABC' } }));
  globalThis.fetch = falso as unknown as typeof fetch;
  return falso;
});

const chamadasDeSetup = () => fetchFalso.mock.calls.filter(([requisicao]) => String(requisicao instanceof Request ? requisicao.url : requisicao).includes('/auth/mfa/setup'));

function abrirComMfa(ativo: boolean) {
  armazenamentoDeTokens.salvar('token-falso', 'refresh-falso');
  armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 'teste@teste', role: 'admin', mfa_ativo: ativo });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ProvedorDeFlash>
          <ProvedorDeAutenticacao>
            <ConfigurarMfa />
          </ProvedorDeAutenticacao>
        </ProvedorDeFlash>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConfigurarMfa — GET /auth/mfa/setup troca o segredo na hora', () => {
  beforeEach(() => fetchFalso.mockClear());
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('com MFA já ativo, não chama o setup antes da confirmação', async () => {
    abrirComMfa(true);
    expect(screen.getByText('Gerar novo QR Code')).toBeTruthy();
    expect(screen.queryByText('Ativar MFA')).toBeNull();
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(chamadasDeSetup()).toHaveLength(0);

    fireEvent.click(screen.getByText('Gerar novo QR Code'));
    await waitFor(() => expect(chamadasDeSetup()).toHaveLength(1));
    expect(screen.getByText('Ativar MFA')).toBeTruthy();
  });

  it('sem MFA, carrega o QR Code direto', async () => {
    abrirComMfa(false);
    await waitFor(() => expect(chamadasDeSetup()).toHaveLength(1));
    expect(screen.queryByText('Gerar novo QR Code')).toBeNull();
  });
});
