import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNomesParaContratos } from '../../api/contratos';
import { ROTULO_DA_PRIORIDADE, ROTULO_DO_STATUS_DO_PROBLEMA, useTodosOsProblemas } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { formatarData } from '../../utils/formatar';

/** problemas/index.php — o filtro de status é local, pois a API não pagina problemas. */
export function ListaDeProblemas() {
  const { usuario } = useAuth();
  const consulta = useTodosOsProblemas();
  const { nomeDoImovel } = useNomesParaContratos();
  const [statusFiltrado, setStatusFiltrado] = useState('');

  const todos = consulta.data?.problemas ?? [];
  const contratosNegados = consulta.data?.contratosNegados ?? 0;
  const problemas = statusFiltrado ? todos.filter((problema) => problema.status === statusFiltrado) : todos;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Problemas"
        subtitulo={`${todos.length} problema(s) registrado(s)`}
        acoes={
          podeCriar(usuario, 'problemas') && (
            <Link to="/problemas/novo" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />
              Novo problema
            </Link>
          )
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-status">
                Status
              </label>
              <select id="filtro-status" className="form-select form-select-sm" value={statusFiltrado} onChange={(evento) => setStatusFiltrado(evento.target.value)}>
                <option value="">Todos</option>
                {Object.entries(ROTULO_DO_STATUS_DO_PROBLEMA).map(([valor, rotulo]) => (
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
          Seu perfil não tem permissão na API para listar os problemas de {contratosNegados} contrato(s).
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
            {problemas.length === 0 ? (
              <div className="p-4" style={{ color: '#6b7fa3', fontSize: 13 }}>
                <i className="bi bi-check-circle me-2" style={{ color: '#22c55e' }} />
                Nenhum problema registrado.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Imóvel</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                      <th>Registrado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemas.map((problema) => (
                      <tr key={problema.id}>
                        <td>
                          <Link to={`/problemas/${problema.id}`}>{problema.titulo || '—'}</Link>
                        </td>
                        <td style={{ fontSize: 12 }}>{nomeDoImovel(problema.contrato.imovel_id)}</td>
                        <td>
                          <BadgeStatus grupo="prioridade" valor={problema.prioridade ?? 'normal'} rotulo={ROTULO_DA_PRIORIDADE[problema.prioridade ?? 'normal']} />
                        </td>
                        <td>
                          <BadgeStatus grupo="problema" valor={problema.status} rotulo={ROTULO_DO_STATUS_DO_PROBLEMA[problema.status ?? '']} />
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{formatarData(problema.created_at)}</td>
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
