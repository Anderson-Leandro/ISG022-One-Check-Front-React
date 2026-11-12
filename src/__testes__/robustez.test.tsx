// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AVISO_DE_SAIDA_EM_OUTRA_ABA, armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import { LimiteDeErro } from '../components/LimiteDeErro';
import { ehFalhaDeCarregamentoDePagina } from '../utils/recarregarAposNovaVersao';

/** Simula o que o navegador entrega a esta aba quando outra aba muda a localStorage. */
function mudancaEmOutraAba(chave: string, valorAntigo: string | null, valorNovo: string | null) {
  if (valorNovo === null) localStorage.removeItem(chave);
  else localStorage.setItem(chave, valorNovo);
  window.dispatchEvent(new StorageEvent('storage', { key: chave, oldValue: valorAntigo, newValue: valorNovo, storageArea: localStorage }));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

describe('sessão entre abas', () => {
  it('sair em outra aba encerra a sessão desta e deixa o aviso para o login', () => {
    armazenamentoDeTokens.salvar('access-desta-aba', 'refresh-compartilhado');
    const ouvinte = vi.fn();
    const pararDeOuvir = armazenamentoDeTokens.aoMudar(ouvinte);

    mudancaEmOutraAba('onecheck.refresh_token', 'refresh-compartilhado', null);

    expect(armazenamentoDeTokens.obterAccessToken()).toBeNull();
    expect(armazenamentoDeTokens.obterAvisoDeSessao()).toBe(AVISO_DE_SAIDA_EM_OUTRA_ABA);
    expect(ouvinte).toHaveBeenCalled();
    pararDeOuvir();
  });

  it('a renovação do token em outra aba não derruba esta', () => {
    armazenamentoDeTokens.salvar('access-desta-aba', 'refresh-1');

    mudancaEmOutraAba('onecheck.refresh_token', 'refresh-1', 'refresh-2');

    expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-desta-aba');
    expect(armazenamentoDeTokens.obterAvisoDeSessao()).toBeNull();
  });

  it('outra conta entrando no navegador descarta o access token da conta anterior', () => {
    armazenamentoDeTokens.salvar('access-da-conta-a', 'refresh-a');
    const contaA = JSON.stringify({ id: 'a', nome: 'A', email: 'a@a', role: 'admin' });
    const contaB = JSON.stringify({ id: 'b', nome: 'B', email: 'b@b', role: 'locatario' });
    localStorage.setItem('onecheck.usuario', contaA);

    mudancaEmOutraAba('onecheck.usuario', contaA, contaB);

    expect(armazenamentoDeTokens.obterAccessToken()).toBeNull();
    expect(armazenamentoDeTokens.obterUsuario()?.id).toBe('b');
  });

  it('mudança na sessionStorage de outra aba é ignorada', () => {
    armazenamentoDeTokens.salvar('access-desta-aba', 'refresh');
    window.dispatchEvent(new StorageEvent('storage', { key: 'onecheck.refresh_token', oldValue: 'refresh', newValue: null, storageArea: sessionStorage }));
    expect(armazenamentoDeTokens.obterAccessToken()).toBe('access-desta-aba');
  });
});

function Explode({ erro }: { erro: Error }): never {
  throw erro;
}

describe('limite de erro', () => {
  it('mostra uma tela com saída no lugar da tela em branco e volta ao trocar de rota', () => {
    const silenciarConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <LimiteDeErro chaveDeReinicio="/a">
        <Explode erro={new Error('quebrou')} />
      </LimiteDeErro>,
    );
    expect(screen.getByText('Algo deu errado nesta tela')).toBeTruthy();
    expect(screen.getByText('Tentar de novo')).toBeTruthy();

    rerender(
      <LimiteDeErro chaveDeReinicio="/b">
        <p>Outra página</p>
      </LimiteDeErro>,
    );
    expect(screen.getByText('Outra página')).toBeTruthy();
    silenciarConsole.mockRestore();
  });

  it('"Tentar de novo" monta o conteúdo outra vez', () => {
    const silenciarConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let deveQuebrar = true;
    function TalvezExploda() {
      if (deveQuebrar) throw new Error('falha passageira');
      return <p>Recuperado</p>;
    }
    render(
      <LimiteDeErro chaveDeReinicio="/a">
        <TalvezExploda />
      </LimiteDeErro>,
    );
    deveQuebrar = false;
    fireEvent.click(screen.getByText('Tentar de novo'));
    expect(screen.getByText('Recuperado')).toBeTruthy();
    silenciarConsole.mockRestore();
  });

  it('reconhece a falha de carregar uma página depois de um deploy', () => {
    expect(ehFalhaDeCarregamentoDePagina(new TypeError('Failed to fetch dynamically imported module: /assets/Lista-abc.js'))).toBe(true);
    expect(ehFalhaDeCarregamentoDePagina(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(ehFalhaDeCarregamentoDePagina(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
