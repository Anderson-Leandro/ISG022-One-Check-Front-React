import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { idCurto, ITENS_POR_PAGINA, ROTULO_DO_STATUS_DO_CONTRATO, useListaDeContratos, useNomesParaContratos } from '../../api/contratos';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { Paginacao } from '../../components/Paginacao';
import { formatarData, formatarMoeda } from '../../utils/formatar';

/** contratos/index.php */
export function ListaDeContratos() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const statusFiltrado = parametros.get('status') ?? '';
  const pagina = Math.max(1, Number(parametros.get('pagina') ?? 1) || 1);
  const [statusSelecionado, setStatusSelecionado] = useState(statusFiltrado);

  const consulta = useListaDeContratos(pagina, statusFiltrado);
  const { nomeDoImovel, nomeDoLocatario } = useNomesParaContratos();
  const contratos = consulta.data?.dados ?? [];
  const total = consulta.data?.paginacao?.total ?? contratos.length;

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

  return (
    <>
      <CabecalhoDaPagina
        titulo="Contratos"
        subtitulo={`${total} contrato(s) registrado(s)`}
        acoes={
          podeCriar(usuario, 'contratos') && (
            <Link to="/contratos/novo" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />
              Novo contrato
            </Link>
          )
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
                {Object.entries(ROTULO_DO_STATUS_DO_CONTRATO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
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
            {contratos.length === 0 ? (
              <div className="p-4" style={{ color: '#6b7fa3', fontSize: 13 }}>
                <i className="bi bi-file-earmark-text me-2" />
                Nenhum contrato registrado ainda.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Imóvel</th>
                      <th>Locatário</th>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Valor mensal</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {contratos.map((contrato) => (
                      <tr key={contrato.id}>
                        <td style={{ fontSize: 11, color: '#6b7fa3' }}>
                          <Link to={`/contratos/${contrato.id}`}>{idCurto(contrato.id)}</Link>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <Link to={`/imoveis/${contrato.imovel_id}`}>{nomeDoImovel(contrato.imovel_id)}</Link>
                        </td>
                        <td style={{ fontSize: 12 }}>{nomeDoLocatario(contrato.locatario_id)}</td>
                        <td>{formatarData(contrato.data_inicio)}</td>
                        <td>{formatarData(contrato.data_fim)}</td>
                        <td>{contrato.valor_mensal != null ? formatarMoeda(contrato.valor_mensal) : '—'}</td>
                        <td>
                          <BadgeStatus grupo="contrato" valor={contrato.status} rotulo={ROTULO_DO_STATUS_DO_CONTRATO[contrato.status ?? '']} />
                        </td>
                        <td className="text-end">
                          <Link to={`/contratos/${contrato.id}`} className="btn btn-outline-secondary btn-sm py-0 px-2" title="Detalhes">
                            <i className="bi bi-eye" />
                          </Link>
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
