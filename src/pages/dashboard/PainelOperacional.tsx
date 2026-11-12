import { Link } from 'react-router-dom';
import { ROTULO_DO_TIPO_DE_AGENDAMENTO } from '../../api/contratos';
import { useDadosDoPainel, useResumoDoPainel } from '../../api/painel';
import { problemaEstaEncerrado, ROTULO_DA_PRIORIDADE, ROTULO_DO_STATUS_DO_PROBLEMA } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { AvisoDeDadosNegados } from '../../components/AvisoDeDadosNegados';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { CartaoDeIndicador } from '../../components/graficos/Graficos';
import { formatarData, formatarDataHora } from '../../utils/formatar';
import { AbasDoPainel } from './AbasDoPainel';
import { BadgeTipoDaVistoria } from '../vistorias/BadgesDaVistoria';

const ORDEM_DA_PRIORIDADE: Record<string, number> = { urgente: 0, alta: 1, normal: 2 };
const DIAS_DO_HORIZONTE = 30;

/** dashboard/operacional.php (vazio no PHP): o que precisa de ação agora. */
export function PainelOperacional() {
  const resumo = useResumoDoPainel();
  const { usuario } = useAuth();
  const veProblemas = podeAcessar(usuario, 'problemas');
  const consulta = useDadosDoPainel();
  const { imoveis = [], checklists = [], problemas = [], agendamentos = [] } = consulta.data ?? {};
  const nomeDoImovel = (imovelId: string) => imoveis.find((imovel) => imovel.id === imovelId)?.titulo ?? 'Imóvel';

  const agora = new Date();
  const limite = new Date(agora.getTime() + DIAS_DO_HORIZONTE * 86_400_000);
  const proximosAgendamentos = agendamentos
    .filter((agendamento) => {
      const data = new Date(agendamento.data_agendada);
      return agendamento.contrato.status === 'ativo' && data >= new Date(agora.toDateString()) && data <= limite;
    })
    .sort((primeiro, segundo) => primeiro.data_agendada.localeCompare(segundo.data_agendada));
  const aguardandoAceite = checklists.filter((checklist) => checklist.status === 'pendente_aceite');
  const emPreenchimento = checklists.filter((checklist) => checklist.status === 'em_preenchimento');
  const problemasEmAberto = problemas
    .filter((problema) => !problemaEstaEncerrado(problema.status))
    .sort((primeiro, segundo) => (ORDEM_DA_PRIORIDADE[primeiro.prioridade ?? 'normal'] ?? 3) - (ORDEM_DA_PRIORIDADE[segundo.prioridade ?? 'normal'] ?? 3));

  return (
    <>
      <CabecalhoDaPagina titulo="Dashboard" subtitulo="Operacional · o que precisa de ação" />
      <AbasDoPainel />
      <AvisoDeDadosNegados negados={consulta.data?.negados} />

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <CartaoDeIndicador rotulo={`Agendamentos (${DIAS_DO_HORIZONTE} dias)`} valor={proximosAgendamentos.length} complemento={typeof resumo.data?.vistorias_agendadas === 'number' ? `${resumo.data.vistorias_agendadas} agendadas no total` : undefined} icone="bi-calendar-event" corDoIcone="blue" />
        </div>
        <div className="col-6 col-xl-3">
          <CartaoDeIndicador rotulo="Em preenchimento" valor={emPreenchimento.length} complemento="vistorias abertas" icone="bi-pencil-square" corDoIcone="amber" />
        </div>
        <div className="col-6 col-xl-3">
          <CartaoDeIndicador rotulo="Aguardando aceite" valor={aguardandoAceite.length} complemento="do locatário" icone="bi-hourglass-split" corDoIcone="purple" />
        </div>
        {veProblemas && (
        <div className="col-6 col-xl-3">
          <CartaoDeIndicador rotulo="Problemas não resolvidos" valor={problemasEmAberto.length} complemento={`${problemasEmAberto.filter((problema) => problema.prioridade === 'urgente').length} urgentes`} icone="bi-exclamation-triangle" corDoIcone="red" negativo />
        </div>
        )}
      </div>

      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card mb-4">
              <div className="card-header">Próximos agendamentos</div>
              <ul className="list-group list-group-flush">
                {proximosAgendamentos.length === 0 ? (
                  <li className="list-group-item small text-muted">Nada agendado para os próximos {DIAS_DO_HORIZONTE} dias.</li>
                ) : (
                  proximosAgendamentos.map((agendamento) => (
                    <li key={agendamento.id} className="list-group-item d-flex justify-content-between align-items-center small">
                      <div>
                        <strong>{formatarDataHora(agendamento.data_agendada)}</strong> · {ROTULO_DO_TIPO_DE_AGENDAMENTO[agendamento.tipo] ?? agendamento.tipo}
                        <div className="text-muted">{nomeDoImovel(agendamento.contrato.imovel_id)}</div>
                      </div>
                      <Link to={`/contratos/${agendamento.contrato.id}`} className="btn btn-outline-secondary btn-sm py-0">
                        Contrato
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="card">
              <div className="card-header">Vistorias aguardando ação</div>
              <ul className="list-group list-group-flush">
                {[...aguardandoAceite, ...emPreenchimento].length === 0 ? (
                  <li className="list-group-item small text-muted">Nenhuma vistoria pendente.</li>
                ) : (
                  [...aguardandoAceite, ...emPreenchimento].map((checklist) => (
                    <li key={checklist.id} className="list-group-item d-flex justify-content-between align-items-center small">
                      <div>
                        <BadgeTipoDaVistoria tipo={checklist.tipo} /> <span className="ms-1">{nomeDoImovel(checklist.contrato.imovel_id)}</span>
                        <div className="text-muted">
                          {checklist.status === 'pendente_aceite' ? 'Aguardando aceite' : 'Em preenchimento'} · {formatarData(checklist.data_vistoria)}
                        </div>
                      </div>
                      <Link to={`/vistorias/${checklist.id}`} className="btn btn-outline-secondary btn-sm py-0">
                        Abrir
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {veProblemas && (
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">Problemas não resolvidos (por prioridade)</div>
              <ul className="list-group list-group-flush">
                {problemasEmAberto.length === 0 ? (
                  <li className="list-group-item small text-muted">
                    <i className="bi bi-check-circle me-2" style={{ color: '#22c55e' }} />
                    Nenhum problema em aberto.
                  </li>
                ) : (
                  problemasEmAberto.map((problema) => (
                    <li key={problema.id} className="list-group-item d-flex justify-content-between align-items-center small gap-2">
                      <div>
                        <Link to={`/problemas/${problema.id}`}>{problema.titulo || 'Problema'}</Link>
                        <div className="text-muted">
                          {nomeDoImovel(problema.contrato.imovel_id)} · {formatarData(problema.created_at)}
                        </div>
                      </div>
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
          )}
        </div>
      </EstadoDaConsulta>
    </>
  );
}
