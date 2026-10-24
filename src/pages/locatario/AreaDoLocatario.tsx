import { Link } from 'react-router-dom';
import { useAreaDoLocatario } from '../../api/locatario';
import { ROTULO_DA_PRIORIDADE, ROTULO_DO_STATUS_DO_PROBLEMA } from '../../api/problemas';
import { useMudarStatusDaVistoria, type Checklist } from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { BadgeStatus } from '../../components/BadgeStatus';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { rotuloDoTipoDeImovel } from '../../config/imoveis';
import { resumoDoEndereco } from '../../utils/endereco';
import { formatarData, formatarMoeda } from '../../utils/formatar';
import { BadgeStatusDaVistoria, BadgeTipoDaVistoria } from '../vistorias/BadgesDaVistoria';

function VistoriaAguardandoAceite({ checklist }: { checklist: Checklist }) {
  const { definirFlash } = useFlash();
  const mudarStatus = useMudarStatusDaVistoria(checklist.id);

  async function responder(acao: 'aceitar' | 'rejeitar') {
    let motivo: string | undefined;
    if (acao === 'rejeitar') {
      const resposta = window.prompt('Conte o motivo da rejeição (opcional):');
      if (resposta === null) return;
      motivo = resposta.trim();
    }
    try {
      await mudarStatus.mutateAsync({ acao, motivo });
      definirFlash('sucesso', acao === 'aceitar' ? 'Vistoria aceita!' : 'Vistoria rejeitada.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao responder a vistoria.');
    }
  }

  return (
    <li className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div>
        <BadgeTipoDaVistoria tipo={checklist.tipo} />
        <span className="text-muted small"> · {formatarData(checklist.data_vistoria)}</span>
      </div>
      <div className="d-flex gap-2">
        <Link to={`/vistorias/${checklist.id}`} className="btn btn-outline-primary btn-sm">
          Ver detalhes
        </Link>
        <button type="button" className="btn btn-success btn-sm" onClick={() => responder('aceitar')} disabled={mudarStatus.isPending}>
          Aceitar
        </button>
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => responder('rejeitar')} disabled={mudarStatus.isPending}>
          Rejeitar
        </button>
      </div>
    </li>
  );
}

/** locatario/index.php — contrato, vistorias para aceitar, histórico e problemas. */
export function AreaDoLocatario() {
  const { usuario } = useAuth();
  const consulta = useAreaDoLocatario();
  const ativos = consulta.data?.ativos ?? [];

  return (
    <>
      <div className="mb-4">
        <h1 className="h3">Olá, {usuario?.nome}</h1>
        <p className="text-muted">Portal do locatário — vistorias, aceite e problemas.</p>
      </div>

      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        {ativos.length === 0 && <div className="alert alert-info">Nenhum contrato ativo vinculado ao seu usuário.</div>}

        {ativos.map(({ contrato, imovel, endereco, checklists, problemas }) => {
          const pendentes = checklists.filter((checklist) => checklist.status === 'pendente_aceite');
          const historico = [...checklists].sort((primeira, segunda) => String(segunda.created_at ?? '').localeCompare(String(primeira.created_at ?? '')));
          return (
            <section key={contrato.id} className="mb-4">
              <div className="card mb-3">
                <div className="card-body">
                  <h2 className="h6 fw-semibold mb-1">{imovel ? imovel.titulo || rotuloDoTipoDeImovel(imovel.tipo) : 'Seu contrato ativo'}</h2>
                  {endereco && <p className="small text-muted mb-2">{resumoDoEndereco(endereco)}</p>}
                  <p className="small mb-0">
                    Vigência: {formatarData(contrato.data_inicio)} → {formatarData(contrato.data_fim)}
                    {contrato.valor_mensal != null && <> · Aluguel: {formatarMoeda(contrato.valor_mensal)}/mês</>}
                  </p>
                </div>
              </div>

              {pendentes.length > 0 && (
                <div className="card mb-3 border-info">
                  <div className="card-header">
                    <i className="bi bi-clipboard-check me-1" />
                    Vistorias aguardando seu aceite
                  </div>
                  <ul className="list-group list-group-flush">
                    {pendentes.map((checklist) => (
                      <VistoriaAguardandoAceite key={checklist.id} checklist={checklist} />
                    ))}
                  </ul>
                </div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header">Minhas vistorias</div>
                    <ul className="list-group list-group-flush">
                      {historico.length === 0 ? (
                        <li className="list-group-item small text-muted">Nenhuma vistoria ainda.</li>
                      ) : (
                        historico.map((checklist) => (
                          <li key={checklist.id} className="list-group-item d-flex justify-content-between align-items-center small">
                            <Link to={`/vistorias/${checklist.id}`}>
                              <BadgeTipoDaVistoria tipo={checklist.tipo} /> <span className="ms-1">{formatarData(checklist.data_vistoria)}</span>
                            </Link>
                            <BadgeStatusDaVistoria status={checklist.status} />
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      Problemas
                      <Link to={`/problemas/novo?contrato_id=${contrato.id}`} className="btn btn-primary btn-sm">
                        Registrar
                      </Link>
                    </div>
                    <ul className="list-group list-group-flush">
                      {problemas.length === 0 ? (
                        <li className="list-group-item small text-muted">Nenhum problema registrado.</li>
                      ) : (
                        problemas.map((problema) => (
                          <li key={problema.id} className="list-group-item d-flex justify-content-between align-items-center small gap-2">
                            <Link to={`/problemas/${problema.id}`}>{problema.titulo || 'Problema'}</Link>
                            <div className="d-flex gap-1 text-nowrap">
                              <BadgeStatus grupo="prioridade" valor={problema.prioridade ?? 'normal'} rotulo={ROTULO_DA_PRIORIDADE[problema.prioridade ?? 'normal']} />
                              <BadgeStatus grupo="problema" valor={problema.status} rotulo={ROTULO_DO_STATUS_DO_PROBLEMA[problema.status ?? '']} />
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {(consulta.data?.encerrados.length ?? 0) > 0 && (
          <p className="small text-muted mb-0">
            Você tem {consulta.data?.encerrados.length} contrato(s) encerrado(s) ou cancelado(s).
          </p>
        )}
      </EstadoDaConsulta>
    </>
  );
}
