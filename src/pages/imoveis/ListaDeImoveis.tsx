import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { codigoCurto, imovelTemGaragem, ITENS_POR_PAGINA, useListaDeImoveis } from '../../api/imoveis';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { Paginacao } from '../../components/Paginacao';
import { ROTULO_DO_STATUS_DO_IMOVEL, rotuloDoTipoDeImovel, STATUS_EDITAVEIS_DO_IMOVEL } from '../../config/imoveis';
import { formatarData } from '../../utils/formatar';

/** imoveis/index.php */
export function ListaDeImoveis() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const statusFiltrado = parametros.get('status') ?? '';
  const pagina = Math.max(1, Number(parametros.get('pagina') ?? 1) || 1);
  const [statusSelecionado, setStatusSelecionado] = useState(statusFiltrado);
  const podeCadastrar = podeCriar(usuario, 'imoveis');

  const consulta = useListaDeImoveis(pagina, statusFiltrado);
  const imoveis = consulta.data?.dados ?? [];
  const total = consulta.data?.paginacao?.total ?? imoveis.length;

  function aplicarFiltros(status: string, novaPagina = 1) {
    const novosParametros = new URLSearchParams();
    if (status) novosParametros.set('status', status);
    if (novaPagina > 1) novosParametros.set('pagina', String(novaPagina));
    setParametros(novosParametros);
  }

  function aoFiltrar(evento: FormEvent) {
    evento.preventDefault();
    aplicarFiltros(statusSelecionado);
  }

  const botaoNovo = (
    <Link to="/imoveis/novo" className="btn btn-primary btn-sm">
      <i className="bi bi-plus-lg me-1" />
      Novo imóvel
    </Link>
  );

  return (
    <>
      <CabecalhoDaPagina
        titulo="Imóveis"
        subtitulo={`${total} imóvel(is) cadastrado(s)`}
        acoes={
          <>
            {podeCadastrar && botaoNovo}
            <Link to="/imoveis/mapa" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-map me-1" />
              Mapa
            </Link>
          </>
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <form className="row g-2 align-items-end" onSubmit={aoFiltrar}>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-status">
                Status
              </label>
              <select id="filtro-status" className="form-select form-select-sm" value={statusSelecionado} onChange={(evento) => setStatusSelecionado(evento.target.value)}>
                <option value="">Todos</option>
                {STATUS_EDITAVEIS_DO_IMOVEL.map((status) => (
                  <option key={status} value={status}>
                    {ROTULO_DO_STATUS_DO_IMOVEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-primary btn-sm">Filtrar</button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm ms-1"
                onClick={() => {
                  setStatusSelecionado('');
                  aplicarFiltros('');
                }}
              >
                Limpar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
            {imoveis.length === 0 ? (
              <div className="p-5 text-center">
                <i className="bi bi-building" style={{ fontSize: 48, color: 'var(--oc-border)' }} />
                <p className="mt-3 mb-1" style={{ color: 'var(--oc-muted)' }}>
                  Nenhum imóvel cadastrado ainda.
                </p>
                {podeCadastrar && <div className="mt-2">{botaoNovo}</div>}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Tamanho</th>
                      <th>Garagem</th>
                      <th>Status</th>
                      <th>Cadastrado em</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imoveis.map((imovel) => (
                      <tr key={imovel.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{codigoCurto(imovel)}</td>
                        <td>
                          <Link to={`/imoveis/${imovel.id}`}>{imovel.titulo || '—'}</Link>
                        </td>
                        <td>{rotuloDoTipoDeImovel(imovel.tipo)}</td>
                        <td>{imovel.tamanho || '—'}</td>
                        <td>{imovelTemGaragem(imovel) ? `${imovel.garagem_vagas || 1} vaga(s)` : 'Não'}</td>
                        <td>
                          <BadgeStatus grupo="imovel" valor={imovel.status} rotulo={ROTULO_DO_STATUS_DO_IMOVEL[imovel.status ?? '']} />
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{formatarData(imovel.created_at)}</td>
                        <td className="text-end text-nowrap">
                          <Link to={`/imoveis/${imovel.id}`} className="btn btn-outline-secondary btn-sm me-1" title="Detalhes">
                            <i className="bi bi-eye" />
                          </Link>
                          {podeCadastrar && (
                            <Link to={`/imoveis/${imovel.id}/editar`} className="btn btn-outline-secondary btn-sm">
                              <i className="bi bi-pencil" /> Editar
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EstadoDaConsulta>
        </div>
      </div>

      <Paginacao paginaAtual={pagina} totalDePaginas={Math.ceil(total / ITENS_POR_PAGINA)} aoMudar={(novaPagina) => aplicarFiltros(statusFiltrado, novaPagina)} />
    </>
  );
}
