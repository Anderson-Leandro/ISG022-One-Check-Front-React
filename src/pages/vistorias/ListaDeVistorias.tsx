import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNomesParaContratos } from '../../api/contratos';
import { ROTULO_DO_TIPO_DE_VISTORIA, STATUS_DA_VISTORIA, useTodasAsVistorias } from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { formatarData } from '../../utils/formatar';
import { BadgeStatusDaVistoria, BadgeTipoDaVistoria } from './BadgesDaVistoria';

/** vistorias/index.php — filtros locais, pois a API só lista checklists por contrato. */
export function ListaDeVistorias() {
  const { usuario } = useAuth();
  const consulta = useTodasAsVistorias();
  const { nomeDoImovel } = useNomesParaContratos();
  const [statusFiltrado, setStatusFiltrado] = useState('');
  const [tipoFiltrado, setTipoFiltrado] = useState('');
  const podeCadastrar = podeCriar(usuario, 'vistorias');

  const todas = consulta.data?.vistorias ?? [];
  const contratosNegados = consulta.data?.contratosNegados ?? 0;
  const vistorias = todas.filter((vistoria) => (!statusFiltrado || vistoria.status === statusFiltrado) && (!tipoFiltrado || vistoria.tipo === tipoFiltrado));

  const botaoNova = (
    <Link to="/vistorias/nova" className="btn btn-primary btn-sm">
      <i className="bi bi-plus-lg me-1" />
      Nova vistoria
    </Link>
  );

  return (
    <>
      <CabecalhoDaPagina titulo="Vistorias" subtitulo={`${todas.length} vistoria(s) registrada(s)`} acoes={podeCadastrar && botaoNova} />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-status">
                Status
              </label>
              <select id="filtro-status" className="form-select form-select-sm" value={statusFiltrado} onChange={(evento) => setStatusFiltrado(evento.target.value)}>
                <option value="">Todos</option>
                {Object.entries(STATUS_DA_VISTORIA).map(([valor, { rotulo }]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-tipo">
                Tipo
              </label>
              <select id="filtro-tipo" className="form-select form-select-sm" value={tipoFiltrado} onChange={(evento) => setTipoFiltrado(evento.target.value)}>
                <option value="">Todos</option>
                {Object.entries(ROTULO_DO_TIPO_DE_VISTORIA).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {contratosNegados > 0 && (
        <div className="alert alert-warning">
          <i className="bi bi-lock me-2" />
          Seu perfil não tem permissão na API para listar as vistorias de {contratosNegados} contrato(s).
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
            {vistorias.length === 0 ? (
              <div className="p-5 text-center">
                <i className="bi bi-camera" style={{ fontSize: 48, color: 'var(--oc-border)' }} />
                <p className="mt-3 mb-1" style={{ color: 'var(--oc-muted)' }}>
                  Nenhuma vistoria encontrada.
                </p>
                {podeCadastrar && <div className="mt-2">{botaoNova}</div>}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Imóvel</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Data vistoria</th>
                      <th>Criado em</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistorias.map((vistoria) => (
                      <tr key={vistoria.id}>
                        <td style={{ fontSize: 12 }}>{nomeDoImovel(vistoria.contrato.imovel_id)}</td>
                        <td>
                          <BadgeTipoDaVistoria tipo={vistoria.tipo} />
                        </td>
                        <td>
                          <BadgeStatusDaVistoria status={vistoria.status} />
                        </td>
                        <td style={{ fontSize: 12 }}>{vistoria.data_vistoria ? formatarData(vistoria.data_vistoria) : 'Não realizada'}</td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{formatarData(vistoria.created_at)}</td>
                        <td className="text-end text-nowrap">
                          <Link to={`/vistorias/${vistoria.id}`} className="btn btn-outline-primary btn-sm">
                            <i className="bi bi-eye me-1" />
                            Ver
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
    </>
  );
}
