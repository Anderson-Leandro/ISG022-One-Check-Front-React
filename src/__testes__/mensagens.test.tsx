// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorDeAutenticacao } from '../auth/AuthContext';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import { useSairDaConta } from '../auth/useSairDaConta';
import { ExibirFlash, ProvedorDeFlash, TEMPO_DE_EXIBICAO_EM_MS, useFlash } from '../components/Flash';
import { Login } from '../pages/auth/Login';

// o openapi-fetch guarda o fetch global ao criar o cliente, então o mock precisa existir antes dos imports
const fetchFalso = vi.hoisted(() => {
  const falso = vi.fn(async (entrada: RequestInfo | URL, opcoes?: RequestInit) => {
    const rota = new URL(entrada instanceof Request ? entrada.url : String(entrada), 'http://localhost').pathname;
    void opcoes;
    if (rota.endsWith('/auth/login')) return Response.json({ sucesso: false, erro: 'Credenciais inválidas' }, { status: 401 });
    return Response.json({ sucesso: true, dados: null });
  });
  globalThis.fetch = falso as unknown as typeof fetch;
  return falso;
});

function Pagina({ nome, destino, mensagem }: { nome: string; destino?: string; mensagem?: [Parameters<ReturnType<typeof useFlash>['definirFlash']>[0], string] }) {
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  return (
    <div>
      <h1>{nome}</h1>
      {mensagem && (
        <button type="button" onClick={() => definirFlash(...mensagem)}>
          Avisar
        </button>
      )}
      {mensagem && destino && (
        <button
          type="button"
          onClick={() => {
            definirFlash(...mensagem);
            navegar(destino);
          }}
        >
          Avisar e ir
        </button>
      )}
      {destino && (
        <button type="button" onClick={() => navegar(destino)}>
          Ir
        </button>
      )}
    </div>
  );
}

function montarRotas(rotas: { caminho: string; elemento: ReactElement }[], inicial: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[inicial]}>
        <ProvedorDeFlash>
          <ProvedorDeAutenticacao>
            <Routes>
              {rotas.map(({ caminho, elemento }) => (
                <Route
                  key={caminho}
                  path={caminho}
                  element={
                    caminho === '/login' ? (
                      elemento
                    ) : (
                      <>
                        <ExibirFlash />
                        {elemento}
                      </>
                    )
                  }
                />
              ))}
            </Routes>
          </ProvedorDeAutenticacao>
        </ProvedorDeFlash>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

