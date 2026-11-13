import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ehFalhaDeCarregamentoDePagina, estaSemConexao, recarregarAposNovaVersao } from '../utils/recarregarAposNovaVersao';

interface Propriedades {
  children: ReactNode;
  /** Ao mudar (ex.: a rota), a tela de erro sai e o conteúdo é montado de novo. */
  chaveDeReinicio?: string;
}

interface Estado {
  erro: Error | null;
  chaveDoErro?: string;
}

/**
 * Sem isto, um erro de renderização deixa a tela inteira em branco. Aqui ele vira uma mensagem com saída,
 * e a navegação dos layouts (que fica fora do limite) continua funcionando.
 */
export class LimiteDeErro extends Component<Propriedades, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  static getDerivedStateFromProps(propriedades: Propriedades, estado: Estado): Partial<Estado> | null {
    // o erro pertence à rota em que aconteceu: navegar para outra limpa a tela de erro
    if (estado.erro && estado.chaveDoErro !== undefined && estado.chaveDoErro !== propriedades.chaveDeReinicio) return { erro: null, chaveDoErro: undefined };
    if (estado.erro && estado.chaveDoErro === undefined) return { chaveDoErro: propriedades.chaveDeReinicio };
    return null;
  }

  componentDidCatch(erro: Error, informacoes: ErrorInfo) {
    if (ehFalhaDeCarregamentoDePagina(erro) && recarregarAposNovaVersao()) return;
    console.error('Erro ao renderizar a tela', erro, informacoes.componentStack);
  }

  private tentarDeNovo = () => this.setState({ erro: null, chaveDoErro: undefined });

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    const falhaAoCarregar = ehFalhaDeCarregamentoDePagina(erro);
    const semConexao = falhaAoCarregar && estaSemConexao();
    const novaVersao = falhaAoCarregar && !semConexao;
    return (
      <div className="alert alert-danger m-3" role="alert">
        <h2 className="h6 mb-2">
          <i className="bi bi-exclamation-octagon me-2" />
          {semConexao ? 'Sem conexão' : novaVersao ? 'O sistema foi atualizado' : 'Algo deu errado nesta tela'}
        </h2>
        <p className="mb-3 small">
          {semConexao
            ? 'Não foi possível abrir esta página porque o computador está sem internet. Recarregue quando a conexão voltar.'
            : novaVersao
              ? 'Esta página mudou desde que a aba foi aberta. Recarregue para usar a versão nova.'
              : 'Tente de novo. Se o erro continuar, recarregue a página ou volte para a tela anterior.'}
        </p>
        <div className="d-flex gap-2">
          {!falhaAoCarregar && (
            <button type="button" className="btn btn-outline-light btn-sm" onClick={this.tentarDeNovo}>
              Tentar de novo
            </button>
          )}
          <button type="button" className="btn btn-light btn-sm" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
        </div>
      </div>
    );
  }
}
