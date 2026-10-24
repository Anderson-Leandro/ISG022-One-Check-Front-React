import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  idCurto,
  ROTULO_DO_STATUS_DO_CONTRATO,
  useChecklistsDoContrato,
  useContrato,
  useMudarStatusDoContrato,
  useNomesParaContratos,
  useProblemasDoContrato,
} from '../../api/contratos';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar, podeCriar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { capitalizar, formatarData, formatarDataHora, formatarMoeda } from '../../utils/formatar';
import { AgendamentosDoContrato } from './AgendamentosDoContrato';

/** contratos/detalhes.php — acrescenta agendamentos, vistorias e problemas do contrato. */
export function DetalhesDoContrato() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const consulta = useContrato(id);
  const { data: checklists = [] } = useChecklistsDoContrato(id);
  const { data: problemas = [] } = useProblemasDoContrato(id);
  const { nomeDoImovel, nomeDoLocatario } = useNomesParaContratos();
  const mudarStatus = useMudarStatusDoContrato(id);
  const podeGerenciar = podeCriar(usuario, 'contratos');

  useEffect(() => {
    if (consulta.isError) definirFlash('erro', 'Contrato não encontrado.');
  }, [consulta.isError, definirFlash]);

  if (!id || consulta.isError) return <Navigate to="/contratos" replace />;

  const contrato = consulta.data;

  async function aoMudarStatus(acao: 'encerrar' | 'cancelar') {
    if (!window.confirm(`${acao === 'encerrar' ? 'Encerrar' : 'Cancelar'} este contrato?`)) return;
    try {
      await mudarStatus.mutateAsync(acao);
      definirFlash('sucesso', acao === 'encerrar' ? 'Contrato encerrado.' : 'Contrato cancelado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || `Erro ao ${acao}.`);
    }
  }

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      {contrato && (
        <>
          <CabecalhoDaPagina
            titulo={`Contrato ${idCurto(contrato.id)}`}
            subtitulo={`${formatarData(contrato.data_inicio)} — ${formatarData(contrato.data_fim)}`}
            acoes={
              <Link to="/contratos" className="btn btn-link btn-sm">
                Voltar
              </Link>
            }
          />

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header fw-semibold">Dados do contrato</div>
                <div className="card-body small">
                  <dl className="row mb-0">
                    <dt className="col-5">Status</dt>
                    <dd className="col-7">
                      <BadgeStatus grupo="contrato" valor={contrato.status} rotulo={ROTULO_DO_STATUS_DO_CONTRATO[contrato.status ?? '']} />
                    </dd>
                    <dt className="col-5">Imóvel</dt>
                    <dd className="col-7">
                      <Link to={`/imoveis/${contrato.imovel_id}`}>{nomeDoImovel(contrato.imovel_id)}</Link>
                    </dd>
                    <dt className="col-5">Locatário</dt>
                    <dd className="col-7">
                      {podeAcessar(usuario, 'usuarios') ? (
                        <Link to={`/usuarios/${contrato.locatario_id}/editar`}>{nomeDoLocatario(contrato.locatario_id)}</Link>
                      ) : (
                        nomeDoLocatario(contrato.locatario_id)
                      )}
                    </dd>
                    <dt className="col-5">Início</dt>
                    <dd className="col-7">{formatarData(contrato.data_inicio)}</dd>
                    <dt className="col-5">Fim</dt>
                    <dd className="col-7">{formatarData(contrato.data_fim)}</dd>
                    <dt className="col-5">Valor mensal</dt>
                    <dd className="col-7">{contrato.valor_mensal != null ? formatarMoeda(contrato.valor_mensal) : '—'}</dd>
                    <dt className="col-5">Criado em</dt>
                    <dd className="col-7">{formatarDataHora(contrato.created_at)}</dd>
                  </dl>
                </div>
              </div>

              {contrato.status === 'ativo' && podeGerenciar && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header fw-semibold">Ações</div>
                  <div className="card-body d-flex gap-2">
                    <button type="button" className="btn btn-warning btn-sm" onClick={() => aoMudarStatus('encerrar')} disabled={mudarStatus.isPending}>
                      Encerrar contrato
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => aoMudarStatus('cancelar')} disabled={mudarStatus.isPending}>
                      Cancelar contrato
                    </button>
                  </div>
                </div>
              )}

              <AgendamentosDoContrato contratoId={id} podeEditar={podeGerenciar && contrato.status === 'ativo'} />
            </div>

            <div className="col-lg-7">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Vistorias do contrato</span>
                  {podeCriar(usuario, 'vistorias') && (
                    <Link to={`/vistorias/nova?contrato_id=${id}`} className="btn btn-primary btn-sm">
                      Nova vistoria
                    </Link>
                  )}
                </div>
                <ul className="list-group list-group-flush">
                  {checklists.length === 0 ? (
                    <li className="list-group-item text-muted small">Nenhuma vistoria.</li>
                  ) : (
                    checklists.map((checklist) => (
                      <li key={checklist.id} className="list-group-item d-flex justify-content-between align-items-center small">
                        <Link to={`/vistorias/${checklist.id}`}>
                          {capitalizar(checklist.tipo ?? 'vistoria')} · {formatarData(checklist.data_vistoria ?? checklist.created_at)}
                        </Link>
                        <span className="badge text-bg-secondary">{capitalizar(checklist.status ?? '—')}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Problemas do contrato</span>
                  {podeCriar(usuario, 'problemas') && (
                    <Link to={`/problemas/novo?contrato_id=${id}`} className="btn btn-outline-danger btn-sm">
                      Registrar problema
                    </Link>
                  )}
                </div>
                <ul className="list-group list-group-flush">
                  {problemas.length === 0 ? (
                    <li className="list-group-item text-muted small">Nenhum problema registrado.</li>
                  ) : (
                    problemas.map((problema) => (
                      <li key={problema.id} className="list-group-item d-flex justify-content-between align-items-center small">
                        <Link to={`/problemas/${problema.id}`}>{problema.titulo || problema.descricao || idCurto(problema.id)}</Link>
                        <BadgeStatus grupo="problema" valor={problema.status} />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </EstadoDaConsulta>
  );
}