describe('flash', () => {
  it('a mensagem criada antes de navegar aparece na tela seguinte e some na próxima troca', () => {
    vi.useFakeTimers();
    montarRotas(
      [
        { caminho: '/novo', elemento: <Pagina nome="Novo" destino="/lista" mensagem={['sucesso', 'Salvo.']} /> },
        { caminho: '/lista', elemento: <Pagina nome="Lista" destino="/outra" /> },
        { caminho: '/outra', elemento: <Pagina nome="Outra" /> },
      ],
      '/novo',
    );

    fireEvent.click(screen.getByText('Avisar e ir'));
    expect(screen.getByRole('heading', { name: 'Lista' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Salvo.');
    act(() => vi.advanceTimersByTime(1500));

    fireEvent.click(screen.getByText('Ir'));
    expect(screen.getByRole('heading', { name: 'Outra' })).toBeTruthy();
    expect(screen.queryByText('Salvo.')).toBeNull();
  });

  it('a mensagem de uma tela não vai junto quando a pessoa navega depois', () => {
    vi.useFakeTimers();
    montarRotas(
      [
        { caminho: '/a', elemento: <Pagina nome="A" destino="/b" mensagem={['erro', 'Falhou.']} /> },
        { caminho: '/b', elemento: <Pagina nome="B" /> },
      ],
      '/a',
    );

    fireEvent.click(screen.getByText('Avisar'));
    expect(screen.getByRole('alert').textContent).toContain('Falhou.');
    act(() => vi.advanceTimersByTime(2000));

    fireEvent.click(screen.getByText('Ir'));
    expect(screen.queryByText('Falhou.')).toBeNull();
  });

  it('não some enquanto o mouse está sobre a mensagem', () => {
    vi.useFakeTimers();
    montarRotas([{ caminho: '/a', elemento: <Pagina nome="A" mensagem={['sucesso', 'Lendo.']} /> }], '/a');

    fireEvent.click(screen.getByText('Avisar'));
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(TEMPO_DE_EXIBICAO_EM_MS * 2));
    expect(screen.getByText('Lendo.')).toBeTruthy();

    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(TEMPO_DE_EXIBICAO_EM_MS));
    expect(screen.queryByText('Lendo.')).toBeNull();
  });

  it('a pausa de uma mensagem que saiu da tela não impede a próxima de sumir', () => {
    vi.useFakeTimers();
    montarRotas([{ caminho: '/a', elemento: <Pagina nome="A" mensagem={['sucesso', 'Primeira.']} /> }], '/a');

    fireEvent.click(screen.getByText('Avisar'));
    fireEvent.mouseEnter(screen.getByRole('status'));
    fireEvent.click(screen.getByLabelText('Fechar'));
    fireEvent.click(screen.getByText('Avisar'));
    act(() => vi.advanceTimersByTime(TEMPO_DE_EXIBICAO_EM_MS));
    expect(screen.queryByText('Primeira.')).toBeNull();
  });

  it('sucesso some sozinho; erro fica até fechar', () => {
    vi.useFakeTimers();
    montarRotas([{ caminho: '/a', elemento: <Pagina nome="A" mensagem={['sucesso', 'Feito.']} /> }], '/a');

    fireEvent.click(screen.getByText('Avisar'));
    expect(screen.getByText('Feito.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(TEMPO_DE_EXIBICAO_EM_MS));
    expect(screen.queryByText('Feito.')).toBeNull();

    cleanup();
    montarRotas([{ caminho: '/a', elemento: <Pagina nome="A" mensagem={['erro', 'Deu erro.']} /> }], '/a');
    fireEvent.click(screen.getByText('Avisar'));
    act(() => vi.advanceTimersByTime(TEMPO_DE_EXIBICAO_EM_MS * 3));
    expect(screen.getByText('Deu erro.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.queryByText('Deu erro.')).toBeNull();
  });
});

function BotaoDeSair() {
  const sair = useSairDaConta();
  return (
    <button type="button" onClick={() => void sair()}>
      Sair
    </button>
  );
}

describe('mensagens da tela de login', () => {
  beforeEach(() => fetchFalso.mockClear());

  it('"Você saiu" aparece depois do logout e some quando a pessoa tenta entrar de novo', async () => {
    armazenamentoDeTokens.salvar('access', 'refresh');
    armazenamentoDeTokens.salvarUsuario({ id: 'u1', nome: 'Teste', email: 't@t', role: 'admin' });
    montarRotas(
      [
        { caminho: '/painel', elemento: <BotaoDeSair /> },
        { caminho: '/login', elemento: <Login /> },
      ],
      '/painel',
    );

    fireEvent.click(screen.getByText('Sair'));
    await waitFor(() => expect(screen.getByText('Você saiu com sucesso.')).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() => expect(screen.getByText('Credenciais inválidas')).toBeTruthy());
    expect(screen.queryByText('Você saiu com sucesso.')).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('o aviso de sessão encerrada aparece uma vez e não volta ao recarregar', () => {
    armazenamentoDeTokens.encerrarSessao('Sua sessão foi encerrada. Faça login novamente.');
    montarRotas([{ caminho: '/login', elemento: <Login /> }], '/login');

    expect(screen.getByText('Sua sessão foi encerrada. Faça login novamente.')).toBeTruthy();
    expect(armazenamentoDeTokens.obterAvisoDeSessao()).toBeNull();

    cleanup();
    montarRotas([{ caminho: '/login', elemento: <Login /> }], '/login');
    expect(screen.queryByText('Sua sessão foi encerrada. Faça login novamente.')).toBeNull();
  });

  it('os campos usam o preenchimento de login, não o de senha nova', () => {
    montarRotas([{ caminho: '/login', elemento: <Login /> }], '/login');
    expect(screen.getByLabelText(/E-mail/).getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText(/Senha/).getAttribute('autocomplete')).toBe('current-password');
  });
});
